
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
  Undo2,
  Redo2,
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

const MAX_OUTPUT_DIMENSION = 12000;

interface SaveFileHandle {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

type SaveFilePicker = (options: unknown) => Promise<SaveFileHandle>;

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
    crop: null,
    brightness: 0,
    contrast: 0,
    saturation: 0,
  });
  const [previewSize, setPreviewSize] = useState<string>('');
  const [originalDimensions, setOriginalDimensions] = useState({ w: 0, h: 0 });
  const [expanded, setExpanded] = useState(false);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [history, setHistory] = useState<EditState[]>([]);
  const [future, setFuture] = useState<EditState[]>([]);
  const [showBefore, setShowBefore] = useState(false);
  const [overwriteError, setOverwriteError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const updateEditState = useCallback((updater: (previous: EditState) => EditState) => {
    setEditState((previous) => {
      const next = updater(previous);
      if (JSON.stringify(next) === JSON.stringify(previous)) return previous;
      setHistory((entries) => [...entries, previous].slice(-30));
      setFuture([]);
      return next;
    });
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { rotation, flipH, flipV, width, height, crop, brightness, contrast, saturation } = editState;

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

    if (editState.format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`;

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
    const sourceX = Math.max(0, Math.min(img.naturalWidth - 1, crop?.x ?? 0));
    const sourceY = Math.max(0, Math.min(img.naturalHeight - 1, crop?.y ?? 0));
    const sourceW = Math.max(1, Math.min(img.naturalWidth - sourceX, crop?.width ?? img.naturalWidth));
    const sourceH = Math.max(1, Math.min(img.naturalHeight - sourceY, crop?.height ?? img.naturalHeight));

    if (isRotated) {
      // If rotated, the image's natural height maps to target Width approx?
      // Actually we just draw the image centered.
      // The drawImage takes (img, dx, dy, dw, dh).
      // we need to draw it such that it fits the box.
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        -targetH / 2,
        -targetW / 2,
        targetH,
        targetW
      );
    } else {
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
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
    const boundedValue = Math.max(1, Math.min(MAX_OUTPUT_DIMENSION, Math.round(value)));

    // Calculate aspect ratio based on current rotation?
    // Actually simply based on current width/height.
    // If locked, update the other.

    let newW = editState.width || 1;
    let newH = editState.height || 1;

    if (type === 'width') {
      newW = boundedValue;
      if (lockAspectRatio) {
        const ratio = (editState.height || 1) / (editState.width || 1);
        newH = Math.min(MAX_OUTPUT_DIMENSION, Math.max(1, Math.round(boundedValue * ratio)));
      }
    } else {
      newH = boundedValue;
      if (lockAspectRatio) {
        const ratio = (editState.width || 1) / (editState.height || 1);
        newW = Math.min(MAX_OUTPUT_DIMENSION, Math.max(1, Math.round(boundedValue * ratio)));
      }
    }

    updateEditState((previous) => ({ ...previous, width: newW, height: newH }));
  };

  const rotate = (deg: number) => {
    updateEditState((s) => {
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
    updateEditState(() => ({
      rotation: 0,
      flipH: false,
      flipV: false,
      quality: 85,
      format: 'image/jpeg',
      width: originalDimensions.w,
      height: originalDimensions.h,
      crop: null,
      brightness: 0,
      contrast: 0,
      saturation: 0,
    }));
  };

  const undo = () => {
    setHistory((entries) => {
      const previous = entries[entries.length - 1];
      if (!previous) return entries;
      setFuture((entriesToRedo) => [editState, ...entriesToRedo].slice(0, 30));
      setEditState(previous);
      return entries.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((entries) => {
      const next = entries[0];
      if (!next) return entries;
      setHistory((previous) => [...previous, editState].slice(-30));
      setEditState(next);
      return entries.slice(1);
    });
  };

  const updateCrop = (field: 'x' | 'y' | 'width' | 'height', value: number) => {
    if (!originalDimensions.w || !originalDimensions.h) return;
    updateEditState((previous) => {
      const current = previous.crop ?? { x: 0, y: 0, width: originalDimensions.w, height: originalDimensions.h };
      const next = { ...current, [field]: Math.max(0, Math.round(value)) };
      next.x = Math.min(next.x, Math.max(0, originalDimensions.w - 1));
      next.y = Math.min(next.y, Math.max(0, originalDimensions.h - 1));
      next.width = Math.max(1, Math.min(next.width, originalDimensions.w - next.x));
      next.height = Math.max(1, Math.min(next.height, originalDimensions.h - next.y));
      return { ...previous, crop: next, width: next.width, height: next.height };
    });
  };

  const applyCropPreset = (aspectWidth: number, aspectHeight: number) => {
    if (!originalDimensions.w || !originalDimensions.h) return;
    const targetRatio = aspectWidth / aspectHeight;
    const sourceRatio = originalDimensions.w / originalDimensions.h;
    let width = originalDimensions.w;
    let height = originalDimensions.h;
    if (sourceRatio > targetRatio) width = Math.round(originalDimensions.h * targetRatio);
    else height = Math.round(originalDimensions.w / targetRatio);
    updateEditState((previous) => ({
      ...previous,
      crop: {
        x: Math.round((originalDimensions.w - width) / 2),
        y: Math.round((originalDimensions.h - height) / 2),
        width,
        height,
      },
      width,
      height,
    }));
  };

  const isOverwriteCompatible = image.source === 'folder'
    && Boolean(image.path)
    && (image.type === 'image/jpeg' ? editState.format === 'image/jpeg' : image.type === editState.format);

  const createOutputBlob = () => new Promise<Blob | null>((resolve) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      resolve(null);
      return;
    }
    canvas.toBlob(resolve, editState.format, editState.quality / 100);
  });

  const handleOverwrite = async () => {
    if (!isOverwriteCompatible || !image.path) return;
    if (!window.confirm('Overwrite the original image? This cannot be undone.')) return;
    setOverwriteError(null);
    const blob = await createOutputBlob();
    if (!blob) {
      setOverwriteError('Unable to create the edited image.');
      return;
    }
    try {
      await window.electron.overwriteImageFile(image.path, await blob.arrayBuffer());
      onClose();
    } catch (error) {
      setOverwriteError(error instanceof Error ? error.message : 'Unable to overwrite the original image.');
    }
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
        const saveFilePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
        if (saveFilePicker) {
          try {
            const ext = FORMAT_OPTIONS.find(f => f.value === editState.format)?.ext || 'jpg';
            const handle = await saveFilePicker({
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
            if ((e as Error).name === 'AbortError') return;
            console.error(e);
            // Fall back to browser download for other picker errors.
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
          <button onClick={undo} disabled={history.length === 0} className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30" title="Undo" aria-label="Undo">
            <Undo2 size={14} />
          </button>
          <button onClick={redo} disabled={future.length === 0} className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30" title="Redo" aria-label="Redo">
            <Redo2 size={14} />
          </button>
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
        <button
          onClick={() => setShowBefore((value) => !value)}
          className="absolute right-3 top-3 z-10 rounded bg-black/60 px-2 py-1 text-xs text-gray-200 hover:bg-black/80"
        >
          {showBefore ? 'Show after' : 'Show before'}
        </button>
        <div className="relative border border-gray-800 shadow-lg"
          style={{
            width: editState.width > 0 ? 'auto' : '100%',
            height: editState.height > 0 ? 'auto' : '100%',
            maxWidth: '100%',
            maxHeight: '100%'
          }}>
          <canvas
            ref={canvasRef}
            className={cn('max-w-full max-h-full object-contain', showBefore && 'hidden')} // CSS sets visual limit
          />
          {showBefore && <img src={image.url} alt="Original preview" className="max-h-full max-w-full object-contain" />}
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
        {(image.type === 'image/gif' || image.type === 'image/tiff') && (
          <p className="rounded border border-yellow-800/70 bg-yellow-950/30 px-2 py-1 text-[11px] text-yellow-200">
            애니메이션/원본 메타데이터는 편집 저장 시 보존되지 않을 수 있습니다.
          </p>
        )}

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
              onChange={(e) => {
                const nextFormat = e.target.value;
                if (FORMAT_OPTIONS.some((option) => option.value === nextFormat)) {
                  updateEditState((previous) => ({
                    ...previous,
                    format: nextFormat as EditState['format'],
                  }));
                }
              }}
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
            <button onClick={() => updateEditState((s) => ({ ...s, flipH: !s.flipH }))} className={cn("bg-gray-700 hover:bg-gray-600 rounded p-2 flex justify-center", editState.flipH ? "text-blue-400" : "text-gray-200")}>
              <FlipHorizontal size={16} />
            </button>
            <button onClick={() => updateEditState((s) => ({ ...s, flipV: !s.flipV }))} className={cn("bg-gray-700 hover:bg-gray-600 rounded p-2 flex justify-center", editState.flipV ? "text-blue-400" : "text-gray-200")}>
              <FlipVertical size={16} />
            </button>
          </div>
        </div>

        {/* 3. Quality */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <label className="font-semibold text-gray-300">압축 품질</label>
            <span className="text-gray-400">{editState.format === 'image/png' ? 'PNG 무손실' : `${editState.quality}%`}</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={editState.quality}
            disabled={editState.format === 'image/png'}
            onChange={(e) => updateEditState((s) => ({ ...s, quality: parseInt(e.target.value, 10) }))}
            className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* 4. Crop */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300">자르기</label>
            <button
              onClick={() => updateEditState((previous) => previous.crop
                ? { ...previous, crop: null, width: originalDimensions.w, height: originalDimensions.h }
                : { ...previous, crop: { x: 0, y: 0, width: originalDimensions.w, height: originalDimensions.h } })}
              className={cn('rounded px-2 py-1 text-xs', editState.crop ? 'bg-blue-900 text-blue-200' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}
            >
              {editState.crop ? '자르기 해제' : '자르기 사용'}
            </button>
          </div>
          {editState.crop && (
            <>
              <div className="mb-2 flex gap-1">
                <button onClick={() => applyCropPreset(1, 1)} className="rounded bg-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-600">1:1</button>
                <button onClick={() => applyCropPreset(4, 3)} className="rounded bg-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-600">4:3</button>
                <button onClick={() => applyCropPreset(16, 9)} className="rounded bg-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-600">16:9</button>
              </div>
            <div className="grid grid-cols-4 gap-1">
              {(['x', 'y', 'width', 'height'] as const).map((field) => (
                <label key={field} className="flex flex-col gap-1 text-[10px] text-gray-500">
                  {field.toUpperCase()}
                  <input
                    type="number"
                    min={0}
                    value={editState.crop?.[field] ?? 0}
                    onChange={(event) => updateCrop(field, Number(event.target.value))}
                    className="w-full rounded border border-gray-700 bg-gray-800 px-1 py-1 text-xs text-white"
                  />
                </label>
              ))}
            </div>
            </>
          )}
        </div>

        {/* 5. Adjustments */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300">기본 보정</label>
          {([
            ['brightness', '밝기'],
            ['contrast', '대비'],
            ['saturation', '채도'],
          ] as const).map(([field, label]) => (
            <div key={field} className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-10">{label}</span>
              <input
                type="range"
                min={-100}
                max={100}
                value={editState[field]}
                onChange={(event) => updateEditState((previous) => ({ ...previous, [field]: Number(event.target.value) }))}
                className="h-1 flex-1 accent-blue-500"
              />
              <span className="w-8 text-right">{editState[field]}</span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 shadow-lg"
        >
          <Download size={16} />
          {editState.format === 'image/jpeg' ? 'JPG' : (editState.format === 'image/png' ? 'PNG' : 'WebP')}로 저장
        </button>
        {isOverwriteCompatible && (
          <button
            onClick={() => void handleOverwrite()}
            className="w-full rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-200 transition-colors hover:bg-red-900/50"
          >
            원본 덮어쓰기
          </button>
        )}
        {!isOverwriteCompatible && image.source === 'folder' && <p className="text-[11px] text-gray-500">원본 덮어쓰기는 현재 이미지 형식과 같은 형식으로만 사용할 수 있습니다.</p>}
        {overwriteError && <p className="text-xs text-red-300" role="alert">{overwriteError}</p>}
      </div>
    </div>
  );
}
