# 🎨 skribbl.io Clone - Full-Stack Real-Time Multiplayer Drawing & Guessing Game

An end-to-end, feature-rich clone of **[skribbl.io](https://skribbl.io)** built with **React, TypeScript, Vite, Node.js, Express, and Socket.IO**. Designed with clean Object-Oriented Architecture (OOP) on the backend and a high-performance HTML5 Canvas engine on the frontend.

# Live: https://skribb-clone-production.up.railway.app/

---

## 🌟 Key Features

### 🎮 Multiplayer & Room Management
- **Public & Private Rooms**: Create private rooms with custom room codes (e.g. `ABC123`) or join random open public rooms via the live room browser.
- **Configurable Settings**: Host can customize max players (2–20), total rounds (2–10), draw time (15–240s), word choices (1–5), hints count (0–5), word mode (*Normal*, *Hidden*, *Combination*), and custom word lists.
- **One-Click Invite Link**: Instant room code and invite link copying to clipboard with URL query param support (`?room=CODE`).
- **Interactive Avatar Creator**: 100+ avatar combinations featuring customizable colors, 10 eye expressions, 10 mouth styles, and randomizer.
- **Host Moderation**: Host kick and community votekick mechanisms.

### 🖌️ Canvas & Drawing Engine
- **Normalized Coordinate System (0.0 to 1.0)**: Strokes and flood fills scale pixel-perfect across desktop, tablet, and mobile screens.
- **Tools**:
  - Smooth Pen / Brush with quadratic curve midpoint interpolation.
  - Eraser.
  - Flood Fill / Bucket Tool powered by scanline image data processing.
  - 4 Brush sizes (4px, 8px, 16px, 28px).
  - 22 classic skribbl.io palette colors + custom color picker.
  - Undo stroke & Clear canvas (drawer only).
- **Stroke Synchronization & History Replay**: Real-time broadcast of drawing actions; new or reconnected players instantly receive full stroke history.

### 🧠 Game Flow & Word Logic
- **Categorized Word Bank**: 1,000+ words across Animals, Food, Objects, Actions, Nature, Professions, and Places + custom words support.
- **Word Selection**: Drawer picks 1 of N word choices with a 15-second auto-pick timer.
- **Dynamic Hints**: Underscore blanks (`_ _ _ _`) that progressively reveal letters over time based on host settings.
- **Levenshtein Distance Detection ("Close Guess")**: When a player is within 1 edit distance (e.g. "elefant" vs "elephant"), private alert *"You are very close!"* is triggered.
- **Fair Scoring Formula**:
  - Guessers earn points proportional to remaining time: `Score = Math.round(100 + (timeLeft / totalDrawTime) * 400)`.
  - Drawer earns points based on the fraction of guessers who succeeded: `DrawerScore = Math.round((guessedCount / totalGuessers) * 350)`.
- **Secret Guessed Chat**: Once a player guesses correctly, their chat messages become private to the drawer and other successful guessers to prevent spoiling.
- **Game Over Podium & Celebrations**: 1st, 2nd, and 3rd place podium animation, confetti cannons, and Play Again lobby reset.
- **Synthesized Web Audio FX**: Pure browser Web Audio API sounds for correct guesses, ticking countdowns, round starts, close alerts, and game-over fanfares (zero external audio file dependencies).

---

## 🏗️ Architecture Overview

```
                      ┌─────────────────────────────────────┐
                      │            Browser Client           │
                      │  (React + TypeScript + HTML5 Canvas) │
                      └──────────────────┬──────────────────┘
                                         │
                   WebSocket (Socket.IO) │ HTTP REST API
                                         ▼
                      ┌─────────────────────────────────────┐
                      │          Express HTTP Server        │
                      │     (/api/rooms, /api/health)       │
                      └──────────────────┬──────────────────┘
                                         │
                      ┌──────────────────┴──────────────────┐
                      │       RoomManager (Singleton)       │
                      │  - Room lookup by Code / Socket ID  │
                      │  - Public rooms registry            │
                      └──────────────────┬──────────────────┘
                                         │ 1 : N
                      ┌──────────────────▼──────────────────┐
                      │             Room (OOP)              │
                      │  - hostId, player roster            │
                      │  - chat log, votekick management    │
                      └─────────┬───────────────────┬───────┘
                                │                   │
              ┌─────────────────▼────────┐ ┌────────▼────────────────┐
              │        Game (OOP)        │ │    DrawingBoard (OOP)    │
              │ - State Machine (Phases) │ │ - Stroke history buffer  │
              │ - Turn queue & rotation  │ │ - Undo stack             │
              │ - Timer & Hint scheduler │ │ - Flood fill actions     │
              │ - Scoring formulas       │ └──────────────────────────┘
              └──────────────────────────┘
```

### OOP Server Design
The backend is structured around four decoupled Object-Oriented classes:
1. **`Room`**: Encapsulates room state, participant maps, chat log, kick votes, and Socket.IO room broadcasting.
2. **`Game`**: Implements the game state machine (`LOBBY` -> `CHOOSING_WORD` -> `DRAWING` -> `ROUND_END` -> `GAME_OVER`), manages the player turn queue, drives interval timers, and calculates scoring.
3. **`Player`**: Encapsulates socket identity, player avatar, round scores, cumulative score, drawer status, and guess flags.
4. **`DrawingBoard`**: Manages stroke history actions, undo stack, canvas clearance, and full replay payload for newly joined clients.
5. **`WordManager`**: Handles categorized word selection, custom word integration, hint string masking, and Levenshtein distance matching.

---

## 🔄 Real-Time WebSocket Events

| Event Name | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `create_room` | Client ➔ Server | `{ hostName, avatar, settings, isPrivate }` | Creates new game room with custom settings |
| `join_room` | Client ➔ Server | `{ roomId, playerName, avatar }` | Joins existing room via room code |
| `room_created` | Server ➔ Client | `{ roomId, player, settings }` | Confirms room creation |
| `room_joined` | Server ➔ Client | `{ roomId, player, gameState, existingDrawActions, chatHistory }` | Confirms join & synchronizes existing canvas/chat |
| `players_list` | Server ➔ Clients | `{ players: PlayerData[] }` | Broadcasts updated roster and scores |
| `start_game` | Client ➔ Server | `{}` | Host begins the game |
| `word_options` | Server ➔ Drawer | `{ options: WordOption[] }` | Sends 3 word choices to the drawer |
| `word_chosen` | Drawer ➔ Server | `{ word, category }` | Drawer selects word; starts draw timer |
| `game_state` | Server ➔ Clients | `GameStatePayload` | Broadcasts current phase, round, drawer, hint |
| `timer_tick` | Server ➔ Clients | `{ timeLeft }` | Real-time 1-second countdown tick |
| `hint_update` | Server ➔ Clients | `{ hint, revealedCount }` | Reveals periodic hint letters |
| `draw_data` | Client ⇄ Server | `StrokeAction` | Real-time stroke/fill command sync |
| `draw_undo` | Client ⇄ Server | `{ undoneActionId }` | Drawer undoes last action |
| `canvas_clear` | Client ⇄ Server | `{}` | Drawer clears canvas |
| `chat` | Client ➔ Server | `{ text }` | Submits guess or chat message |
| `chat_message` | Server ➔ Clients | `ChatMessage` | Broadcasts regular, system, or secret chat |
| `guess_result` | Server ➔ Guesser | `{ correct, points, word }` | Confirms correct guess and awarded points |
| `round_end` | Server ➔ Clients | `{ word, scores, nextDrawerName }` | Round intermission and score review |
| `game_over` | Server ➔ Clients | `{ winner, leaderboard }` | Final game podium and champion results |
| `play_again` | Host ➔ Server | `{}` | Resets game back to lobby |

---

## 🚀 Setup & Local Execution

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### Installation
Clone or navigate to the project directory:
```bash
cd skribbl-clone
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### Running in Development Mode
Runs both the backend server (port 4000) and the Vite frontend (port 5173 with auto-proxy) concurrently:
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser. Open multiple tabs or incognito windows to play in multiplayer mode!

### Running in Production Mode (Single Port)
Build both client and server:
```bash
npm run build
npm start
```
The Express server serves the compiled React app directly on **`http://localhost:4000`**.

---

## 🧪 Automated End-to-End Tests
A complete automated test suite is included to verify the WebSocket handshake, room creation, turn rotation, drawing stroke transmission, and scoring:
```bash
cd server
node tests/e2e_game.test.mjs
```

---

## ☁️ Deployment Guide

### Option 1: Render (Recommended Full-Stack)
1. Fork or push this repository to GitHub.
2. Create a **New Web Service** on [Render](https://render.com).
3. Connect your repository.
4. Set the following settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && cd server && npm install && cd ../client && npm install && npm run build && cd ../server && npm run build`
   - **Start Command**: `cd server && npm start`
5. Render automatically handles persistent WebSockets and exposes a live HTTPS/WSS URL (e.g. `https://skribbl-clone.onrender.com`).

### Option 2: Railway
1. Create a **New Project** on [Railway](https://railway.app).
2. Deploy from GitHub Repo or use the provided `Dockerfile`.
3. Railway provides built-in WebSocket support with zero extra configuration.

### Option 3: Docker
Build and run the containerized application anywhere:
```bash
docker build -t skribbl-clone .
docker run -p 4000:4000 skribbl-clone
```

### Platform Constraints Note
- **Vercel / Netlify**: Serverless platforms do not maintain long-lived stateful TCP/WebSocket connections for real-time multiplayer drawing. When deploying the frontend on Vercel or Netlify, pair it with a dedicated WebSocket backend on Render, Railway, or Fly.io by setting `VITE_SERVER_URL`.
- **Render / Railway / Docker**: Fully supports bidirectional WebSockets out-of-the-box.

---

## 💡 Code Walkthrough & Design Decisions

1. **How drawing strokes are captured, sent, and rendered**:
   - The client uses an HTML5 Canvas with internal dimensions of `800 x 500`. Coordinates are normalized to `(x / width, y / height)` between `0.0` and `1.0`.
   - Points are batched and smoothed using `ctx.quadraticCurveTo()` midpoint interpolation, ensuring buttery-smooth curves without jagged lines.
   - Flood fill operates via a fast scanline flood fill algorithm on canvas `ImageData` and transmits a single `{ type: 'fill', x, y, color }` packet.
   - The server appends every stroke to `DrawingBoard.actions`. Newly connected clients receive the entire array in `room_joined` and replay it synchronously.

2. **How game state and turn order are managed**:
   - The `Game` class maintains a round queue (`drawerQueue`). Each player in the room gets one turn to draw per round.
   - If a drawer leaves mid-turn, `handlePlayerLeave` cleanly ends the turn and transitions to the next player.
   - When all players have drawn in the current round, `currentRound` increments. When `currentRound > totalRounds`, the game concludes with `GAME_OVER`.

3. **Word-matching and Levenshtein distance**:
   - All guesses are trimmed and converted to lowercase.
   - Exact matches earn points and flag `hasGuessed = true`.
   - Non-exact matches are checked with the Levenshtein distance algorithm. If edit distance is $\le 1$ (or $\le 2$ for longer words), the player receives a private yellow notification *"You are very close!"*.
