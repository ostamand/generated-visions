"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  GalleryItem,
  GalleryResponse,
  GroupedGallery,
} from "../../types/gallery";

interface FilterContextType {
  selectedFolders: string[];

  setSelectedFolders: (folders: string[]) => void;

  searchTerm: string;

  setSearchTerm: (term: string) => void;

  mediaType: string;

  setMediaType: (type: string) => void;

  model: string;

  setModel: (model: string) => void;

  showHidden: boolean;

  setShowHidden: (show: boolean) => void;
  onlyWithPrompt: boolean;
  setOnlyWithPrompt: (show: boolean) => void;
  galleryRoot: string | null;
  setGalleryRoot: (root: string | null) => void;
  isOverlayOpen: boolean;
  setIsOverlayOpen: (isOpen: boolean) => void;
  selectedItems: string[];
  setSelectedItems: (items: string[]) => void;
  lastSelectedItem: string | null;
  setLastSelectedItem: (item: string | null) => void;
  allMediaItems: GalleryItem[];
  setAllMediaItems: (items: GalleryItem[]) => void;
  galleryData: GalleryResponse;
  setGalleryData: (data: GalleryResponse) => void;
  loading: boolean;
  error: string | null;
  updateBatchMetadata: (
    mediaIds: string[],
    metadataUpdate: { modelId?: number; loraId?: number },
  ) => void;
  clearFilters: () => void;
  refreshKey: number;
  refreshData: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [mediaType, setMediaType] = useState("all");
  const [model, setModel] = useState("all");
  const [showHidden, setShowHidden] = useState(false);
  const [onlyWithPrompt, setOnlyWithPrompt] = useState(false);
  const [galleryRoot, setGalleryRoot] = useState<string | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [lastSelectedItem, setLastSelectedItem] = useState<string | null>(null);
  const [allMediaItems, setAllMediaItems] = useState<GalleryItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [galleryData, setGalleryData] = useState<GalleryResponse>({
    starred: [],
    all: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isInitialMount = useRef(true);
  const lastRefreshKey = useRef(refreshKey);

  useEffect(() => {
    const doFetch = async () => {
      setLoading(true);
      setError(null);

      let doSync = false;
      if (isInitialMount.current) {
        doSync = true;
        isInitialMount.current = false;
      } else if (refreshKey > lastRefreshKey.current) {
        doSync = true;
      }
      lastRefreshKey.current = refreshKey;

      try {
        if (doSync) {
          await fetch("/api/sync", { method: "POST", cache: "no-store" });
        }

        const galleryUrl = new URL("/api/gallery", window.location.origin);
        const galleryRootUrl = new URL(
          "/api/gallery-root",
          window.location.origin,
        );

        const galleryRequest = fetch(galleryUrl.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showHidden, selectedFolders, model }),
          cache: "no-store",
        });

        const [galleryRes, galleryRootRes] = await Promise.all([
          galleryRequest,
          fetch(galleryRootUrl.toString(), { cache: "no-store" }),
        ]);

        if (!galleryRes.ok || !galleryRootRes.ok) {
          throw new Error("Failed to fetch gallery data");
        }

        const [fetchedGalleryData, galleryRootData] = await Promise.all([
          galleryRes.json(),
          galleryRootRes.json(),
        ]);

        setGalleryData(fetchedGalleryData);
        setGalleryRoot(galleryRootData.galleryRoot);

        const allItems = fetchedGalleryData.all.flatMap((
          group: GroupedGallery,
        ) =>
          group.media.filter((item: GalleryItem) => {
            if (mediaType !== "all") {
              const isVideo = item.name.endsWith(".mp4");
              if (mediaType === "video" && !isVideo) return false;
              if (mediaType === "image" && isVideo) return false;
            }
            if (
              onlyWithPrompt &&
              (!item.metadata?.prompt || item.metadata.prompt.trim() === "")
            ) {
              return false;
            }
            return true;
          })
        );
        setAllMediaItems(allItems);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error
          ? err.message
          : "An unknown error occurred.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    doFetch();
  }, [
    showHidden,
    selectedFolders,
    refreshKey,
    mediaType,
    onlyWithPrompt,
    model,
  ]);

  const updateBatchMetadata = useCallback(
    (
      mediaIds: string[],
      metadataUpdate: { modelId?: number; loraId?: number },
    ) => {
      const updateItem = (item: GalleryItem) => {
        if (!mediaIds.includes(item.relativePath)) {
          return item;
        }
        const newMetadata = { ...item.metadata };
        if (metadataUpdate.modelId !== undefined) {
          newMetadata.modelId = metadataUpdate.modelId;
        }
        if (metadataUpdate.loraId !== undefined) {
          const newLoras = new Set(newMetadata.loras || []);
          newLoras.add(metadataUpdate.loraId);
          newMetadata.loras = Array.from(newLoras);
        }
        return { ...item, metadata: newMetadata };
      };

      const newAll = galleryData.all.map((group) => ({
        ...group,
        media: group.media.map(updateItem),
      }));

      const newStarred = galleryData.starred.map(updateItem);

      setGalleryData({ starred: newStarred, all: newAll });
    },
    [galleryData],
  );

  const clearFilters = () => {
    setSelectedFolders([]);
    setSearchTerm("");
    setMediaType("all");
    setModel("all");
    setShowHidden(false);
    setOnlyWithPrompt(false);
    setSelectedItems([]);
  };

  const refreshData = () => {
    setRefreshKey((prevKey) => prevKey + 1);
  };

  return (
    <FilterContext.Provider
      value={{
        selectedFolders,
        setSelectedFolders,
        searchTerm,
        setSearchTerm,
        mediaType,
        setMediaType,
        model,
        setModel,
        showHidden,
        setShowHidden,
        onlyWithPrompt,
        setOnlyWithPrompt,
        galleryRoot,
        setGalleryRoot,
        isOverlayOpen,
        setIsOverlayOpen,
        selectedItems,
        setSelectedItems,
        lastSelectedItem,
        setLastSelectedItem,
        allMediaItems,
        setAllMediaItems,
        galleryData,
        setGalleryData,
        loading,
        error,
        updateBatchMetadata,
        clearFilters,
        refreshKey,
        refreshData,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return context;
}
