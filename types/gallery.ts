import { ImageMetadata } from "@/lib/database";

export interface GalleryItem {
  type: "file";
  name: string;
  relativePath: string;
  metadata: ImageMetadata;
  width?: number;
  height?: number;
  modified_at?: number;
  is_shared: boolean;
  share_id: string | null;
}

export interface GroupedGallery {
  folderPath: string;
  folderName: string;
  media: GalleryItem[];
}

export interface GalleryResponse {
  starred: GalleryItem[];
  all: GroupedGallery[];
}

export type Comment = {
  id: number;
  media_path: string;
  text: string;
  created_at: number;
  updated_at: number;
};
