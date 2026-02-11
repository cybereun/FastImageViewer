
export interface ImageFile {
  id: string;
  name: string;
  file?: File; // Optional
  url: string; // "local://path" for Electron
  size: number;
  type: string;
  lastModified: number;
  path: string; // Absolute FS path
}

export interface FolderNode {
  id: string; // path
  name: string;
  path: string; // Absolute FS path
  children: FolderNode[];
  isLoaded: boolean;
  isExpanded: boolean;
}

export interface EditState {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  quality: number;
  width?: number;
  height?: number;
  format: 'image/png' | 'image/jpeg' | 'image/webp';
}

declare global {
  interface Window {
    electron: {
      openDirectory: () => Promise<{ path: string; name: string; content: DirectoryContent } | null>;
      chooseDirectory: () => Promise<{ path: string; name: string } | null>;
      readDirectory: (path: string) => Promise<DirectoryContent>;
      getInitialRoots: () => Promise<Array<{ name: string; path: string }>>;
      toLocalUrl: (filePath: string) => string;
      copyImageFile: (sourcePath: string, targetFolderPath: string) => Promise<{ path: string; name: string }>;
      moveImageFile: (sourcePath: string, targetFolderPath: string) => Promise<{ path: string; name: string }>;
      renameImageFile: (sourcePath: string, nextName: string) => Promise<{ path: string; name: string }>;
      deleteImageFile: (sourcePath: string) => Promise<{ ok: true }>;
      minimizeWindow: () => void;
      toggleMaximizeWindow: () => void;
      closeWindow: () => void;
      isMaximized: () => Promise<boolean>;
      onWindowMaximizedChanged: (callback: (isMaximized: boolean) => void) => () => void;
    };
  }
}

export interface DirectoryContent {
  files: Array<{
    name: string;
    path: string;
    size: number;
    lastModified: number;
    type: string;
  }>;
  folders: Array<{
    name: string;
    path: string;
  }>;
}
