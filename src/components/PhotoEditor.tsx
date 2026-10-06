import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sliders,
  Crop,
  Sparkles,
  PenTool,
  Type,
  MoreHorizontal,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Redo2,
  Check,
  EyeOff,
  Shield,
  RotateCcw,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Eraser,
  Pen,
  Highlighter,
  Pencil,
  X,
} from 'lucide-react';
import { CloudFile } from '../types/cloud';
import {
  spring,
  springSnappy,
  springBouncy,
  jellyScaleKeyframes,
  jellyScaleTransition,
  easeJelly,
} from '../motion';

export interface PhotoEditorProps {
  file: CloudFile;
  onClose: () => void;
  onSave: (editedDataUrl: string, editSummary: any) => Promise<void>;
  onRevert: () => Promise<void>;
}

type MainTool = 'adjust' | 'crop' | 'filters' | 'markup' | 'text' | 'more';
type AdjustCategory = 'light' | 'color' | 'detail';
type MarkupTool = 'pen' | 'pencil' | 'marker' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'circle';
type AspectRatioPreset = 'original' | 'free' | '1:1' | '4:3' | '16:9' | '9:16';

interface TextOverlay {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number;
  color: string;
  isBold: boolean;
  hasBackground: boolean;
  opacity: number;
}

interface PrivacyArea {
  id: string;
  type: 'blur' | 'pixelate';
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
}

