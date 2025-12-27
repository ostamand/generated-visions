"use client";

import { useEffect, useState } from "react";
import styles from "./style.module.scss";
import { Folder, Loader2, X } from "lucide-react";
import { useFolderSelection } from "../hooks/useFolderSelection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const WelcomePage = () => {
  const [env, setEnv] = useState<"unknown" | "electron" | "web">("unknown");
  const [pathInput, setPathInput] = useState("");
  const {
    analysis,
    isLoading,
    error,
    analyzePath,
    confirmSelection,
    cancelSelection,
  } = useFolderSelection();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv(window.electron?.isElectron ? "electron" : "web");
  }, []);

  const handleSelectFolder = async () => {
    if (window.electron?.openFolder) {
      const path = await window.electron.openFolder();
      if (path) {
        analyzePath(path);
      }
    }
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyzePath(pathInput);
  };

  const renderInteractiveContent = () => {
    if (isLoading) {
      return (
        <div className={styles.loader}>
          <Loader2 className={styles.spinner} />
          Analyzing folder...
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorDisplay}>
          <p>Error: {error}</p>
          <Button onClick={cancelSelection} variant="destructive">
            Try Again
          </Button>
        </div>
      );
    }

    if (analysis) {
      return (
        <div className={styles.analysisResult}>
          <h3>Folder Summary</h3>
          <p className={styles.pathPreview}>{analysis.path}</p>
          <ul>
            {Object.entries(analysis.mediaTypes).map(([type, count]) => (
              <li key={type}>
                <span>{type.toUpperCase()}:</span>
                <span>{count}</span>
              </li>
            ))}
            <li className={styles.total}>
              <span>Total Media:</span>
              <span>{analysis.totalCount}</span>
            </li>
          </ul>
          <div className={styles.buttonGroup}>
            <Button onClick={confirmSelection}>
              Confirm & Import
            </Button>
            <Button
              onClick={cancelSelection}
              variant="secondary"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    if (env === "electron") {
      return (
        <Button onClick={handleSelectFolder} className="gap-2">
          <Folder className="w-4 h-4" />
          Select Folder to Get Started
        </Button>
      );
    }

    if (env === "web") {
      return (
        <form onSubmit={handlePathSubmit} className={styles.pathInputWrapper}>
          <Input
            type="text"
            value={pathInput}
            onChange={(e) =>
              setPathInput(e.target.value)}
            placeholder="Paste the absolute path to your media folder"
          />
          <Button type="submit">
            Use Path
          </Button>
        </form>
      );
    }

    return (
      <div className={styles.loader}>
        <Loader2 className={styles.spinner} />
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftColumn}>
        <h1 className={styles.title}>WELCOME TO VISIONS</h1>
        <p className={styles.description}>
          To get started, please select the folder containing your images and
          videos.
        </p>
        <div className={styles.interactiveZone}>
          {renderInteractiveContent()}
        </div>
      </div>
      <div className={styles.rightColumn}>
        <div className={styles.imagePlaceholder} />
      </div>
    </div>
  );
};

export default WelcomePage;