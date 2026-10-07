# Multi-stage Dockerfile for skribbl.io clone
FROM node:20-alpine AS builder

WORKDIR /app

# Build Client
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client ./client
RUN cd client && npm run build

# Build Server
COPY server/package*.json ./server/
RUN cd server && npm install

COPY server ./server
RUN cd server && npm run build

# Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY server/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/client/dist /app/client/dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
