"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useFilter } from "../contexts/FilterContext";
import Gallery from "./Gallery";
import { Loader } from "./Loader";

export default function GalleryFetcher() {
  const {
    galleryData,
    setGalleryData,
    loading,
    error,
    isOverlayOpen,
    refreshData,
  } = useFilter();

  const scrollPositionRef = useRef<number>(0);

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

      if (event.key === "r" && !isOverlayOpen) {
        // Save scroll position before refreshing
        scrollPositionRef.current = window.scrollY;
        refreshData();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [refreshData, isOverlayOpen]);

  useLayoutEffect(() => {
    // Restore scroll position after data has loaded
    if (!loading) {
      window.scrollTo(0, scrollPositionRef.current);
    }
  }, [loading]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!galleryData) {
    return <div>No gallery data available.</div>;
  }

  return <Gallery galleryData={galleryData} setGalleryData={setGalleryData} />;
}
