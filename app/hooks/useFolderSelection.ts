"use client";

import { useState } from "react";

declare global {
  interface Window {
    electron?: {
      isElectron: boolean;
      openFolder: () => Promise<string | null>;
    };
  }
}

export type AnalysisResult = {
  path: string;
  mediaTypes: Record<string, number>;
  totalCount: number;
};

export const useFolderSelection = () => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzePath = async (path: string) => {
    if (!path) return;
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const response = await fetch("/api/analyze-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!response.ok) {
        const { error: responseError } = await response.json();
        throw new Error(responseError || "Failed to analyze folder.");
      }
      const result = await response.json();
      setAnalysis(result);
    } catch (e: unknown) {
      let errorMessage = "An unknown error occurred.";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSelection = async () => {
    if (!analysis) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: analysis.path }),
      });
      if (!response.ok) {
        throw new Error("Failed to save settings.");
      }
      // Instead of router.push, we can just reload or let the caller decide
      // For now, let's make it refresh the page to apply settings.
      window.location.href = "/";
    } catch (e: unknown) {
      let errorMessage = "An unknown error occurred.";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      setError(errorMessage);
      setIsLoading(false); // only stop loading on error
    }
  };

  const cancelSelection = () => {
    setAnalysis(null);
    setError(null);
  };

  return {
    analysis,
    isLoading,
    error,
    analyzePath,
    confirmSelection,
    cancelSelection,
  };
};
