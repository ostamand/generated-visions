export interface GalleryFile {
  type: "file";
  name: string;
  relativePath: string;
  metadata?: unknown;
}

export interface GalleryFolder {
  type: "folder";
  name: string;
  relativePath: string;
  children: GalleryItem[];
}

export type GalleryItem = GalleryFile | GalleryFolder;
