"use client";

import Image from "next/image";
import { useInView } from "react-intersection-observer";
import { GalleryItem as GalleryItemType } from "../../../types/gallery";
import {
  Check,
  ClipboardCopy,
  EllipsisVertical,
  Eye,
  EyeOff,
  Maximize,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./style.module.scss";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GalleryItemProps {
  file: GalleryItemType;
  index: number;
  selectedItems: string[];
  hoveredItem: string | null;
  onItemSelect: (item: GalleryItemType, event: React.MouseEvent) => void;
  onOpenFullscreen: (media: GalleryItemType) => void;
  onUpdateMetadata: (
    relativePath: string,
    updates: { hidden?: boolean; starred?: boolean },
  ) => void;
  onHover: (relativePath: string | null) => void;
  onCopyFolderPath: (relativePath: string) => void;
}

export default function GalleryItem({
  file,
  index,
  selectedItems,
  hoveredItem,
  onItemSelect,
  onOpenFullscreen,
  onUpdateMetadata,
  onHover,
  onCopyFolderPath,
}: GalleryItemProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px",
  });

  const isVideo = file.name.endsWith(".mp4");
  const fullSrc = `/api/image?path=${encodeURIComponent(file.relativePath)}`;
  const thumbnailSrc = isVideo ? fullSrc : `${fullSrc}&thumbnail=true`;
  const isStarred = file.metadata?.starred || false;
  const isHidden = file.metadata?.hidden || false;
  const aspectRatio = file.width && file.height ? file.width / file.height : 1;
  const isSelected = selectedItems.includes(file.relativePath);
  const isHovered = hoveredItem === file.relativePath;

  return (
    <div
      ref={ref}
      key={file.relativePath}
      className={`${styles.galleryItem} ${isHidden ? styles.isHidden : ""} ${
        isSelected ? styles.selected : ""
      }`}
      style={{ "--animation-delay": `${index * 50}ms` } as React.CSSProperties}
      onMouseEnter={() => onHover(file.relativePath)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => onItemSelect(file, e)}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (e.shiftKey) {
            onItemSelect(file, e);
          } else {
            onOpenFullscreen(file);
          }
        }}
        className={styles.mediaWrapper}
      >
        {inView
          ? (
            <>
              {isHidden && <Eye className={styles.hiddenIcon} />}
              {isVideo
                ? (
                  <video
                    src={thumbnailSrc}
                    autoPlay
                    loop
                    muted
                    className={styles.videoPlayer}
                    style={{ aspectRatio }}
                  />
                )
                : (
                  <div style={{ aspectRatio }} className={styles.imageWrapper}>
                    <Image
                      unoptimized
                      src={thumbnailSrc}
                      alt={file.name}
                      fill
                      className={styles.image}
                    />
                  </div>
                )}
            </>
          )
          : <div style={{ aspectRatio }} className={styles.placeholder} />}
      </div>
      <div
        className={`${styles.selectionIndicator} ${
          (isHovered || isSelected) && styles.visible
        }`}
        onClick={(e) => onItemSelect(file, e)}
      >
        {isSelected && <Check size={16} />}
      </div>
      <div className={styles.dropdownContainer}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={styles.dropdownTriggerButton}
              onClick={(e) => e.stopPropagation()}
            >
              <EllipsisVertical className={styles.dropdownIcon} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="dark"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem onSelect={() => onOpenFullscreen(file)}>
              <Maximize className={styles.icon} />
              <span>View Details</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onCopyFolderPath(file.relativePath)}
            >
              <ClipboardCopy className={styles.icon} />
              <span>Copy Folder Path</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                onUpdateMetadata(file.relativePath, {
                  starred: !isStarred,
                })}
            >
              <Star
                className={`${styles.starIcon} ${
                  isStarred ? styles.starIconStarred : ""
                }`}
              />
              <span>{isStarred ? "Unstar" : "Star"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                onUpdateMetadata(file.relativePath, {
                  hidden: !isHidden,
                })}
            >
              {isHidden
                ? <Eye className={styles.icon} />
                : <EyeOff className={styles.icon} />}
              <span>{isHidden ? "Unhide" : "Hide"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
