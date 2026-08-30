import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Info,
  Minus,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Settings,
  Square,
  SquareStack,
  X,
} from 'lucide-react';
import { FileExplorer } from './components/FileExplorer';
import { ImageViewer } from './components/ImageViewer';
import { SettingsModal } from './components/SettingsModal';
import { StatusFooter } from './components/StatusFooter';
import { Toast } from './components/Toast';
import { ThumbnailGrid } from './components/ThumbnailGrid';
import { UpdateDialog } from './components/UpdateDialog';
import { useImageStore } from './hooks/useImageStore';
import type { ImageFile, UpdateCheckResult, UpdateDownloadProgress, UpdateInfo } from './types';
import { cn } from './utils/cn';
import { t } from './i18n';

export function App() {
  const {
    images,
    folders,
    selectedFolder,
    selectedFolderLabel,
    collectionKind,
    preferences,
    setSelectedFolder,
    processFiles,
    openFiles,
    loading,
    error,
    openDirectory,
    toggleFolder,
    refreshSelectedFolder,
    updatePreferences,
    updateImageMetadata,
    renameImage,
    renameImages,
    copyImagesToFolder,
    moveImagesToFolder,
    deleteImages,
  } = useImageStore();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<ImageFile[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(preferences.sidebarOpen);
  const [isMaximized, setIsMaximized] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState('2.0.6');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateDownloadProgress | null>(null);
  const [updateAction, setUpdateAction] = useState<'idle' | 'downloading' | 'installing' | 'error'>('idle');
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.electron.getAppVersion().then((version) => {
      if (active) setAppVersion(version);
    }).catch(() => undefined);
    const unsubscribeAvailable = window.electron.onUpdateAvailable((update) => {
      setUpdateInfo(update);
      setUpdateProgress(null);
      setUpdateAction('idle');
      setUpdateError(null);
      setUpdateDialogOpen(true);
    });
    const unsubscribeProgress = window.electron.onUpdateDownloadProgress((progress) => {
      setUpdateProgress(progress);
    });
    return () => {
      active = false;
      unsubscribeAvailable();
      unsubscribeProgress();
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = preferences.language;
  }, [preferences.language]);

  useEffect(() => {
    let active = true;
    window.electron.isMaximized().then((value) => {
      if (active) setIsMaximized(value);
    }).catch(() => undefined);
    const unsubscribe = window.electron.onWindowMaximizedChanged((value) => setIsMaximized(value));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(preferences.sidebarOpen);
  }, [preferences.sidebarOpen]);

  useEffect(() => {
    if (!aboutOpen && !settingsOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setAboutOpen(false);
      setSettingsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [aboutOpen, settingsOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (viewerOpen && viewerImages.length === 0) setViewerOpen(false);
  }, [viewerImages.length, viewerOpen]);

  useEffect(() => {
    if (viewerImages.length === 0) return;
    setViewerImages((previous) => previous
      .filter((image) => images.some((candidate) => candidate.id === image.id))
      .map((image) => images.find((candidate) => candidate.id === image.id) ?? image));
    setViewerIndex((previous) => Math.max(0, Math.min(previous, Math.max(0, viewerImages.length - 1))));
  }, [images, viewerImages.length]);

  const handleImageClick = useCallback((index: number, collection: ImageFile[]) => {
    setViewerImages(collection);
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const handleCloseViewer = useCallback(() => setViewerOpen(false), []);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((previous) => {
      const next = !previous;
      updatePreferences({ sidebarOpen: next });
      return next;
    });
  }, [updatePreferences]);

  const handleImageDropToFolder = useCallback(
    async ({ imagePaths, targetFolderPath, move }: { imagePaths: string[]; targetFolderPath: string; move: boolean }) => {
      const result = move
        ? await moveImagesToFolder(imagePaths, targetFolderPath)
        : await copyImagesToFolder(imagePaths, targetFolderPath);
      if (result.failed.length > 0) {
        setNotice(`${result.succeeded.length} completed, ${result.failed.length} failed.`);
      } else {
        setNotice(`${result.succeeded.length} image(s) ${move ? 'moved' : 'copied'}.`);
      }
    },
    [copyImagesToFolder, moveImagesToFolder]
  );

  const copyDiagnostics = useCallback(async () => {
    const report = [
      `FastImage ${appVersion}`,
      `Platform: ${window.navigator.platform}`,
      `Collection: ${collectionKind}`,
      `Visible items: ${images.length}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(report);
      setNotice(t(preferences.language, 'diagnosticsCopied'));
    } catch {
      setNotice('Unable to copy diagnostics.');
    }
  }, [appVersion, collectionKind, images.length, preferences.language]);

  const handleCheckForUpdates = useCallback(async () => {
    setUpdateError(null);
    const result: UpdateCheckResult = await window.electron.checkForUpdates();
    if (result.status === 'available') {
      setUpdateInfo(result.update);
      setUpdateProgress(null);
      setUpdateAction('idle');
      setUpdateDialogOpen(true);
      return;
    }
    if (result.status === 'up-to-date') {
      setNotice(t(preferences.language, 'upToDate'));
      return;
    }
    setNotice(result.status === 'development'
      ? t(preferences.language, 'updateDevelopment')
      : result.status === 'unsupported'
        ? t(preferences.language, 'updateUnsupported')
        : `${t(preferences.language, 'updateCheckFailed')} ${result.message}`);
  }, [preferences.language]);

  const handleUpdateNow = useCallback(async () => {
    if (!updateInfo) return;
    setUpdateAction('downloading');
    setUpdateProgress(null);
    setUpdateError(null);
    const downloadResult = await window.electron.downloadUpdate();
    if (downloadResult.status !== 'downloaded') {
      setUpdateAction('error');
      const message = 'message' in downloadResult ? downloadResult.message : undefined;
      setUpdateError(message ?? t(preferences.language, 'updateCheckFailed'));
      return;
    }
    setUpdateAction('installing');
    const installResult = await window.electron.installUpdate();
    if (installResult.status !== 'restarting') {
      setUpdateAction('error');
      setUpdateError(installResult.message);
    }
  }, [preferences.language, updateInfo]);

  const viewPreferences = {
    viewSize: preferences.viewSize,
    sortMode: preferences.sortMode,
    sortDirection: preferences.sortDirection,
  };

  return (
    <div className={cn('fast-image-app flex h-screen w-screen flex-col overflow-hidden text-white', preferences.theme === 'light' ? 'theme-light' : 'theme-dark')} data-theme={preferences.theme}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
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
            onOpenDirectory={() => void openDirectory()}
            onOpenFiles={() => void openFiles()}
            onLoadFiles={processFiles}
            totalCount={images.length}
            loading={loading}
            language={preferences.language}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0d0d0d]">
        <div
          className="flex items-center justify-between gap-2 border-b border-gray-800 bg-[#1e1e1e] px-3 py-2"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={handleSidebarToggle}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
            <div className="mx-1 h-4 w-px bg-gray-700" />
            <span className="truncate text-sm font-medium text-gray-300" title={selectedFolder ?? selectedFolderLabel}>
              {selectedFolderLabel}
            </span>
            <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
              {collectionKind}
            </span>
          </div>

          <div
            className="flex items-center rounded-md border border-gray-700 bg-[#121212]"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={() => void refreshSelectedFolder()}
              className="p-2 text-gray-300 hover:bg-gray-700"
              title="Refresh folder"
              aria-label="Refresh folder"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-gray-300 hover:bg-gray-700"
              title={t(preferences.language, 'settings')}
              aria-label={t(preferences.language, 'settings')}
            >
              <Settings size={14} />
            </button>
            <button
              onClick={() => setAboutOpen(true)}
              className="p-2 text-gray-300 hover:bg-gray-700"
              title={t(preferences.language, 'about')}
              aria-label={t(preferences.language, 'about')}
            >
              <Info size={14} />
            </button>
            <div className="h-4 w-px bg-gray-700" />
            <button onClick={() => window.electron.minimizeWindow()} className="p-2 text-gray-300 hover:bg-gray-700" title="Minimize" aria-label="Minimize">
              <Minus size={14} />
            </button>
            <button onClick={() => window.electron.toggleMaximizeWindow()} className="p-2 text-gray-300 hover:bg-gray-700" title={isMaximized ? 'Restore' : 'Maximize'} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
              {isMaximized ? <SquareStack size={14} /> : <Square size={14} />}
            </button>
            <button onClick={() => window.electron.closeWindow()} className="p-2 text-gray-300 hover:bg-red-600 hover:text-white" title="Close" aria-label="Close">
              <X size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 border-b border-red-900/60 bg-red-950/40 px-4 py-2 text-xs text-red-200" role="alert">
            <AlertCircle size={14} />
            <span className="truncate">{error}</span>
          </div>
        )}
        <div className="relative flex-1 overflow-hidden">
          {loading && images.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">Scanning images…</div>
          ) : (
            <ThumbnailGrid
              images={images}
              currentFolderPath={selectedFolder}
              collectionKey={`${collectionKind}:${selectedFolder ?? selectedFolderLabel}`}
              onImageClick={handleImageClick}
              onRenameImage={renameImage}
              onRenameImages={renameImages}
              onCopyImages={copyImagesToFolder}
              onMoveImages={moveImagesToFolder}
              onDeleteImages={deleteImages}
              confirmDelete={preferences.confirmDelete}
              onUpdateImageMetadata={updateImageMetadata}
              viewPreferences={viewPreferences}
              onViewPreferencesChange={updatePreferences}
              language={preferences.language}
            />
          )}
        </div>
        </div>
      </div>

      <StatusFooter
        totalCount={images.length}
        loading={loading}
        language={preferences.language}
        appVersion={appVersion}
        onVersionClick={() => setAboutOpen(true)}
      />

      {viewerOpen && viewerImages.length > 0 && (
        <ImageViewer
          images={viewerImages}
          currentIndex={viewerIndex}
          onClose={handleCloseViewer}
          onIndexChange={setViewerIndex}
          wheelNavigation={preferences.wheelNavigation}
          onUpdateImageMetadata={updateImageMetadata}
        />
      )}

      {aboutOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4" role="presentation" onClick={() => setAboutOpen(false)}>
          <section className="w-[760px] max-w-full rounded-xl border border-gray-700 bg-[#1a1a1a] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="about-title" className="text-lg font-semibold text-white">FastImage {appVersion}</h2>
                <p className="mt-1 text-sm text-gray-400">개발자: 은준욱</p>
              </div>
              <button onClick={() => setAboutOpen(false)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white" title="Close" aria-label="Close about">
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 rounded-lg border border-gray-700 bg-[#101010] p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-200">FastImage 2.0</h3>
              <ul className="space-y-2 text-sm leading-relaxed text-gray-300">
                <li>로컬 폴더와 선택 파일을 빠르게 탐색하는 이미지 컬렉션</li>
                <li>검색·정렬·평점·즐겨찾기·다중 선택·일괄 파일 작업</li>
                <li>썸네일 캐시, 폴더 변경 감지, 최근 폴더 기억</li>
                <li>확대·축소·슬라이드쇼·간단한 편집과 포맷 변환</li>
                <li>이미지는 외부 서버로 업로드되지 않고 로컬에서 처리됩니다.</li>
              </ul>
              <button onClick={() => void copyDiagnostics()} className="mt-4 rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800">
                Copy diagnostics (no image data)
              </button>
              <button onClick={() => void handleCheckForUpdates()} className="mt-4 ml-2 rounded-md border border-blue-700/60 px-3 py-1.5 text-xs text-blue-200 hover:bg-blue-950/40">
                {t(preferences.language, 'updateCheck')}
              </button>
            </div>
          </section>
        </div>
      )}

      {settingsOpen && <SettingsModal preferences={preferences} onChange={updatePreferences} onClose={() => setSettingsOpen(false)} />}
      {updateDialogOpen && updateInfo && (
        <UpdateDialog
          language={preferences.language}
          update={updateInfo}
          currentVersion={appVersion}
          action={updateAction}
          progress={updateProgress}
          error={updateError}
          onUpdate={() => void handleUpdateNow()}
          onClose={() => setUpdateDialogOpen(false)}
        />
      )}
      <Toast message={notice} />
    </div>
  );
}
