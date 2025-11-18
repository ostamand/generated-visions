"use client";

import { useCallback, useEffect, useState } from "react";

interface UseResizableProps {
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  localStorageKey?: string;
}

export const useResizable = ({
  initialWidth,
  minWidth = 100,
  maxWidth = 500,
  localStorageKey,
}: UseResizableProps) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  // Load width from localStorage on mount
  useEffect(() => {
    if (localStorageKey) {
      const savedWidth = localStorage.getItem(localStorageKey);
      if (savedWidth !== null) { // Only use savedWidth if it exists
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWidth(Number(savedWidth));
      } else {
        setWidth(initialWidth);
      }
    } else {
      setWidth(initialWidth);
    }
  }, [localStorageKey, initialWidth]);

  // Save width to localStorage when it changes
  useEffect(() => {
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, width.toString());
    }
  }, [width, localStorageKey]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
      }
    },
    [isResizing, minWidth, maxWidth],
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return { width, startResizing, stopResizing, isResizing };
};
