import { useState, useCallback, useEffect } from 'react';
import { PanelLeftClose, PanelLeft, Minus, Square, SquareStack, X, Info } from 'lucide-react';
import { FileExplorer } from './components/FileExplorer';
import { ThumbnailGrid } from './components/ThumbnailGrid';
import { ImageViewer } from './components/ImageViewer';
import { useImageStore } from './hooks/useImageStore';
import { cn } from './utils/cn';

export function App() {
  const {
    images,
    folders,
    selectedFolder,
    setSelectedFolder,
    processFiles,
    loading,
    openDirectory,
    toggleFolder,
    copyImageToFolder,
    moveImageToFolder,
    renameImage,
    deleteImage,
  } = useImageStore();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    let active = true;

    window.electron
      .isMaximized()
      .then((value) => {
        if (active) setIsMaximized(value);
      })
      .catch(() => {
        if (active) setIsMaximized(false);
      });

    const unsubscribe = window.electron.onWindowMaximizedChanged((value) => {
      setIsMaximized(value);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!aboutOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAboutOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [aboutOpen]);

  const handleImageClick = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
  }, []);

  const handleImageDropToFolder = useCallback(
    async ({
      imagePath,
      targetFolderPath,
      move,
    }: {
      imagePath: string;
      targetFolderPath: string;
      move: boolean;
    }) => {
      try {
        if (move) {
          await moveImageToFolder(imagePath, targetFolderPath);
        } else {
          await copyImageToFolder(imagePath, targetFolderPath);
        }
      } catch (error) {
        console.error('Failed to move/copy image by drag and drop:', error);
        alert(error instanceof Error ? error.message : 'Failed to move/copy image.');
      }
    },
    [copyImageToFolder, moveImageToFolder]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1e1e] text-white">
      <div
        className={cn(
          'shrink-0 overflow-hidden border-r border-gray-800 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-72' : 'w-0'
        )}
      >
        <FileExplorer
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onToggleFolder={toggleFolder}
          onImageDropToFolder={handleImageDropToFolder}
          onOpenDirectory={openDirectory}
          onLoadFiles={processFiles}
          totalCount={images.length}
          loading={loading}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-[#0d0d0d]">
        <div
          className="flex items-center justify-between gap-2 border-b border-gray-800 bg-[#1e1e1e] px-3 py-2"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
            <div className="mx-1 h-4 w-px bg-gray-700" />
            <span className="truncate text-sm font-medium text-gray-300">
              {selectedFolder ?? 'Home'}
            </span>
          </div>

          <div
            className="flex items-center rounded-md border border-gray-700 bg-[#121212]"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={() => setAboutOpen(true)}
              className="p-2 text-gray-300 hover:bg-gray-700"
              title="About Fast Image Viewer"
            >
              <Info size={14} />
            </button>
            <div className="h-4 w-px bg-gray-700" />
            <button
              onClick={() => window.electron.minimizeWindow()}
              className="p-2 text-gray-300 hover:bg-gray-700"
              title="Minimize"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => window.electron.toggleMaximizeWindow()}
              className="p-2 text-gray-300 hover:bg-gray-700"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <SquareStack size={14} /> : <Square size={14} />}
            </button>
            <button
              onClick={() => window.electron.closeWindow()}
              className="p-2 text-gray-300 hover:bg-red-600 hover:text-white"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {images.length === 0 && !loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <p>No images in this folder.</p>
            </div>
          ) : (
            <ThumbnailGrid
              images={images}
              currentFolderPath={selectedFolder}
              onImageClick={handleImageClick}
              onCopyImage={copyImageToFolder}
              onMoveImage={moveImageToFolder}
              onRenameImage={renameImage}
              onDeleteImage={deleteImage}
            />
          )}
        </div>
      </div>

      {viewerOpen && images.length > 0 && (
        <ImageViewer
          images={images}
          currentIndex={viewerIndex}
          onClose={handleCloseViewer}
          onIndexChange={setViewerIndex}
        />
      )}

      {aboutOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={() => setAboutOpen(false)}
        >
          <div
            className="w-[760px] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-700 bg-[#1a1a1a] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Fast Image Viewer V1.0.0</h2>
                <p className="mt-1 text-sm text-gray-400">개발자: 은준욱</p>
              </div>
              <button
                onClick={() => setAboutOpen(false)}
                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-gray-700 bg-[#101010] p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-200">프로그램 소개</h3>
              <ul className="space-y-2 text-sm leading-relaxed text-gray-300">
                <li>로컬 폴더를 빠르게 스캔하고, 트리 탐색 + 썸네일 그리드로 이미지를 한눈에 관리</li>
                <li>파일명 검색, 이름/용량/날짜 정렬, 썸네일 크기(S/M/L) 전환 지원</li>
                <li>몰입형 뷰어에서 키보드 중심 탐색(←/→, ESC, +, -, 0, R) 지원</li>
                <li>확대/축소, 드래그 이동, 회전, 이전/다음 이동, 즉시 다운로드 기능 제공</li>
                <li>이미지 메타 정보(이름, 용량, 형식, 수정일, 경로)를 Info 패널에서 바로 확인</li>
                <li>내장 편집기로 회전/반전/리사이즈(비율 잠금), 품질 조절, JPG/PNG/WebP 변환 저장 지원</li>
                <li>클라우드 업로드 없이 로컬 환경에서 동작하는 데스크톱 이미지 뷰어</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
