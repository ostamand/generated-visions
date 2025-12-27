"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./style.module.scss";
import { GalleryItem } from "@/types/gallery";
import EditableField from "@/app/components/EditableField";
import { SearchableSelect } from "@/app/components/SearchableSelect";
import CommentSection from "@/app/components/CommentSection";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { ImageMetadata } from "@/lib/database";
import { formatTimestamp } from "@/lib/time";
import { DemoGuard } from "@/app/components/DemoGuard";
import { useDemo } from "@/app/contexts/DemoContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { InputWithCopy } from "../ui/input-with-copy";

interface Model {
  id: number;
  name: string;
}

interface Lora {
  id: number;
  name: string;
}

interface FullscreenMediaViewerProps {
  media: GalleryItem;
  mediaList: GalleryItem[];
  onSelectItem: (item: GalleryItem) => void;
  onClose: () => void;
  onMetadataChange: (
    relativePath: string,
    updates: Partial<ImageMetadata>,
  ) => void;
  onUpdateMetadata: (
    relativePath: string,
    updates: { hidden?: boolean; starred?: boolean },
  ) => void;
  onMediaDeleted: (relativePath: string) => void; // NEW PROP
}

const imageLoader = ({ src }: { src: string }) => {
  return src;
};

const FullscreenMediaViewer: React.FC<FullscreenMediaViewerProps> = ({
  media,
  mediaList,
  onSelectItem,
  onClose,
  onMetadataChange,
  onUpdateMetadata,
  onMediaDeleted,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [displayMetadata, setDisplayMetadata] = useState<ImageMetadata>(
    media.metadata,
  );
  const [models, setModels] = useState<{ value: number; label: string }[]>([]);
  const [loras, setLoras] = useState<{ value: number; label: string }[]>([]);
  const { isDemoMode } = useDemo();
  const [isSharing, setIsSharing] = useState(false);
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [fileTooLarge, setFileTooLarge] = useState(false);

  // make sure media is still shared
  useEffect(() => {
    setLimitExceeded(false);
    setFileTooLarge(false);
    if (!media.metadata.share_id) return;
    fetch(
      `/api/web/medias?filename=${media.metadata.share_id}`,
    ).then(async (response) => {
      // not shared anymore, let's remove
      if (!response.ok) {
        await handleSaveMetadata({
          is_shared: false,
          share_id: null,
        });
        setDisplayMetadata({
          ...displayMetadata,
          is_shared: false,
          share_id: null,
        });
      }
    });
  }, [media]);

  // set display metadata for edits
  useEffect(() => {
    setDisplayMetadata(media.metadata);
  }, [media.metadata]);

  // fetch models and loras on init
  useEffect(() => {
    const fetchModelsAndLoras = async () => {
      try {
        const [modelsRes, lorasRes] = await Promise.all([
          fetch("/api/models"),
          fetch("/api/loras"),
        ]);
        const modelsData = await modelsRes.json();
        const lorasData = await lorasRes.json();
        setModels(
          modelsData.map((m: Model) => ({ value: m.id, label: m.name })),
        );
        setLoras(lorasData.map((l: Lora) => ({ value: l.id, label: l.name })));
      } catch (error) {
        console.error("Failed to fetch models or loras", error);
      }
    };
    fetchModelsAndLoras();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        const currentIndex = mediaList.findIndex(
          (item) => item.relativePath === media.relativePath,
        );
        const nextIndex = (currentIndex + 1) % mediaList.length;
        onSelectItem(mediaList[nextIndex]);
      } else if (event.key === "ArrowLeft") {
        const currentIndex = mediaList.findIndex(
          (item) => item.relativePath === media.relativePath,
        );
        const prevIndex = (currentIndex - 1 + mediaList.length) %
          mediaList.length;
        onSelectItem(mediaList[prevIndex]);
      } else if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [media, mediaList, onSelectItem, onClose]);

  const optimizedSrc = `/api/image?path=${encodeURIComponent(
    media.relativePath,
  )
    }&w=2048&h=2048`;

  const originalSrc = `/api/image?path=${encodeURIComponent(
    media.relativePath,
  )
    }`;

  const isVideo = media.relativePath.endsWith(".mp4");

  const handleSaveMetadata = async (updates: Partial<ImageMetadata>) => {
    if (isDemoMode) {
      toast.info("This feature is disabled in demo mode.");
      return;
    }
    const originalMetadata = displayMetadata;
    setDisplayMetadata((prev) => ({ ...prev, ...updates }));

    try {
      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imagePath: media.relativePath,
          ...updates,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save metadata");
      }
      onMetadataChange(media.relativePath, updates);
    } catch (error) {
      console.error("Error saving metadata:", error);
      setDisplayMetadata(originalMetadata); // Revert on error
    }
  };

  const handleShareToggle = async (is_shared: boolean) => {
    if (is_shared && !displayMetadata.share_id) {
      setIsSharing(true);
      setLimitExceeded(false);
      setFileTooLarge(false);
      try {
        const { prompt, title, width, height, modelId, loras: lorasId } =
          displayMetadata;

        const selectedModel = models.find((model) => model.value === modelId);
        const mediaModel = selectedModel ? selectedModel.label : "";

        const selectedLoras = loras.filter((lora) =>
          lorasId?.includes(lora.value)
        );

        const mediaLoras = selectedLoras
          ? selectedLoras.map((lora) => lora.label)
          : "";

        const payload = {
          prompt,
          title,
          width,
          height,
          model: mediaModel,
          loras: mediaLoras,
          createdAt: media.modified_at,
        };

        const response = await fetch(
          `/api/web/medias?path=${media.relativePath}`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          if (data.code === "ABOVE_MONTLY_LIMIT") {
            setLimitExceeded(true);
          } else if (data.code === "FILE_TOO_LARGE") {
            setFileTooLarge(true);
          }
          toast.error(
            data.message,
          );
          return;
        }

        await handleSaveMetadata({
          is_shared: true,
          share_id: data.uniqueName,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setIsSharing(false); // STOP loading
      }
    } else {
      await handleSaveMetadata({ is_shared });
    }
  };

  const handleTogglePanel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPanelOpen(!isPanelOpen);
  };

  const handleDelete = async () => {
    if (isDemoMode) {
      toast.info("This feature is disabled in demo mode.");
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to delete "${media.name}"? This action cannot be undone.`,
      )
    ) {
      try {
        const response = await fetch("/api/media", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            relativePath: media.relativePath,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete media");
        }

        onMediaDeleted(media.relativePath);
      } catch (error) {
        console.error("Error deleting media:", error);
      }
    }
  };

  return (
    <div className={styles.fullscreenOverlay} onClick={onClose}>
      <div
        className={styles.mainContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleTogglePanel}
          className={`${styles.toggleButton} ${isPanelOpen ? styles.open : ""}`}
        >
          {isPanelOpen ? <ChevronLeft /> : <ChevronRight />}
        </Button>
        <div
          className={`${styles.panelWrapper} ${isPanelOpen ? styles.open : ""}`}
        >
          <div className={styles.panelHeader}>
            <h3>Details</h3>
          </div>
          <div className={styles.panelContent}>
            <Card className="bg-transparent border-neutral-800">
              <CardHeader>
                <CardTitle className={styles.cardTitle}>Sharing</CardTitle>
              </CardHeader>
              <CardContent className={styles.sharingCardContent}>
                {isSharing
                  ? (
                    <div className={styles.sharingLoaderContent}>
                      <div className={styles.cardLoader}></div>
                      <p>Uploading...</p>
                    </div>
                  )
                  : (
                    <>
                      <div className={styles.shareControl}>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="share-toggle"
                            checked={!!displayMetadata.is_shared}
                            onCheckedChange={handleShareToggle}
                            disabled={isDemoMode}
                          />
                          <label htmlFor="share-toggle">Share this media</label>
                        </div>
                      </div>
                      {limitExceeded && (
                        <div className={styles.limitExceeded}>
                          <p>Monthly upload limit exceeded.</p>
                          <a
                            href={`${process.env.NEXT_PUBLIC_GENERATED_VISIONS_WEB}/app/settings/usage`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View usage details
                          </a>
                        </div>
                      )}
                      {fileTooLarge && (
                        <div className={styles.limitExceeded}>
                          <p>File is too large to be shared.</p>
                        </div>
                      )}
                      {displayMetadata.is_shared && displayMetadata.share_id &&
                        (
                          <div className="mt-4 w-full">
                            <InputWithCopy
                              valueToCopy={`${process.env.NEXT_PUBLIC_GENERATED_VISIONS_WEB}/medias/${displayMetadata.share_id}`}
                              value={`${process.env.NEXT_PUBLIC_GENERATED_VISIONS_WEB}/medias/${displayMetadata.share_id}`}
                              tooltip={`${process.env.NEXT_PUBLIC_GENERATED_VISIONS_WEB}/medias/${displayMetadata.share_id}`}
                              onClick={() =>
                                window.open(
                                  `${process.env.NEXT_PUBLIC_GENERATED_VISIONS_WEB}/medias/${displayMetadata.share_id}`,
                                  "_blank",
                                )}
                              inputClassName="cursor-pointer"
                            />
                          </div>
                        )}
                    </>
                  )}
              </CardContent>
            </Card>
            <Card className="bg-transparent border-neutral-800">
              <CardHeader>
                <CardTitle className={styles.cardTitle}>File Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.metadataField}>
                  <label className={styles.metadataLabel}>File Name:</label>
                  <span className={styles.metadataValue}>{media.name}</span>
                </div>
                {media.modified_at && (
                  <div className={styles.metadataField}>
                    <label className={styles.metadataLabel}>Created:</label>
                    <span className={styles.metadataValue}>
                      {formatTimestamp(media.modified_at)}
                    </span>
                  </div>
                )}
                {media.width && media.height && (
                  <div className={styles.metadataField}>
                    <label className={styles.metadataLabel}>Dimensions:</label>
                    <span className={styles.metadataValue}>
                      {media.width} x {media.height}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-transparent border-neutral-800">
              <CardHeader>
                <CardTitle className={styles.cardTitle}>Generation Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.metadataField}>
                  <label className={styles.metadataLabel}>Model:</label>
                  <DemoGuard>
                    <SearchableSelect<number>
                      options={models}
                      value={displayMetadata.modelId || 0}
                      onChange={(modelId) =>
                        handleSaveMetadata({ modelId: modelId as number })}
                      placeholder="Select a model..."
                    />
                  </DemoGuard>
                </div>
                <div className={styles.metadataField}>
                  <label className={styles.metadataLabel}>LoRAs:</label>
                  <DemoGuard>
                    <SearchableSelect<number>
                      options={loras}
                      value={displayMetadata.loras || []}
                      onChange={(loras) =>
                        handleSaveMetadata({ loras: loras as number[] })}
                      placeholder="Select LoRAs..."
                      isMulti
                    />
                  </DemoGuard>
                </div>
                <DemoGuard>
                  <EditableField
                    label="Title"
                    initialText={displayMetadata.title || ""}
                    placeholder="Enter a title..."
                    onSave={(newTitle) =>
                      handleSaveMetadata({ title: newTitle })}
                  />
                </DemoGuard>
                <DemoGuard clickableClass="allow-demo-click">
                  <EditableField
                    label="Prompt"
                    initialText={displayMetadata.prompt || ""}
                    placeholder="Enter a prompt..."
                    onSave={(newPrompt) =>
                      handleSaveMetadata({ prompt: newPrompt })}
                    isMultiline={true}
                    showMoreClass="allow-demo-click"
                  />
                </DemoGuard>
              </CardContent>
            </Card>
            <Card className="bg-transparent border-neutral-800">
              <CardHeader>
                <CardTitle className={styles.cardTitle}>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <DemoGuard>
                  <CommentSection mediaPath={media.relativePath} />
                </DemoGuard>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className={styles.mediaWrapper}>
          {isVideo
            ? (
              <video
                src={originalSrc}
                controls
                autoPlay
                className={styles.videoPlayer}
              />
            )
            : (
              <Image
                loader={imageLoader}
                src={optimizedSrc}
                alt="Fullscreen"
                fill
                style={{ objectFit: "contain" }}
              />
            )}
        </div>
        <div className={styles.actionsToolbar}>
          <DemoGuard>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                onUpdateMetadata(media.relativePath, {
                  starred: !media.metadata.starred,
                })}
            >
              <Star
                size={20}
                className={media.metadata.starred ? styles.starIconStarred : ""}
              />
            </Button>
          </DemoGuard>
          <DemoGuard>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                onUpdateMetadata(media.relativePath, {
                  hidden: !media.metadata.hidden,
                })}
            >
              {media.metadata.hidden
                ? <Eye size={20} className={styles.hiddenIconActive} />
                : <EyeOff size={20} />}
            </Button>
          </DemoGuard>
          <a
            href={originalSrc}
            download={media.name}
            className={styles.toolbarButton}
          >
            <Download size={20} />
          </a>
          <DemoGuard>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className={styles.deleteButtonRed}
            >
              <Trash2 size={20} />
            </Button>
          </DemoGuard>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className={styles.closeButton}
      >
        <X />
      </Button>
    </div>
  );
};

export default FullscreenMediaViewer;
