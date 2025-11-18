"use client";

import { useEffect } from "react";
import { useFilter } from "@/app/contexts/FilterContext";

export default function ScrollLock() {
  const { isOverlayOpen } = useFilter();

  useEffect(() => {
    if (isOverlayOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    // Cleanup function to ensure scroll is restored on component unmount
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOverlayOpen]);

  return null;
}