interface MarkupStroke {
  tool: MarkupTool;
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

export const PhotoEditor: React.FC<PhotoEditorProps> = ({
  file,
  onClose,
  onSave,
  onRevert,
}) => {
  const [activeTool, setActiveTool] = useState<MainTool>('adjust');
  const [adjustCategory, setAdjustCategory] = useState<AdjustCategory>('light');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 1. ADJUST STATE
  const [adjustments, setAdjustments] = useState({
    // Light
    exposure: 0, // -100 to 100
    brilliance: 0,
    highlights: 0,
    shadows: 0,
    contrast: 0,
    brightness: 0,
    blackPoint: 0,
    // Color
    saturation: 0,
    vibrance: 0,
    temperature: 0,
    tint: 0,
    // Detail
    sharpness: 0, // 0 to 100
    definition: 0,
    noiseReduction: 0,
    vignette: 0,
  });

  // 2. CROP & ORIENTATION STATE
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [straighten, setStraighten] = useState<number>(0); // -45 to 45
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>('original');
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 100, height: 100 }); // percentage

  // 3. FILTER STATE
  const [activeFilter, setActiveFilter] = useState<string>('original');

  // 4. MARKUP STATE
  const [markupTool, setMarkupTool] = useState<MarkupTool>('pen');
  const [markupColor, setMarkupColor] = useState<string>('#FFFFFF');
  const [markupSize, setMarkupSize] = useState<number>(4);
  const [strokes, setStrokes] = useState<MarkupStroke[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<MarkupStroke[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<MarkupStroke | null>(null);

  // 5. TEXT OVERLAYS STATE
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // 6. PRIVACY AREAS (Blur & Pixelate)
  const [privacyAreas, setPrivacyAreas] = useState<PrivacyArea[]>([]);
  const [privacySelectionMode, setPrivacySelectionMode] = useState<'blur' | 'pixelate' | null>(null);
  const [removeLocationData, setRemoveLocationData] = useState<boolean>(false);
  const [removeCameraMetadata, setRemoveCameraMetadata] = useState<boolean>(false);

  // Canvas Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markupCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Filter definitions
  const filters = [
    { id: 'original', name: 'Original', css: 'none' },
    { id: 'mono', name: 'Mono', css: 'grayscale(100%) contrast(110%)' },
    { id: 'silvertone', name: 'Silvertone', css: 'grayscale(100%) contrast(140%) brightness(105%)' },
    { id: 'warm', name: 'Warm', css: 'sepia(30%) saturate(125%) hue-rotate(-10deg)' },
    { id: 'cool', name: 'Cool', css: 'hue-rotate(20deg) saturate(95%) brightness(105%)' },
    { id: 'vivid', name: 'Vivid', css: 'saturate(150%) contrast(115%)' },
    { id: 'muted', name: 'Muted', css: 'saturate(70%) contrast(90%) brightness(105%)' },
    { id: 'dramatic', name: 'Dramatic', css: 'contrast(135%) brightness(90%) saturate(110%)' },
  ];

  // Colors for markup
  const markupColors = ['#FFFFFF', '#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

  // Compute CSS filter string for live preview
  const getFilterStyle = useCallback(() => {
    const fObj = filters.find((f) => f.id === activeFilter);
    const preset = fObj && fObj.id !== 'original' ? fObj.css : '';

    const brightnessVal = 1 + (adjustments.brightness + adjustments.exposure) / 100;
    const contrastVal = 1 + adjustments.contrast / 100;
    const saturationVal = 1 + (adjustments.saturation + adjustments.vibrance) / 100;
    const sepiaVal = adjustments.temperature > 0 ? adjustments.temperature / 200 : 0;
    const hueVal = adjustments.tint * 0.5 + (adjustments.temperature < 0 ? adjustments.temperature * 0.3 : 0);

    const parts = [
      preset,
      `brightness(${Math.max(0.2, brightnessVal)})`,
      `contrast(${Math.max(0.2, contrastVal)})`,
      `saturate(${Math.max(0, saturationVal)})`,
      sepiaVal > 0 ? `sepia(${sepiaVal})` : '',
      Math.abs(hueVal) > 0.1 ? `hue-rotate(${hueVal}deg)` : '',
    ].filter(Boolean);

    return parts.join(' ');
  }, [activeFilter, adjustments]);

  // Handle markup drawing
  const redrawMarkup = useCallback(() => {
    const canvas = markupCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'marker') {
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = stroke.size * 2.5;
      } else if (stroke.tool === 'pencil') {
        ctx.globalAlpha = 0.85;
      } else if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      }

      if (stroke.tool === 'rectangle') {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (stroke.tool === 'circle') {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        const cx = Math.min(start.x, end.x) + rx;
        const cy = Math.min(start.y, end.y) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (stroke.tool === 'line' || stroke.tool === 'arrow') {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        if (stroke.tool === 'arrow') {
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const headLen = stroke.size * 3;
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      } else {
        // Freehand path
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    });
  }, [strokes]);

  useEffect(() => {
    redrawMarkup();
  }, [redrawMarkup]);

  // Adjust markup canvas resolution when container resizes
  useEffect(() => {
    const canvas = markupCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const handleResize = () => {
      canvas.width = img.clientWidth || 800;
      canvas.height = img.clientHeight || 600;
      redrawMarkup();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawMarkup]);

  // Pointer event handlers for drawing
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'markup') return;
    const canvas = markupCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingRef.current = true;
    const newStroke: MarkupStroke = {
      tool: markupTool,
      color: markupColor,
      size: markupSize,
      points: [{ x, y }],
    };
    currentStrokeRef.current = newStroke;
    setStrokes((prev) => [...prev, newStroke]);
    setUndoneStrokes([]);
  };

  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const canvas = markupCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentStrokeRef.current.points.push({ x, y });
    setStrokes((prev) => [...prev.slice(0, -1), { ...currentStrokeRef.current! }]);
  };

  const endDrawing = () => {
    isDrawingRef.current = false;
    currentStrokeRef.current = null;
  };

  // Add new text overlay
  const handleAddText = () => {
    const newText: TextOverlay = {
      id: `txt_${Date.now()}`,
      text: 'Double tap to edit text',
      x: 35,
      y: 40,
      fontSize: 24,
      color: '#FFFFFF',
      isBold: false,
      hasBackground: false,
      opacity: 1,
    };
    setTextOverlays((prev) => [...prev, newText]);
    setSelectedTextId(newText.id);
  };

  // Add privacy area (blur or pixelate)
  const handleAddPrivacyArea = (type: 'blur' | 'pixelate') => {
    const newArea: PrivacyArea = {
      id: `priv_${Date.now()}`,
      type,
      x: 30,
      y: 35,
      width: 40,
      height: 25,
    };
    setPrivacyAreas((prev) => [...prev, newArea]);
  };

  // Final export and save to original/cloud
  const handleDone = async () => {
    setIsSaving(true);
    try {
      const img = imageRef.current;
      if (!img) return;

      const offscreen = document.createElement('canvas');
      const naturalW = img.naturalWidth || 1920;
      const naturalH = img.naturalHeight || 1080;
      offscreen.width = naturalW;
      offscreen.height = naturalH;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      // Apply transforms (rotate, flip)
      ctx.save();
      ctx.translate(naturalW / 2, naturalH / 2);
      ctx.rotate(((rotation + straighten) * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.translate(-naturalW / 2, -naturalH / 2);

      // Apply CSS filter
      ctx.filter = getFilterStyle();
      ctx.drawImage(img, 0, 0, naturalW, naturalH);
      ctx.restore();

      // Draw Privacy Areas onto canvas
      privacyAreas.forEach((area) => {
        const px = (area.x / 100) * naturalW;
        const py = (area.y / 100) * naturalH;
        const pw = (area.width / 100) * naturalW;
        const ph = (area.height / 100) * naturalH;

        if (area.type === 'blur') {
          ctx.save();
          ctx.beginPath();
          ctx.rect(px, py, pw, ph);
          ctx.clip();
          ctx.filter = 'blur(16px)';
          ctx.drawImage(offscreen, 0, 0);
          ctx.restore();
        } else if (area.type === 'pixelate') {
          // Pixelate by downscaling and upscaling the area
          const pixelSize = 14;
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.max(1, Math.floor(pw / pixelSize));
          smallCanvas.height = Math.max(1, Math.floor(ph / pixelSize));
          const sCtx = smallCanvas.getContext('2d');
          if (sCtx) {
            sCtx.imageSmoothingEnabled = false;
            sCtx.drawImage(offscreen, px, py, pw, ph, 0, 0, smallCanvas.width, smallCanvas.height);
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(smallCanvas, 0, 0, smallCanvas.width, smallCanvas.height, px, py, pw, ph);
            ctx.restore();
          }
        }
      });

      // Draw Markup layer
      const markupCanvas = markupCanvasRef.current;
      if (markupCanvas && strokes.length > 0) {
        ctx.drawImage(markupCanvas, 0, 0, naturalW, naturalH);
      }

      // Draw Text Overlays
      textOverlays.forEach((t) => {
        const tx = (t.x / 100) * naturalW;
        const ty = (t.y / 100) * naturalH;
        const scaledFontSize = (t.fontSize / 400) * naturalW;

        ctx.save();
        ctx.font = `${t.isBold ? 'bold ' : ''}${scaledFontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
        ctx.fillStyle = t.color;
        ctx.globalAlpha = t.opacity;

        if (t.hasBackground) {
          const metrics = ctx.measureText(t.text);
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(tx - 12, ty - scaledFontSize, metrics.width + 24, scaledFontSize + 16);
          ctx.fillStyle = t.color;
        }

        ctx.fillText(t.text, tx, ty);
        ctx.restore();
      });

      const dataUrl = offscreen.toDataURL('image/jpeg', 0.92);

      const summary = {
        adjustments,
        rotation,
        straighten,
        flipH,
        flipV,
        filter: activeFilter,
        markupCount: strokes.length,
        textCount: textOverlays.length,
        privacyAreasCount: privacyAreas.length,
        locationRemoved: removeLocationData,
        metadataRemoved: removeCameraMetadata,
        timestamp: new Date().toISOString(),
      };

      await onSave(dataUrl, summary);
      onClose();
    } catch (e) {
      console.error('Failed to export edited image', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: [...jellyScaleKeyframes] }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        scale: jellyScaleTransition,
        opacity: { duration: 0.35, ease: easeJelly },
      }}
      className="fixed inset-0 z-[1100] bg-black flex flex-col justify-between overflow-hidden select-none pointer-events-auto touch-none"
    >
      {/* 1. TOP BAR (Cancel & Done) */}
      <div
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
        className="w-full h-14 px-4 sm:px-6 flex items-center justify-between z-30"
      >
        <button
          type="button"
          onClick={onClose}
          className="text-base font-medium text-white hover:text-[#A1A1A1] active:opacity-70 transition-colors cursor-pointer px-2 py-1"
        >
          Cancel
        </button>

        <span className="text-sm font-semibold tracking-tight text-white uppercase text-[12px] text-[#A1A1A1]">
          Edit Photo
        </span>

        <button
          type="button"
          onClick={handleDone}
          disabled={isSaving}
          className="text-base font-semibold text-[#3B82F6] hover:text-blue-400 active:opacity-70 transition-colors cursor-pointer px-2 py-1 flex items-center gap-1.5"
        >
          {isSaving ? 'Saving...' : 'Done'}
        </button>
      </div>

      {/* 2. CENTRAL IMAGE CANVAS */}
      <div
        ref={imageContainerRef}
        className="flex-1 relative flex items-center justify-center p-3 sm:p-6 overflow-hidden"
      >
        <div
          style={{
            transform: `rotate(${rotation + straighten}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
            transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          {/* Main Photo with CSS Filters */}
          <img
            ref={imageRef}
            src={file.storage_path}
            alt={file.filename}
            crossOrigin="anonymous"
            style={{
              filter: getFilterStyle(),
              maxHeight: 'calc(100vh - 240px)',
              maxWidth: 'calc(100vw - 32px)',
            }}
            className="w-auto h-auto object-contain rounded-[4px] shadow-2xl pointer-events-none"
          />

          {/* Interactive Markup Drawing Canvas Overlay */}
          <canvas
            ref={markupCanvasRef}
            onPointerDown={startDrawing}
            onPointerMove={drawMove}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
            className={`absolute inset-0 w-full h-full z-10 ${
              activeTool === 'markup' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
            }`}
          />

          {/* Privacy Areas (Blur / Pixelate Overlays) */}
          {privacyAreas.map((area) => (
            <motion.div
              key={area.id}
              drag
              dragMomentum={false}
              style={{
                left: `${area.x}%`,
                top: `${area.y}%`,
                width: `${area.width}%`,
                height: `${area.height}%`,
              }}
              className="absolute z-20 rounded-lg border-2 border-dashed border-red-500/80 cursor-move pointer-events-auto overflow-hidden group shadow-lg"
            >
              <div
                style={{
                  backdropFilter: area.type === 'blur' ? 'blur(16px)' : 'none',
                  WebkitBackdropFilter: area.type === 'blur' ? 'blur(16px)' : 'none',
                }}
                className={`w-full h-full ${
                  area.type === 'pixelate' ? 'bg-neutral-900/90' : 'bg-white/10'
                } flex items-center justify-center`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-black/60 px-1.5 py-0.5 rounded">
                  {area.type}
                </span>
                <button
                  type="button"
                  onClick={() => setPrivacyAreas((prev) => prev.filter((p) => p.id !== area.id))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}

          {/* Text Overlays */}
          {textOverlays.map((textItem) => (
            <motion.div
              key={textItem.id}
              drag
              dragMomentum={false}
              onDragEnd={(e, info) => {
                const rect = imageContainerRef.current?.getBoundingClientRect();
                if (rect) {
                  setTextOverlays((prev) =>
                    prev.map((t) =>
                      t.id === textItem.id
                        ? {
                            ...t,
                            x: Math.max(0, Math.min(85, t.x + (info.offset.x / rect.width) * 100)),
                            y: Math.max(0, Math.min(85, t.y + (info.offset.y / rect.height) * 100)),
                          }
                        : t
                    )
                  );
                }
              }}
              style={{
                left: `${textItem.x}%`,
                top: `${textItem.y}%`,
                fontSize: `${textItem.fontSize}px`,
                color: textItem.color,
                fontWeight: textItem.isBold ? 700 : 500,
                opacity: textItem.opacity,
              }}
              onClick={() => setSelectedTextId(textItem.id)}
              className={`absolute z-20 cursor-move pointer-events-auto px-3 py-1.5 rounded-lg ${
                textItem.hasBackground ? 'bg-black/70 shadow-lg' : ''
              } ${
                selectedTextId === textItem.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <span>{textItem.text}</span>
            </motion.div>
          ))}

          {/* Interactive Crop Overlay */}
          {activeTool === 'crop' && (
            <div className="absolute inset-0 pointer-events-none border border-white/40">
              {/* 3x3 Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>
              {/* Corner Handles */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-white" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-white" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-white" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-white" />
            </div>
          )}
        </div>
      </div>

      {/* 3. TOOL-SPECIFIC CONTROL PANEL (Slides above main toolbar) */}
      <div className="w-full bg-[#121214]/90 backdrop-blur-xl border-t border-white/10 z-20">
        {/* A. ADJUST SUB-PANEL */}
        {activeTool === 'adjust' && (
          <div className="px-5 py-3 space-y-3 max-w-xl mx-auto">
            {/* Sub-category selector: Light / Color / Detail */}
            <div className="flex items-center justify-center gap-1 p-1 bg-black/40 rounded-full border border-white/5 w-fit mx-auto">
              {(['light', 'color', 'detail'] as AdjustCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAdjustCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    adjustCategory === cat
                      ? 'bg-white text-black shadow-md'
                      : 'text-[#8E8E93] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sliders for active category */}
            <div className="space-y-2 max-h-36 overflow-y-auto no-scrollbar py-1">
              {adjustCategory === 'light' && (
                <>
                  <SliderRow
                    label="Exposure"
                    value={adjustments.exposure}
                    min={-100}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, exposure: v }))}
                  />
                  <SliderRow
                    label="Brilliance"
                    value={adjustments.brilliance}
                    min={-100}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, brilliance: v }))}
                  />
                  <SliderRow
                    label="Highlights"
                    value={adjustments.highlights}
                    min={-100}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, highlights: v }))}
                  />
                  <SliderRow
                    label="Shadows"
                    value={adjustments.shadows}
                    min={-100}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, shadows: v }))}
                  />
                  <SliderRow
                    label="Contrast"
                    value={adjustments.contrast}
                    min={-100}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, contrast: v }))}
                  />
                  <SliderRow
                    label="Brightness"
                    value={adjustments.brightness}
                    min={-100}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, brightness: v }))}
                  />
                  <SliderRow
                    label="Black Point"
                    value={adjustments.blackPoint}
                    min={-100}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, blackPoint: v }))}
                  />
                </>
              )}

              {adjustCategory === 'color' && (
                <>
                  <SliderRow
                    label="Saturation"
                    value={adjustments.saturation}
                    min={-100}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, saturation: v }))}
                  />
                  <SliderRow
                    label="Vibrance"
                    value={adjustments.vibrance}
                    min={-100}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, vibrance: v }))}
                  />
                  <SliderRow
                    label="Temperature"
                    value={adjustments.temperature}
                    min={-100}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, temperature: v }))}
                  />
                  <SliderRow
                    label="Tint"
                    value={adjustments.tint}
                    min={-100}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, tint: v }))}
                  />
                </>
              )}

              {adjustCategory === 'detail' && (
                <>
                  <SliderRow
                    label="Sharpness"
                    value={adjustments.sharpness}
                    min={0}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, sharpness: v }))}
                  />
                  <SliderRow
                    label="Definition"
                    value={adjustments.definition}
                    min={0}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, definition: v }))}
                  />
                  <SliderRow
                    label="Noise Reduction"
                    value={adjustments.noiseReduction}
                    min={0}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, noiseReduction: v }))}
                  />
                  <SliderRow
                    label="Vignette"
                    value={adjustments.vignette}
                    min={0}
                    max={100}
                    onChange={(v) => setAdjustments((p) => ({ ...p, vignette: v }))}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* B. CROP SUB-PANEL */}
        {activeTool === 'crop' && (
          <div className="px-5 py-3 space-y-3 max-w-xl mx-auto">
            {/* Quick action icons: Rotate, Straighten, Flip H, Flip V */}
            <div className="flex items-center justify-around py-1">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex flex-col items-center gap-1 text-[#D0D0D0] hover:text-white cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <RotateCw className="w-5 h-5" />
                </div>
                <span className="text-[11px]">Rotate</span>
              </button>

              <button
                type="button"
                onClick={() => setFlipH((f) => !f)}
                className="flex flex-col items-center gap-1 text-[#D0D0D0] hover:text-white cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <FlipHorizontal className="w-5 h-5" />
                </div>
                <span className="text-[11px]">Flip H</span>
              </button>

              <button
                type="button"
                onClick={() => setFlipV((f) => !f)}
                className="flex flex-col items-center gap-1 text-[#D0D0D0] hover:text-white cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <FlipVertical className="w-5 h-5" />
                </div>
                <span className="text-[11px]">Flip V</span>
              </button>
            </div>

            {/* Straighten Slider */}
            <div className="pt-1">
              <SliderRow
                label="Straighten"
                value={straighten}
                min={-45}
                max={45}
                onChange={setStraighten}
              />
            </div>

            {/* Aspect Ratio Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {(['original', 'free', '1:1', '4:3', '16:9', '9:16'] as AspectRatioPreset[]).map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => setAspectRatio(ar)}
                  className={`h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    aspectRatio === ar
                      ? 'bg-white text-black font-semibold'
                      : 'bg-white/10 text-[#D0D0D0] hover:text-white'
                  }`}
                >
                  {ar.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* C. FILTERS SUB-PANEL */}
        {activeTool === 'filters' && (
          <div className="px-4 py-3 max-w-xl mx-auto">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              {filters.map((f) => {
                const isSelected = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFilter(f.id)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer flex-none"
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all ${
                        isSelected ? 'border-blue-500 scale-105 shadow-md' : 'border-transparent opacity-75'
                      }`}
                    >
                      <img
                        src={file.thumbnail_url || file.storage_path}
                        alt={f.name}
                        style={{ filter: f.css }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span
                      className={`text-[11px] font-medium transition-colors ${
                        isSelected ? 'text-blue-400 font-semibold' : 'text-[#8E8E93]'
                      }`}
                    >
                      {f.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* D. MARKUP SUB-PANEL */}
        {activeTool === 'markup' && (
          <div className="px-4 py-3 space-y-2.5 max-w-xl mx-auto">
            {/* Tool Selection: Pen, Pencil, Marker, Eraser, Line, Arrow, Rect, Circle */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'pen', icon: Pen, label: 'Pen' },
                { id: 'pencil', icon: Pencil, label: 'Pencil' },
                { id: 'marker', icon: Highlighter, label: 'Marker' },
                { id: 'eraser', icon: Eraser, label: 'Eraser' },
                { id: 'line', icon: Minus, label: 'Line' },
                { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
                { id: 'rectangle', icon: Square, label: 'Box' },
                { id: 'circle', icon: Circle, label: 'Circle' },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = markupTool === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMarkupTool(t.id as MarkupTool)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white/10 text-[#D0D0D0] hover:text-white'
                    }`}
                    title={t.label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}

              {/* Undo / Redo */}
              <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    if (strokes.length > 0) {
                      const last = strokes[strokes.length - 1];
                      setStrokes((s) => s.slice(0, -1));
                      setUndoneStrokes((u) => [...u, last]);
                    }
                  }}
                  disabled={strokes.length === 0}
                  className="w-8 h-8 rounded-lg bg-white/10 disabled:opacity-30 text-white flex items-center justify-center cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (undoneStrokes.length > 0) {
                      const last = undoneStrokes[undoneStrokes.length - 1];
                      setUndoneStrokes((u) => u.slice(0, -1));
                      setStrokes((s) => [...s, last]);
                    }
                  }}
                  disabled={undoneStrokes.length === 0}
                  className="w-8 h-8 rounded-lg bg-white/10 disabled:opacity-30 text-white flex items-center justify-center cursor-pointer"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Color Palette & Stroke Size */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {markupColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setMarkupColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full border border-white/30 transition-transform ${
                      markupColor === color ? 'scale-125 ring-2 ring-white shadow-md' : ''
                    }`}
                  />
                ))}
              </div>

              {/* Stroke Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#A1A1A1]">Size</span>
                {[2, 4, 8, 14].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setMarkupSize(size)}
                    className={`w-6 h-6 rounded-full bg-white/10 flex items-center justify-center cursor-pointer ${
                      markupSize === size ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <span
                      style={{ width: `${Math.min(16, size + 2)}px`, height: `${Math.min(16, size + 2)}px` }}
                      className="rounded-full bg-white block"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* E. TEXT SUB-PANEL */}
        {activeTool === 'text' && (
          <div className="px-5 py-3 space-y-3 max-w-xl mx-auto">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddText}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Type className="w-4 h-4" />
                <span>+ Add Text Layer</span>
              </button>

              {selectedTextId && (
                <button
                  type="button"
                  onClick={() => {
                    setTextOverlays((prev) => prev.filter((t) => t.id !== selectedTextId));
                    setSelectedTextId(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium cursor-pointer"
                >
                  Delete Selected Text
                </button>
              )}
            </div>

            {selectedTextId && (
              <div className="space-y-2 pt-1 border-t border-white/10">
                {(() => {
                  const sel = textOverlays.find((t) => t.id === selectedTextId);
                  if (!sel) return null;
                  return (
                    <>
                      <input
                        type="text"
                        value={sel.text}
                        onChange={(e) =>
                          setTextOverlays((prev) =>
                            prev.map((t) => (t.id === sel.id ? { ...t, text: e.target.value } : t))
                          )
                        }
                        placeholder="Enter text..."
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/20 text-white text-sm focus:outline-none focus:border-blue-500"
                      />

                      <div className="flex items-center justify-between text-xs pt-1">
                        {/* Font size */}
                        <div className="flex items-center gap-2">
                          <span className="text-[#8E8E93]">Size</span>
                          <input
                            type="range"
                            min="14"
                            max="72"
                            value={sel.fontSize}
                            onChange={(e) =>
                              setTextOverlays((prev) =>
                                prev.map((t) =>
                                  t.id === sel.id ? { ...t, fontSize: Number(e.target.value) } : t
                                )
                              )
                            }
                            className="w-24 accent-blue-500 cursor-pointer"
                          />
                        </div>

                        {/* Bold toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            setTextOverlays((prev) =>
                              prev.map((t) => (t.id === sel.id ? { ...t, isBold: !t.isBold } : t))
                            )
                          }
                          className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                            sel.isBold ? 'bg-white text-black border-white' : 'border-white/20 text-white'
                          }`}
                        >
                          B
                        </button>

                        {/* Background toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            setTextOverlays((prev) =>
                              prev.map((t) =>
                                t.id === sel.id ? { ...t, hasBackground: !t.hasBackground } : t
                              )
                            )
                          }
                          className={`px-2.5 py-1 rounded-md text-xs border ${
                            sel.hasBackground
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-white/20 text-[#D0D0D0]'
                          }`}
                        >
                          Box
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* F. MORE / PRIVACY SUB-PANEL */}
        {activeTool === 'more' && (
          <div className="px-5 py-3 space-y-3 max-w-xl mx-auto">
            <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider block">
              Privacy Editing & Protection
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAddPrivacyArea('blur')}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 text-left transition-colors cursor-pointer border border-white/5"
              >
                <div className="flex items-center gap-2 text-white font-medium text-xs mb-1">
                  <EyeOff className="w-4 h-4 text-blue-400" />
                  <span>Blur Area</span>
                </div>
                <p className="text-[11px] text-[#A1A1A1] leading-tight">
                  Hide faces, license plates, documents.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleAddPrivacyArea('pixelate')}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 text-left transition-colors cursor-pointer border border-white/5"
              >
                <div className="flex items-center gap-2 text-white font-medium text-xs mb-1">
                  <Shield className="w-4 h-4 text-teal-400" />
                  <span>Pixelate Area</span>
                </div>
                <p className="text-[11px] text-[#A1A1A1] leading-tight">
                  Censor numbers, addresses, identities.
                </p>
              </button>
            </div>

            {/* Metadata Stripping Toggles */}
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-2">
              <label className="flex items-center justify-between cursor-pointer text-xs">
                <span className="text-white">Remove Location / GPS Data</span>
                <input
                  type="checkbox"
                  checked={removeLocationData}
                  onChange={(e) => setRemoveLocationData(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded"
                />
              </label>
              <div className="h-[0.5px] bg-white/5" />
              <label className="flex items-center justify-between cursor-pointer text-xs">
                <span className="text-white">Remove Camera / Device Metadata</span>
                <input
                  type="checkbox"
                  checked={removeCameraMetadata}
                  onChange={(e) => setRemoveCameraMetadata(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded"
                />
              </label>
            </div>

            {/* Non-destructive Revert Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Revert all edits and restore original photo?')) {
                    await onRevert();
                    onClose();
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert to Original Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. MAIN TOOLBAR (Adjust, Crop, Filters, Markup, Text, More) */}
        <div
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
          className="h-20 px-3 flex items-center justify-around border-t border-white/10"
        >
          {[
            { id: 'adjust', icon: Sliders, label: 'Adjust' },
            { id: 'crop', icon: Crop, label: 'Crop' },
            { id: 'filters', icon: Sparkles, label: 'Filters' },
            { id: 'markup', icon: PenTool, label: 'Markup' },
            { id: 'text', icon: Type, label: 'Text' },
            { id: 'more', icon: MoreHorizontal, label: 'More' },
          ].map((tool) => {
            const Icon = tool.icon;
            const isSelected = activeTool === tool.id;

            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id as MainTool)}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 min-w-[50px] h-14 rounded-2xl cursor-pointer touch-manipulation transition-all"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isSelected ? 'bg-white text-black shadow-lg scale-105' : 'text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] font-medium leading-none tracking-tight transition-colors ${
                    isSelected ? 'text-white font-semibold' : 'text-[#8E8E93]'
                  }`}
                >
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

// Reusable Slider Component
interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, onChange }) => {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="w-24 text-[#8E8E93] truncate">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
      />
      <span className="w-9 text-right font-mono text-white tabular-nums">
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
};
