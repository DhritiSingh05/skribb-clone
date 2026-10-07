import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  DrawTool,
  StrokeAction,
  DrawStrokeData,
  FillStrokeData,
  DrawPoint,
} from '../../types';
import {
  Paintbrush,
  Eraser,
  PaintBucket,
  RotateCcw,
  Trash2,
  Palette,
} from 'lucide-react';

interface CanvasProps {
  isDrawer: boolean;
  canDraw: boolean;
  onStrokeAction: (action: StrokeAction) => void;
  onUndo: () => void;
  onClear: () => void;
  incomingAction: StrokeAction | null;
  clearTrigger: number;
  undoTrigger: number;
  initialActions?: StrokeAction[];
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

export const PALETTE_COLORS = [
  '#000000', '#ffffff', '#7f7f7f', '#c3c3c3',
  '#880015', '#b97a57', '#ed1c24', '#ffaec9',
  '#ff7f27', '#ffc90e', '#fff200', '#efe4b0',
  '#22b14c', '#b5e61d', '#00a2e8', '#99d9ea',
  '#3f48cc', '#7092be', '#a349a4', '#c8bfe7',
  '#6b3074', '#593e2b'
];

const BRUSH_SIZES = [4, 8, 16, 28];

export const Canvas: React.FC<CanvasProps> = ({
  isDrawer,
  canDraw,
  onStrokeAction,
  onUndo,
  onClear,
  incomingAction,
  clearTrigger,
  undoTrigger,
  initialActions = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<DrawTool>('brush');
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(8);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const currentStrokeRef = useRef<DrawStrokeData | null>(null);

  // Stroke action history to support undo redrawing on client
  const actionsHistoryRef = useRef<StrokeAction[]>([]);

  // Initialize canvas background
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  // Re-render complete history on undo
  const redrawAllActions = useCallback((actions: StrokeAction[]) => {
    initCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    for (const action of actions) {
      if (action.type === 'stroke') {
        renderStroke(ctx, action);
      } else if (action.type === 'fill') {
        renderFill(ctx, action.x, action.y, action.color);
      } else if (action.type === 'clear') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
  }, [initCanvas]);

  // Render a stroke on canvas
  const renderStroke = (ctx: CanvasRenderingContext2D, stroke: DrawStrokeData) => {
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.size;

    const pts = stroke.points.map(p => ({
      x: p.x * CANVAS_WIDTH,
      y: p.y * CANVAS_HEIGHT,
    }));

    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);

      for (let i = 1; i < pts.length; i++) {
        const xc = (pts[i - 1].x + pts[i].x) / 2;
        const yc = (pts[i - 1].y + pts[i].y) / 2;
        ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Hex to RGBA helper for flood fill
  const hexToRgba = (hex: string): [number, number, number, number] => {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
  };

  // Flood fill algorithm
  const renderFill = (
    ctx: CanvasRenderingContext2D,
    normalizedX: number,
    normalizedY: number,
    fillColorHex: string
  ) => {
    const startX = Math.round(normalizedX * CANVAS_WIDTH);
    const startY = Math.round(normalizedY * CANVAS_HEIGHT);

    if (startX < 0 || startX >= CANVAS_WIDTH || startY < 0 || startY >= CANVAS_HEIGHT) return;

    const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imgData.data;

    const targetColor = hexToRgba(fillColorHex);
    const startIndex = (startY * CANVAS_WIDTH + startX) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];

    // If already the target color, skip
    if (
      Math.abs(startR - targetColor[0]) < 10 &&
      Math.abs(startG - targetColor[1]) < 10 &&
      Math.abs(startB - targetColor[2]) < 10
    ) {
      return;
    }

    const colorMatch = (idx: number) => {
      const rDiff = Math.abs(data[idx] - startR);
      const gDiff = Math.abs(data[idx + 1] - startG);
      const bDiff = Math.abs(data[idx + 2] - startB);
      const aDiff = Math.abs(data[idx + 3] - startA);
      return rDiff < 32 && gDiff < 32 && bDiff < 32 && aDiff < 32;
    };

    const pixelStack: [number, number][] = [[startX, startY]];
    const seen = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT);

    while (pixelStack.length > 0) {
      const [x, y] = pixelStack.pop()!;
      let currentY = y;
      let currentIndex = (currentY * CANVAS_WIDTH + x) * 4;

      while (currentY >= 0 && colorMatch(currentIndex)) {
        currentY--;
        currentIndex -= CANVAS_WIDTH * 4;
      }

      currentY++;
      currentIndex += CANVAS_WIDTH * 4;

      let reachLeft = false;
      let reachRight = false;

      while (currentY < CANVAS_HEIGHT && colorMatch(currentIndex)) {
        const pixIdx = currentY * CANVAS_WIDTH + x;
        if (seen[pixIdx]) break;
        seen[pixIdx] = 1;

        data[currentIndex] = targetColor[0];
        data[currentIndex + 1] = targetColor[1];
        data[currentIndex + 2] = targetColor[2];
        data[currentIndex + 3] = 255;

        if (x > 0) {
          const leftIdx = currentIndex - 4;
          if (colorMatch(leftIdx)) {
            if (!reachLeft) {
              pixelStack.push([x - 1, currentY]);
              reachLeft = true;
            }
          } else if (reachLeft) {
            reachLeft = false;
          }
        }

        if (x < CANVAS_WIDTH - 1) {
          const rightIdx = currentIndex + 4;
          if (colorMatch(rightIdx)) {
            if (!reachRight) {
              pixelStack.push([x + 1, currentY]);
              reachRight = true;
            }
          } else if (reachRight) {
            reachRight = false;
          }
        }

        currentY++;
        currentIndex += CANVAS_WIDTH * 4;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Mount effect
  useEffect(() => {
    initCanvas();
    if (initialActions && initialActions.length > 0) {
      actionsHistoryRef.current = [...initialActions];
      redrawAllActions(initialActions);
    }
  }, [initCanvas, initialActions, redrawAllActions]);

  // Handle incoming remote stroke actions
  useEffect(() => {
    if (!incomingAction) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    actionsHistoryRef.current.push(incomingAction);

    if (incomingAction.type === 'stroke') {
      renderStroke(ctx, incomingAction);
    } else if (incomingAction.type === 'fill') {
      renderFill(ctx, incomingAction.x, incomingAction.y, incomingAction.color);
    } else if (incomingAction.type === 'clear') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }, [incomingAction]);

  // Handle clear trigger
  useEffect(() => {
    if (clearTrigger > 0) {
      actionsHistoryRef.current = [];
      initCanvas();
    }
  }, [clearTrigger, initCanvas]);

  // Handle undo trigger
  useEffect(() => {
    if (undoTrigger > 0) {
      actionsHistoryRef.current.pop();
      redrawAllActions(actionsHistoryRef.current);
    }
  }, [undoTrigger, redrawAllActions]);

  // Helper to get normalized coordinates from mouse/touch event
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): DrawPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Drawing event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !canDraw) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pt = getCoordinates(e);

    if (activeTool === 'fill') {
      const fillAction: FillStrokeData = {
        type: 'fill',
        id: Math.random().toString(36).substring(2, 9),
        x: pt.x,
        y: pt.y,
        color: selectedColor,
      };

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        renderFill(ctx, pt.x, pt.y, selectedColor);
        actionsHistoryRef.current.push(fillAction);
        onStrokeAction(fillAction);
      }
      return;
    }

    setIsDrawing(true);
    const newStroke: DrawStrokeData = {
      type: 'stroke',
      id: Math.random().toString(36).substring(2, 9),
      tool: activeTool,
      color: activeTool === 'eraser' ? '#ffffff' : selectedColor,
      size: brushSize,
      points: [pt],
    };

    currentStrokeRef.current = newStroke;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      renderStroke(ctx, newStroke);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer || !canDraw || !currentStrokeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pt = getCoordinates(e);
    const stroke = currentStrokeRef.current;
    stroke.points.push(pt);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx && stroke.points.length >= 2) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.lineWidth = stroke.size;

      const p1 = stroke.points[stroke.points.length - 2];
      const p2 = stroke.points[stroke.points.length - 1];

      ctx.beginPath();
      ctx.moveTo(p1.x * CANVAS_WIDTH, p1.y * CANVAS_HEIGHT);
      ctx.lineTo(p2.x * CANVAS_WIDTH, p2.y * CANVAS_HEIGHT);
      ctx.stroke();
      ctx.restore();
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentStrokeRef.current) return;
    setIsDrawing(false);

