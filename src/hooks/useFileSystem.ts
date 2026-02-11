
import { useState, useCallback, useRef } from 'react';
import type { ImageFile, FolderNode, FileSystemDirectoryHandle, FileSystemHandle } from '../types';

// Browser specific API types (fallback)
declare global {
    interface Window {
        showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
    }
}

export function useFileSystem() {
    const [rootFolders, setRootFolders] = useState<FolderNode[]>([]);
    const [currentImages, setCurrentImages] = useState<ImageFile[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Cache for object URLs to prevent memory leaks
    const urlCacheRef = useRef<Map<string, string>>(new Map());

    // Helper to revoke URLs when needed
    const clearUrlCache = useCallback(() => {
        urlCacheRef.current.forEach(url => URL.revokeObjectURL(url));
        urlCacheRef.current.clear();
    }, []);

    const openDirectory = useCallback(async () => {
        try {
            const handle = await window.showDirectoryPicker();
            const rootNode: FolderNode = {
                id: handle.name, // simple ID logic for root
                name: handle.name,
                path: handle.name,
                handle,
                children: [],
                isLoaded: false,
                isExpanded: true
            };

            setRootFolders(prev => {
                // Avoid duplicates
                if (prev.find(n => n.name === handle.name)) return prev;
                return [...prev, rootNode];
            });

            // Auto-load root content
            await loadFolderContent(rootNode);
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Failed to open directory:', err);
            }
        }
    }, []);

    const loadFolderContent = useCallback(async (node: FolderNode) => {
        setLoading(true);
        try {
            const children: FolderNode[] = [];
            const images: ImageFile[] = [];
            const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff|tif|avif)$/i;

            // Clear previous cache if we are switching to a new view, 
            // but for a tree explorer we might want to keep some?
            // For now, let's just clear cache when switch folders to save memory on large sets
            // clearUrlCache(); // Only clear when completely changing context? No, per folder loading.

            for await (const entry of (node.handle as any).values()) {
                const h = entry as FileSystemHandle;

                if (h.kind === 'directory') {
                    children.push({
                        id: `${node.path}/${h.name}`,
                        name: h.name,
                        path: `${node.path}/${h.name}`,
                        handle: h as FileSystemDirectoryHandle,
                        children: [],
                        isLoaded: false,
                        isExpanded: false
                    });
                } else if (h.kind === 'file') {
                    const fileHandle = h as any;
                    const file = await fileHandle.getFile();
                    if (imageExtensions.test(file.name) || file.type.startsWith('image/')) {
                        // Create URL
                        const id = `${node.path}/${file.name}`;
                        let url = urlCacheRef.current.get(id);
                        if (!url) {
                            url = URL.createObjectURL(file);
                            urlCacheRef.current.set(id, url);
                        }

                        images.push({
                            id,
                            name: file.name,
                            file, // Stored for reading
                            handle: fileHandle, // Stored for writing
                            url,
                            size: file.size,
                            type: file.type || 'image/unknown',
                            lastModified: file.lastModified,
                            path: `${node.path}/${file.name}`
                        });
                    }
                }
            }

            // Sort
            children.sort((a, b) => a.name.localeCompare(b.name));
            images.sort((a, b) => a.name.localeCompare(b.name));

            // Update tree state
            setRootFolders(prev => {
                const updateNode = (nodes: FolderNode[]): FolderNode[] => {
                    return nodes.map(n => {
                        if (n.id === node.id) {
                            return { ...n, children, isLoaded: true, isExpanded: true };
                        }
                        if (n.children.length > 0) {
                            return { ...n, children: updateNode(n.children) };
                        }
                        return n;
                    });
                };
                return updateNode(prev);
            });

            // If this is the selected folder, update images
            if (selectedFolderId === node.id) {
                setCurrentImages(images);
            }

            // Also return images for immediate use if needed
            return images;

        } catch (err) {
            console.error('Error reading folder:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedFolderId]);

    const selectFolder = useCallback(async (node: FolderNode) => {
        setSelectedFolderId(node.id);
        // If not loaded, load it. If loaded, we still need to get images?
        // The tree state has children nodes, but maybe not files.
        // We didn't store files in FolderNode to save memory. 
        // So we need to re-scan for files (fast) or store them.
        // Re-scanning is safer for memory.
        const imgs = await loadFolderContent(node);
        if (imgs) setCurrentImages(imgs);
    }, [loadFolderContent]);

    const toggleFolder = useCallback(async (node: FolderNode) => {
        if (node.isExpanded) {
            // Collapse
            setRootFolders(prev => {
                const update = (nodes: FolderNode[]): FolderNode[] => {
                    return nodes.map(n => {
                        if (n.id === node.id) return { ...n, isExpanded: false };
                        if (n.children.length > 0) return { ...n, children: update(n.children) };
                        return n;
                    });
                };
                return update(prev);
            });
        } else {
            // Expand - Load if needed
            if (!node.isLoaded) {
                await loadFolderContent(node);
            } else {
                // Just expand
                setRootFolders(prev => {
                    const update = (nodes: FolderNode[]): FolderNode[] => {
                        return nodes.map(n => {
                            if (n.id === node.id) return { ...n, isExpanded: true };
                            if (n.children.length > 0) return { ...n, children: update(n.children) };
                            return n;
                        });
                    };
                    return update(prev);
                });
            }
        }
    }, [loadFolderContent]);

    // Fallback for drag-drop files (not directories for now to keep simple) or just simple file usage
    const processLegacyFiles = useCallback((files: File[]) => {
        // Legacy support implementation if needed
    }, []);

    return {
        rootFolders,
        currentImages,
        selectedFolderId,
        loading,
        openDirectory,
        selectFolder,
        toggleFolder,
        refreshCurrentFolder: () => {
            // Find current node and reload
            // verify implementation later if needed
        }
    };
}
