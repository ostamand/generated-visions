import { useCallback, useEffect, useMemo, useState } from "react";
import FullscreenMediaViewer from "../../../components/FullscreenMediaViewer";
import { GalleryItem, GalleryResponse } from "../../../types/gallery";
import { useFilter } from "../../contexts/FilterContext";
import styles from "./style.module.scss";
import GalleryItemComponent from "../GalleryItem";
import EditableFolderName from "../EditableFolderName";
import ViewToggle, { View } from "./ViewToggle";
import { DemoGuard } from "../DemoGuard";
import { useDemo } from "../../contexts/DemoContext";
import { toast } from "sonner";
import { ImageMetadata } from "@/lib/database";

export default function Gallery({
  galleryData,
  setGalleryData,
}: {
  galleryData: GalleryResponse;
  setGalleryData: (data: GalleryResponse) => void;
}) {
  const [fullscreenMedia, setFullscreenMedia] = useState<GalleryItem | null>(
    null,
  );
  const {
    selectedFolders,
    mediaType,
    galleryRoot,
    showHidden,
    onlyWithPrompt,
    setIsOverlayOpen,
    selectedItems,
    setSelectedItems,
    lastSelectedItem,
    setLastSelectedItem,
    allMediaItems,
  } = useFilter();
  const [activeView, setActiveView] = useState<View>("all");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { isDemoMode } = useDemo();

  const filteredData = useMemo(() => {
    const { starred, all } = galleryData;

    const filterItem = (item: GalleryItem) => {
      // Hidden filter
      if (!showHidden && item.metadata.hidden) {
        return false;
      }

      // Media type filter
      if (mediaType !== "all") {
        const isVideo = item.name.endsWith(".mp4");
        if (mediaType === "video" && !isVideo) return false;
        if (mediaType === "image" && isVideo) return false;
      }

      // Prompt filter
      if (
        onlyWithPrompt &&
        (!item.metadata?.prompt || item.metadata.prompt.trim() === "")
      ) {
        return false;
      }

      return true;
    };

    let filteredAll = all.map((group) => ({
      ...group,
      media: group.media.filter(filterItem),
    }));

    if (selectedFolders.length > 0) {
      filteredAll = filteredAll.filter((group) =>
        selectedFolders.includes(group.folderPath)
      );
    }

    // Remove empty groups after all filters
    filteredAll = filteredAll.filter((group) => group.media.length > 0);

    let filteredStarred = starred.filter(filterItem);

    // Further filter starred items by selected folders
    if (selectedFolders.length > 0) {
      filteredStarred = filteredStarred.filter((item) => {
        // Get the folder path from the item's relative path
        const lastSlashIndex = item.relativePath.lastIndexOf("/");
        const folderPath = lastSlashIndex === -1
          ? "."
          : item.relativePath.substring(0, lastSlashIndex);
        return selectedFolders.includes(folderPath);
      });
    }

    return { starred: filteredStarred, all: filteredAll };
  }, [galleryData, selectedFolders, mediaType, showHidden, onlyWithPrompt]);

  const visibleMediaItems = useMemo(() => {
    if (activeView === "starred") {
      return filteredData.starred;
    }
    return filteredData.all.flatMap((group) => group.media);
  }, [activeView, filteredData]);

  const handleItemSelect = useCallback(
    (item: GalleryItem, event: React.MouseEvent) => {
      event.stopPropagation();
      const currentId = item.relativePath;
      const isSelected = selectedItems.includes(currentId);

      if (event.shiftKey && lastSelectedItem) {
        const visibleIds = visibleMediaItems.map((i) => i.relativePath);
        const lastIndex = visibleIds.indexOf(lastSelectedItem);
        const currentIndex = visibleIds.indexOf(currentId);
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const range = visibleIds.slice(start, end + 1);

        const newSelectedItems = new Set([...selectedItems, ...range]);
        setSelectedItems(Array.from(newSelectedItems));
      } else {
        if (isSelected) {
          setSelectedItems(selectedItems.filter((id) => id !== currentId));
        } else {
          setSelectedItems([...selectedItems, currentId]);
        }
      }
      setLastSelectedItem(currentId);
    },
    [
      selectedItems,
      setSelectedItems,
      lastSelectedItem,
      setLastSelectedItem,
      visibleMediaItems,
    ],
  );

  const handleOpenFullscreen = useCallback(
    (media: GalleryItem) => {
      setFullscreenMedia(media);
      setIsOverlayOpen(true);
    },
    [setIsOverlayOpen],
  );

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenMedia(null);
    setIsOverlayOpen(false);
  }, [setIsOverlayOpen]);

  const handleMetadataChange = (
    relativePath: string,
    updates: Partial<ImageMetadata>,
  ) => {
    const updateItem = (item: GalleryItem) => {
      if (item.relativePath === relativePath) {
        const newMetadata = { ...item.metadata, ...updates };
        return { ...item, metadata: newMetadata };
      }
      return item;
    };

    const newAll = galleryData.all.map((group) => ({
      ...group,
      media: group.media.map(updateItem),
    }));

    const newStarred = galleryData.starred.map(updateItem);

    setGalleryData({ starred: newStarred, all: newAll });
  };

  const handleUpdateMetadata = useCallback(
    async (
      relativePath: string,
      updates: { hidden?: boolean; starred?: boolean },
    ) => {
      if (isDemoMode) {
        toast.info("This feature is disabled in demo mode.");
        return;
      }
      const originalGalleryData = { ...galleryData };

      const updateItem = (item: GalleryItem) => {
        if (item.relativePath === relativePath) {
          return { ...item, metadata: { ...item.metadata, ...updates } };
        }
        return item;
      };

      const newAll = galleryData.all.map((group) => ({
        ...group,
        media: group.media.map(updateItem),
      }));

      let newStarred = galleryData.starred.map(updateItem);

      if (updates.starred === true) {
        const item = galleryData.all
          .flatMap((g) => g.media)
          .find((i) => i.relativePath === relativePath);
        if (item && !newStarred.some((i) => i.relativePath === relativePath)) {
          newStarred.push({
            ...item,
            metadata: { ...item.metadata, ...updates },
          });
        }
      } else if (updates.starred === false) {
        newStarred = newStarred.filter((i) => i.relativePath !== relativePath);
      }

      setGalleryData({ starred: newStarred, all: newAll });

      if (fullscreenMedia?.relativePath === relativePath) {
        setFullscreenMedia((prevMedia) => {
          if (!prevMedia) return null;
          return {
            ...prevMedia,
            metadata: {
              ...prevMedia.metadata,
              ...updates,
            },
          };
        });
      }

      try {
        const res = await fetch("/api/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagePath: relativePath, ...updates }),
        });

        if (!res.ok) {
          throw new Error(`Failed to update metadata: ${res.statusText}`);
        }
      } catch (error) {
        console.error("Error updating metadata:", error);
        setGalleryData(originalGalleryData); // Revert on error
      }
    },
    [galleryData, setGalleryData, fullscreenMedia, isDemoMode],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key === "h" && hoveredItem) {
        if (isDemoMode) {
          toast.info("This feature is disabled in demo mode.");
          return;
        }
        const itemToHide = galleryData.all
          .flatMap((g) => g.media)
          .find((i) => i.relativePath === hoveredItem) ||
          galleryData.starred.find((i) => i.relativePath === hoveredItem);

        if (itemToHide) {
          handleUpdateMetadata(itemToHide.relativePath, {
            hidden: !itemToHide.metadata.hidden,
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hoveredItem, galleryData, handleUpdateMetadata, isDemoMode]);

  const handleCopyFolderPath = useCallback(
    async (relativePath: string) => {
      const folderPath = relativePath.substring(
        0,
        relativePath.lastIndexOf("/"),
      );
      const absolutePath = galleryRoot
        ? `${galleryRoot}/${folderPath}`
        : folderPath;
      try {
        await navigator.clipboard.writeText(absolutePath);
      } catch (error) {
        console.error("Failed to copy folder path:", error);
      }
    },
    [galleryRoot],
  );

  const renderGalleryGrid = (images: GalleryItem[]) => (
    <div className={styles.galleryGrid}>
      {images.map((file, index) => (
        <GalleryItemComponent
          key={file.relativePath}
          file={file}
          index={index}
          selectedItems={selectedItems}
          hoveredItem={hoveredItem}
          onItemSelect={handleItemSelect}
          onOpenFullscreen={handleOpenFullscreen}
          onUpdateMetadata={handleUpdateMetadata}
          onHover={setHoveredItem}
          onCopyFolderPath={handleCopyFolderPath}
        />
      ))}
    </div>
  );

  const handleMediaDeleted = useCallback(
    (deletedRelativePath: string) => {
      const newAll = galleryData.all
        .map((group) => ({
          ...group,
          media: group.media.filter(
            (item) => item.relativePath !== deletedRelativePath,
          ),
        }))
        .filter((group) => group.media.length > 0);

      const newStarred = galleryData.starred.filter(
        (item) => item.relativePath !== deletedRelativePath,
      );

      setGalleryData({ starred: newStarred, all: newAll });
      setFullscreenMedia(null);
      setIsOverlayOpen(false);
    },
    [galleryData, setGalleryData, setIsOverlayOpen],
  );

  const navigationMediaList = useMemo(() => {
    return activeView === "starred" ? filteredData.starred : allMediaItems;
  }, [activeView, filteredData.starred, allMediaItems]);

  return (
    <main className={styles.mainContainer}>
      <div className={styles.viewToggleContainer}>
        <ViewToggle
          activeView={activeView}
          onViewChange={setActiveView}
          counts={{
            all: allMediaItems.length,
            starred: filteredData.starred.length,
          }}
        />
      </div>

      {activeView === "all" && (
        <div>
          {filteredData.all.map((group) => (
            <div key={group.folderPath} className={styles.folderGroup}>
              <div className={styles.folderGroupHeader}>
                <DemoGuard>
                  <EditableFolderName
                    folderPath={group.folderPath}
                    initialDisplayName={group.folderName}
                  />
                </DemoGuard>
                <span className={styles.count}>({group.media.length})</span>
              </div>
              {renderGalleryGrid(group.media)}
            </div>
          ))}
        </div>
      )}

      {activeView === "starred" && (
        <div>{renderGalleryGrid(filteredData.starred)}</div>
      )}

      {fullscreenMedia && (
        <FullscreenMediaViewer
          media={fullscreenMedia}
          mediaList={navigationMediaList}
          onSelectItem={setFullscreenMedia}
          onClose={handleCloseFullscreen}
          onMetadataChange={handleMetadataChange}
          onUpdateMetadata={handleUpdateMetadata}
          onMediaDeleted={handleMediaDeleted}
        />
      )}
    </main>
  );
}
