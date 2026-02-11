import { useState, useCallback, useEffect } from 'react';
import type { DirectoryContent, ImageFile, FolderNode } from '../types';

function updateNodeTree(
  nodes: FolderNode[],
  targetId: string,
  updater: (node: FolderNode) => FolderNode
): FolderNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return updater(node);
    }
    if (node.children.length > 0) {
      return { ...node, children: updateNodeTree(node.children, targetId, updater) };
    }
    return node;
  });
}

function findNodeById(nodes: FolderNode[], targetId: string): FolderNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    const nested = findNodeById(node.children, targetId);
    if (nested) return nested;
  }
  return null;
}

export function useImageStore() {
  const [rootFolders, setRootFolders] = useState<FolderNode[]>([]);
  const [currentImages, setCurrentImages] = useState<ImageFile[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mapFolders = useCallback((content: DirectoryContent): FolderNode[] => {
    return content.folders
      .map((folder) => ({
        id: folder.path,
        name: folder.name,
        path: folder.path,
        children: [],
        isLoaded: false,
        isExpanded: false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, []);

  const mapImages = useCallback((content: DirectoryContent): ImageFile[] => {
    return content.files
      .map((file) => ({
        id: file.path,
        name: file.name,
        path: file.path,
        // Encode absolute Windows paths so spaces/#/Korean names do not break image URLs.
        url: window.electron.toLocalUrl(file.path),
        size: file.size,
        lastModified: file.lastModified,
        type: file.type || 'image/unknown',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, []);

  const refreshFolderContent = useCallback(
    async (folderPath: string) => {
      const content = await window.electron.readDirectory(folderPath);
      const children = mapFolders(content);
      const images = mapImages(content);

      setRootFolders((prev) =>
        updateNodeTree(prev, folderPath, (node) => ({
          ...node,
          children,
          isLoaded: true,
        }))
      );

      if (selectedFolderId && selectedFolderId.toLowerCase() === folderPath.toLowerCase()) {
        setCurrentImages(images);
      }

      return images;
    },
    [mapFolders, mapImages, selectedFolderId]
  );

  const loadFolderContent = useCallback(
    async (node: FolderNode) => {
      setLoading(true);
      try {
        return await refreshFolderContent(node.path);
      } catch (err) {
        console.error('Error reading folder:', err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [refreshFolderContent]
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrapRoots = async () => {
      setLoading(true);
      try {
        const roots = await window.electron.getInitialRoots();
        if (cancelled) return;

        const rootNodes: FolderNode[] = roots.map((root) => ({
          id: root.path,
          name: root.name,
          path: root.path,
          children: [],
          isLoaded: false,
          isExpanded: false,
        }));

        setRootFolders(rootNodes);

        const defaultNode =
          rootNodes.find((node) => node.name.toLowerCase() === 'downloads') ?? rootNodes[0];

        if (!defaultNode) return;

        setSelectedFolderId(defaultNode.id);
        const content = await window.electron.readDirectory(defaultNode.path);
        if (cancelled) return;

        const images = mapImages(content);
        const children = mapFolders(content);
        setRootFolders((prev) =>
          updateNodeTree(prev, defaultNode.id, (node) => ({
            ...node,
            children,
            isLoaded: true,
            isExpanded: true,
          }))
        );
        setCurrentImages(images);
      } catch (err) {
        console.error('Failed to initialize root folders:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrapRoots();

    return () => {
      cancelled = true;
    };
  }, [mapFolders, mapImages]);

  const openDirectory = useCallback(async () => {
    try {
      const result = await window.electron.openDirectory();
      if (!result) return;

      const rootNode: FolderNode = {
        id: result.path,
        name: result.name,
        path: result.path,
        children: mapFolders(result.content),
        isLoaded: true,
        isExpanded: true,
      };

      const images = mapImages(result.content);

      setRootFolders((prev) => {
        const existingIndex = prev.findIndex((node) => node.id === rootNode.id);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = rootNode;
          return next;
        }
        return [...prev, rootNode];
      });

      setSelectedFolderId(rootNode.id);
      setCurrentImages(images);
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  }, [mapFolders, mapImages]);

  const selectFolder = useCallback(
    async (nodeId: string | null) => {
      setSelectedFolderId(nodeId);
      if (!nodeId) return;

      const node = findNodeById(rootFolders, nodeId);
      if (!node) return;

      const images = await loadFolderContent(node);
      setCurrentImages(images);
    },
    [rootFolders, loadFolderContent]
  );

  const toggleFolder = useCallback(
    async (node: FolderNode) => {
      if (node.isExpanded) {
        setRootFolders((prev) =>
          updateNodeTree(prev, node.id, (target) => ({ ...target, isExpanded: false }))
        );
        return;
      }

      if (!node.isLoaded) {
        await loadFolderContent(node);
        return;
      }

      setRootFolders((prev) =>
        updateNodeTree(prev, node.id, (target) => ({ ...target, isExpanded: true }))
      );
    },
    [loadFolderContent]
  );

  const processFiles = useCallback((_files: FileList | File[]) => {
    // Drag-and-drop local file handling can be added separately.
  }, []);

  const refreshSelectedFolder = useCallback(async () => {
    if (!selectedFolderId) return;
    await refreshFolderContent(selectedFolderId);
  }, [refreshFolderContent, selectedFolderId]);

  const copyImageToFolder = useCallback(
    async (sourcePath: string, targetFolderPath: string) => {
      await window.electron.copyImageFile(sourcePath, targetFolderPath);
      await refreshSelectedFolder();
    },
    [refreshSelectedFolder]
  );

  const moveImageToFolder = useCallback(
    async (sourcePath: string, targetFolderPath: string) => {
      await window.electron.moveImageFile(sourcePath, targetFolderPath);
      await refreshSelectedFolder();
    },
    [refreshSelectedFolder]
  );

  const renameImage = useCallback(
    async (sourcePath: string, nextName: string) => {
      await window.electron.renameImageFile(sourcePath, nextName);
      await refreshSelectedFolder();
    },
    [refreshSelectedFolder]
  );

  const deleteImage = useCallback(
    async (sourcePath: string) => {
      await window.electron.deleteImageFile(sourcePath);
      await refreshSelectedFolder();
    },
    [refreshSelectedFolder]
  );

  return {
    images: currentImages,
    allImages: [],
    folders: rootFolders,
    selectedFolder: selectedFolderId,
    setSelectedFolder: selectFolder,
    processFiles,
    loading,
    openDirectory,
    toggleFolder,
    refreshSelectedFolder,
    copyImageToFolder,
    moveImageToFolder,
    renameImage,
    deleteImage,
  };
}
