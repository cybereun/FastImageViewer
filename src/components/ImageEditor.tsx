
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Download,
  X,
  Minimize2,
  Maximize2,
  Lock,
  Unlock,
  RefreshCcw,
} from 'lucide-react';
import type { ImageFile, EditState } from '../types';
import { cn } from '../utils/cn';

interface ImageEditorProps {
  image: ImageFile;
  onClose: () => void;
}

const FORMAT_OPTIONS = [
  { value: 'image/jpeg', label: 'JPG', ext: 'jpg' },
  { value: 'image/png', label: 'PNG', ext: 'png' },
  { value: 'image/webp', label: 'WebP', ext: 'webp' },
] as const;

export function ImageEditor({ image, onClose }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editState, setEditState] = useState<EditState>({
    rotation: 0,
    flipH: false,
    flipV: false,
    quality: 85,
    format: 'image/jpeg',
    width: 0,
    height: 0,
  });
  const [previewSize, setPreviewSize] = useState<string>('');
  const [originalDimensions, setOriginalDimensions] = useState({ w: 0, h: 0 });
  const [expanded, setExpanded] = useState(false);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { rotation, flipH, flipV, width, height } = editState;

    // Canvas dimensions are the target size
    // Protect against 0 or negative
    const targetW = width > 0 ? width : 1;
    const targetH = height > 0 ? height : 1;

    canvas.width = targetW;
    canvas.height = targetH;

    // We need to calculate how to draw the image into this target canvas
    // considering rotation and flip.
    // 1. First, create an intermediate canvas for rotation/flip if necessary?
    // Or just use transform on the main canvas.

    ctx.save();

    // Move to center of canvas
    ctx.translate(targetW / 2, targetH / 2);

    // Rotate
    ctx.rotate((rotation * Math.PI) / 180);

    // Flip
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Draw Image
    // If rotated 90/270, width and height are swapped for the source drawing logic relative to canvas
    const isRotated = rotation % 180 !== 0;

    // We want the image to FILL the target dimensions.
    // The target dimensions ALREADY reflect the rotation (if we implemented resize correctly).
    // Wait, if I rotate 90 deg, the "visual" width becomes height.
    // Our 'width' and 'height' state are the FINAL output dimensions.

    // If we simply draw centering at 0,0 with correct dimensions:
    if (isRotated) {
      // If rotated, the image's natural height maps to target Width approx?
      // Actually we just draw the image centered.
      // The drawImage takes (img, dx, dy, dw, dh).
      // we need to draw it such that it fits the box.
      ctx.drawImage(
        img,
        -targetH / 2, // centered
        -targetW / 2,
        targetH, // actually draws with swapped dimensions in local space
        targetW
      );
    } else {
      ctx.drawImage(
        img,
        -targetW / 2,
        -targetH / 2,
        targetW,
        targetH
      );
    }

    ctx.restore();

    // Estimate output size
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const sizeKB = blob.size / 1024;
          setPreviewSize(
            sizeKB > 1024
              ? `${(sizeKB / 1024).toFixed(1)} MB`
              : `${sizeKB.toFixed(0)} KB`
          );
        }
      },
      editState.format,
      editState.quality / 100
    );
  }, [editState]);

  // Initial Load
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      // Initialize edit state with original dimensions
      setEditState(prev => ({
        ...prev,
        width: img.naturalWidth,
        height: img.naturalHeight
      }));
    };
    img.src = image.url;
  }, [image.url]);

  // Redraw when state changes
  useEffect(() => {
    // Debounce basic redraw? No, canvas is fast enough for small sizes usually.
    // But for large images, might need optimization.
    // Use animation frame
    const id = requestAnimationFrame(drawCanvas);
    return () => cancelAnimationFrame(id);
  }, [editState, drawCanvas]);

  const handleResize = (type: 'width' | 'height', value: number) => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    // Calculate aspect ratio based on current rotation?
    // Actually simply based on current width/height.
    // If locked, update the other.

    let newW = editState.width || 1;
    let newH = editState.height || 1;

    if (type === 'width') {
      newW = value;
      if (lockAspectRatio) {
        const ratio = (editState.height || 1) / (editState.width || 1);
        newH = Math.round(value * ratio);
      }
    } else {
      newH = value;
      if (lockAspectRatio) {
        const ratio = (editState.width || 1) / (editState.height || 1);
        newW = Math.round(value * ratio);
      }
    }

    setEditState(s => ({ ...s, width: newW, height: newH }));
  };

  const rotate = (deg: number) => {
    setEditState((s) => {
      const newRotation = ((s.rotation + deg) % 360 + 360) % 360;
      // When rotating 90 degrees, we should swap width and height
      // only if it's a 90 degree turn from previous.
      // But here we are setting new state. 
      // Let's swap width/height to keep the "image" fitting the box naturally?
      // Usually users expect the box to rotate too.
      return {
        ...s,
        rotation: newRotation,
        width: s.height,
        height: s.width
      };
    });
  };

  const reset = () => {
    setEditState({
      rotation: 0,
      flipH: false,
      flipV: false,
      quality: 85,
      format: 'image/jpeg',
      width: originalDimensions.w,
      height: originalDimensions.h
    });
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // We already have the logic in drawCanvas but let's confirm format
    // Also use File System Access API if available to save back?
    // Or just download. User asked for "Save as (different extension)"
    // which implies creating a new file.

    // If handle exists, we could try to save to same folder...
    // But for now, download is safer/standard for web apps.
    // If we wanted to write back to disk, we'd need a "Save" vs "Download" button.

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        // Use File System Access Save File Picker if possible for "Save As"
        if (window.showSaveFilePicker) {
          try {
            const ext = FORMAT_OPTIONS.find(f => f.value === editState.format)?.ext || 'jpg';
            const handle = await window.showSaveFilePicker({
              suggestedName: image.name.replace(/\.[^.]+$/, `.${ext}`),
              types: [{
                description: 'Image file',
                accept: { [editState.format]: [`.${ext}`] }
              }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
          } catch (e) {
            if ((e as Error).name !== 'AbortError') console.error(e);
            // Fallback to download
          }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ext = FORMAT_OPTIONS.find(
          (f) => f.value === editState.format
        )!.ext;
        const baseName = image.name.replace(/\.[^.]+$/, '');
        a.href = url;
        a.download = `${baseName}_edited.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      editState.format,
      editState.quality / 100
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Safe input handler
  const handleDimInput = (type: 'width' | 'height', valStr: string) => {
    const val = parseInt(valStr);
    if (!isNaN(val)) handleResize(type, val);
  };

  return (
    <div
      className={cn(
        'fixed z-[60] bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-2xl flex flex-col overflow-hidden transition-all duration-300',
        expanded
          ? 'inset-4'
          : 'bottom-4 right-4 w-[400px] h-[600px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-[#252526] px-4 py-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          이미지 편집
          <span className="text-xs font-normal text-gray-400">({image.name})</span>
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={reset} className="rounded p-1.5 text-gray-400 hover:text-white" title="초기화">
            <RefreshCcw size={14} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="relative flex-1 overflow-hidden bg-[#111] flex items-center justify-center p-4">
        <div className="relative border border-gray-800 shadow-lg"
          style={{
            width: editState.width > 0 ? 'auto' : '100%',
            height: editState.height > 0 ? 'auto' : '100%',
            maxWidth: '100%',
            maxHeight: '100%'
          }}>
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain" // CSS sets visual limit
          />
        </div>

        {/* Dimensions overlay */}
        <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
          {editState.width} x {editState.height}
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-gray-700 bg-[#252526] p-4 space-y-4 overflow-y-auto max-h-[50vh] scrollbar-thin">

        {/* Info Row */}
        <div className="flex justify-between text-xs text-gray-400">
          <span>{formatSize(image.size)}</span>
          {previewSize && <span className="text-blue-400 font-medium">{previewSize}</span>}
        </div>

        {/* 1. Resize & Format */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300">크기 및 형식</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1 border border-gray-700">
              <span className="text-xs text-gray-500">W</span>
              <input
                type="number"
                value={editState.width || ''}
                onChange={(e) => handleDimInput('width', e.target.value)}
                className="w-full bg-transparent text-xs text-white focus:outline-none text-right"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1 border border-gray-700">
              <span className="text-xs text-gray-500">H</span>
              <input
                type="number"
                value={editState.height || ''}
                onChange={(e) => handleDimInput('height', e.target.value)}
                className="w-full bg-transparent text-xs text-white focus:outline-none text-right"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setLockAspectRatio(!lockAspectRatio)}
              className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded", lockAspectRatio ? "bg-blue-900 text-blue-200" : "text-gray-400 hover:bg-gray-700")}
            >
              {lockAspectRatio ? <Lock size={12} /> : <Unlock size={12} />}
              <span>비율 유지</span>
            </button>

            <select
              value={editState.format}
              onChange={(e) => setEditState(s => ({ ...s, format: e.target.value as any }))}
              className="bg-gray-800 border border-gray-700 text-xs text-white rounded px-2 py-1 focus:outline-none"
            >
              {FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* 2. Transform */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300">회전 및 반전</label>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => rotate(-90)} className="bg-gray-700 hover:bg-gray-600 rounded p-2 flex justify-center text-gray-200">
              <RotateCcw size={16} />
            </button>
            <button onClick={() => rotate(90)} className="bg-gray-700 hover:bg-gray-600 rounded p-2 flex justify-center text-gray-200">
              <RotateCw size={16} />
            </button>
            <button onClick={() => setEditState(s => ({ ...s, flipH: !s.flipH }))} className={cn("bg-gray-700 hover:bg-gray-600 rounded p-2 flex justify-center", editState.flipH ? "text-blue-400" : "text-gray-200")}>
              <FlipHorizontal size={16} />
            </button>
            <button onClick={() => setEditState(s => ({ ...s, flipV: !s.flipV }))} className={cn("bg-gray-700 hover:bg-gray-600 rounded p-2 flex justify-center", editState.flipV ? "text-blue-400" : "text-gray-200")}>
              <FlipVertical size={16} />
            </button>
          </div>
        </div>

        {/* 3. Quality */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <label className="font-semibold text-gray-300">압축 품질</label>
            <span className="text-gray-400">{editState.quality}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={editState.quality}
            onChange={(e) => setEditState(s => ({ ...s, quality: parseInt(e.target.value) }))}
            className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 shadow-lg"
        >
          <Download size={16} />
          {editState.format === 'image/jpeg' ? 'JPG' : (editState.format === 'image/png' ? 'PNG' : 'WebP')}로 저장
        </button>
      </div>
    </div>
  );
}