    const finishedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    actionsHistoryRef.current.push(finishedStroke);
    onStrokeAction(finishedStroke);
  };

  return (
    <div className="flex flex-col w-full h-full bg-white rounded-2xl shadow-lg border-4 border-slate-700 overflow-hidden select-none">
      {/* Canvas Drawing Surface */}
      <div className="relative flex-1 bg-white cursor-crosshair flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full max-h-[500px] object-contain rounded-xl bg-white shadow-inner touch-none"
          style={{
            cursor: !isDrawer || !canDraw
              ? 'default'
              : activeTool === 'fill'
              ? 'crosshair'
              : activeTool === 'eraser'
              ? 'cell'
              : 'crosshair',
          }}
        />

        {!canDraw && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Overlay if not drawing */}
          </div>
        )}
      </div>

      {/* Drawing Toolbar (Drawer controls) */}
      {isDrawer && canDraw && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 border-t-2 border-slate-300">
          {/* Tools: Brush, Eraser, Fill */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTool('brush')}
              title="Brush / Pen"
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-semibold ${
                activeTool === 'brush'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Paintbrush size={18} />
              <span className="hidden sm:inline">Pen</span>
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              title="Eraser"
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-semibold ${
                activeTool === 'eraser'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Eraser size={18} />
              <span className="hidden sm:inline">Eraser</span>
            </button>
            <button
              onClick={() => setActiveTool('fill')}
              title="Fill Bucket"
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-semibold ${
                activeTool === 'fill'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <PaintBucket size={18} />
              <span className="hidden sm:inline">Fill</span>
            </button>
          </div>

          {/* Brush Sizes */}
          <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                title={`Size ${size}px`}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  brushSize === size ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-slate-100'
                }`}
              >
                <div
                  className="rounded-full bg-slate-800"
                  style={{ width: Math.max(4, size * 0.75), height: Math.max(4, size * 0.75) }}
                />
              </button>
            ))}
          </div>

          {/* Color Palette Grid */}
          <div className="flex items-center gap-1 flex-wrap max-w-[280px]">
            {PALETTE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  setSelectedColor(color);
                  if (activeTool === 'eraser') setActiveTool('brush');
                }}
                className={`w-6 h-6 rounded-md border transition-transform ${
                  selectedColor === color && activeTool !== 'eraser'
                    ? 'scale-125 ring-2 ring-offset-1 ring-blue-500 z-10 border-slate-600'
                    : 'border-slate-300 hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}

            {/* Custom Color Picker */}
            <label className="relative cursor-pointer flex items-center justify-center w-6 h-6 rounded-md border border-slate-300 bg-white hover:scale-110">
              <Palette size={14} className="text-slate-600" />
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => {
                  setSelectedColor(e.target.value);
                  if (activeTool === 'eraser') setActiveTool('brush');
                }}
                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                title="Custom color"
              />
            </label>
          </div>

          {/* Undo and Clear */}
          <div className="flex items-center gap-2">
            <button
              onClick={onUndo}
              title="Undo last stroke"
              className="p-2 bg-white hover:bg-slate-200 text-slate-700 rounded-xl shadow-sm border border-slate-300 flex items-center gap-1 font-semibold text-xs active:scale-95 transition-all"
            >
              <RotateCcw size={16} />
              <span>Undo</span>
            </button>
            <button
              onClick={onClear}
              title="Clear entire canvas"
              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl shadow-sm border border-red-200 flex items-center gap-1 font-semibold text-xs active:scale-95 transition-all"
            >
              <Trash2 size={16} />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
