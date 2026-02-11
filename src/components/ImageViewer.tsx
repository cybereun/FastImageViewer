import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Minus,
  Square,
  SquareStack,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Pencil,
  Download,
  Maximize2,
  Info,
} from 'lucide-react';
import type { ImageFile } from '../types';
import { ImageEditor } from './ImageEditor';
import { cn } from '../utils/cn';

interface ImageViewerProps {
  images: ImageFile[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageViewer({
  images,
  currentIndex,
  onClose,
  onIndexChange,
}: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentImage = images[currentIndex];

  const clearControlsTimer = useCallback(() => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
      controlsTimer.current = null;
    }
  }, []);

  const scheduleControlsHide = useCallback(() => {
    clearControlsTimer();
    controlsTimer.current = setTimeout(() => {
      if (!isDragging && !showInfo && !showEditor) {
        setControlsVisible(false);
      }
    }, 3000);
  }, [clearControlsTimer, isDragging, showEditor, showInfo]);

  const keepControlsVisible = useCallback(() => {
    setControlsVisible(true);
    scheduleControlsHide();
  }, [scheduleControlsHide]);

  const resetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const navigate = useCallback(
    (direction: number) => {
      const newIndex = (currentIndex + direction + images.length) % images.length;
      onIndexChange(newIndex);
      resetView();
      keepControlsVisible();
    },
    [currentIndex, images.length, keepControlsVisible, onIndexChange, resetView]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          navigate(-1);
          break;
        case 'ArrowRight':
          navigate(1);
          break;
        case 'Escape':
          if (showEditor) {
            setShowEditor(false);
          } else {
            onClose();
          }
          break;
        case '+':
        case '=':
          setZoom((value) => Math.min(value * 1.2, 10));
          break;
        case '-':
          setZoom((value) => Math.max(value / 1.2, 0.1));
          break;
        case '0':
          resetView();
          break;
        case 'r':
          setRotation((value) => (value + 90) % 360);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onClose, resetView, showEditor]);

  useEffect(() => {
    scheduleControlsHide();
    return () => clearControlsTimer();
  }, [clearControlsTimer, scheduleControlsHide]);

  useEffect(() => {
    let mounted = true;
    window.electron
      .isMaximized()
      .then((value) => {
        if (mounted) setIsMaximized(value);
      })
      .catch(() => {
        if (mounted) setIsMaximized(false);
      });

    const unsubscribe = window.electron.onWindowMaximizedChanged((value) => {
      setIsMaximized(value);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const preload = (idx: number) => {
      const i = (idx + images.length) % images.length;
      const img = new Image();
      img.src = images[i].url;
    };
    preload(currentIndex + 1);
    preload(currentIndex - 1);
  }, [currentIndex, images]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      keepControlsVisible();
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((value) => Math.min(Math.max(value * delta, 0.1), 10));
        return;
      }
      if (e.deltaY > 0) {
        navigate(1);
      } else {
        navigate(-1);
      }
    },
    [keepControlsVisible, navigate]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
    keepControlsVisible();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoom > 1) {
      resetView();
    } else {
      setZoom(2.5);
    }
  };

  if (!currentImage) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className={cn(
            'absolute left-0 right-0 top-0 z-30 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 transition-opacity duration-300',
            controlsVisible ? 'opacity-100' : 'opacity-0'
          )}
          onMouseEnter={() => {
            clearControlsTimer();
            setControlsVisible(true);
          }}
          onMouseLeave={scheduleControlsHide}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h3 className="max-w-[46vw] truncate text-sm font-medium text-white">{currentImage.name}</h3>
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-300">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-2">
            <button
              onClick={() => {
                setShowInfo((value) => !value);
                keepControlsVisible();
              }}
              onMouseEnter={keepControlsVisible}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                showInfo ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
              )}
              title="Info"
            >
              <Info size={18} className="pointer-events-none" />
            </button>
            <button
              onClick={() => {
                setShowEditor((value) => !value);
                keepControlsVisible();
              }}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                showEditor ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
              )}
              title="Edit"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => {
                window.electron.minimizeWindow();
                keepControlsVisible();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              title="Minimize window"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={() => {
                window.electron.toggleMaximizeWindow();
                keepControlsVisible();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              title={isMaximized ? 'Restore window' : 'Maximize window'}
            >
              {isMaximized ? <SquareStack size={16} /> : <Square size={16} />}
            </button>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10 hover:text-white"
              title="Close (ESC)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className="flex flex-1 items-center justify-center overflow-hidden"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          <img
            src={currentImage.url}
            alt={currentImage.name}
            className="max-h-full max-w-full select-none transition-transform duration-150"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
            draggable={false}
          />
        </div>

        <button
          onClick={() => navigate(-1)}
          className={cn(
            'absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/80 backdrop-blur-sm transition-all hover:bg-black/70 hover:text-white',
            controlsVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => navigate(1)}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/80 backdrop-blur-sm transition-all hover:bg-black/70 hover:text-white',
            controlsVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          <ChevronRight size={24} />
        </button>

        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 transition-opacity duration-300',
            controlsVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          <button
            onClick={() => setZoom((value) => Math.max(value / 1.3, 0.1))}
            className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white"
            title="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={resetView}
            className="min-w-[60px] rounded-lg px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 hover:text-white"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((value) => Math.min(value * 1.3, 10))}
            className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white"
            title="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
          <div className="mx-2 h-4 w-px bg-gray-600" />
          <button
            onClick={() => setRotation((value) => (value + 90) % 360)}
            className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white"
            title="Rotate"
          >
            <RotateCw size={18} />
          </button>
          <button
            onClick={() => {
              const canvas = document.createElement('canvas');
              const img = new Image();
              img.onload = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                  if (!blob) return;
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = currentImage.name;
                  a.click();
                  URL.revokeObjectURL(url);
                });
              };
              img.src = currentImage.url;
            }}
            className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white"
            title="Download"
          >
            <Download size={18} />
          </button>
          <button
            onClick={resetView}
            className="rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white"
            title="Fit"
          >
            <Maximize2 size={18} />
          </button>
        </div>

        {showInfo && (
          <div className="absolute right-4 top-16 z-40 w-64 rounded-xl border border-gray-700 bg-gray-900/95 p-4 shadow-xl backdrop-blur-md">
            <h4 className="mb-3 text-sm font-semibold text-white">Image Info</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Name</span>
                <span className="max-w-[150px] truncate text-right text-gray-200">{currentImage.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Size</span>
                <span className="text-gray-200">{formatSize(currentImage.size)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Type</span>
                <span className="text-gray-200">{currentImage.type}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Modified</span>
                <span className="text-gray-200">
                  {new Date(currentImage.lastModified).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Path</span>
                <span className="max-w-[150px] truncate text-right text-gray-200">{currentImage.path}</span>
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            'absolute bottom-16 left-1/2 z-20 -translate-x-1/2 transition-opacity duration-300',
            controlsVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="scrollbar-none flex max-w-[80vw] gap-1 overflow-x-auto rounded-xl bg-black/60 p-1.5 backdrop-blur-md">
            {images.map((img, idx) => {
              const distance = Math.abs(idx - currentIndex);
              if (distance > 8) return null;
              return (
                <button
                  key={img.id}
                  onClick={() => {
                    onIndexChange(idx);
                    resetView();
                    keepControlsVisible();
                  }}
                  className={cn(
                    'h-12 w-12 shrink-0 overflow-hidden rounded-md transition-all',
                    idx === currentIndex ? 'scale-110 ring-2 ring-blue-500' : 'opacity-60 hover:opacity-100'
                  )}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showEditor && <ImageEditor image={currentImage} onClose={() => setShowEditor(false)} />}
    </>
  );
}
