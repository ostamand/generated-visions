"use client";

import styles from "./page.module.scss";
import { useEffect, useState } from "react";
import { Folder, Loader2, Settings as SettingsIcon, X } from "lucide-react";
import { useFolderSelection } from "../hooks/useFolderSelection";
import { FolderHistory } from "../components/FolderHistory";
import { DataManager } from "../components/DataManager";
import { DemoGuard } from "../components/DemoGuard";
import { useDemo } from "../contexts/DemoContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Settings = {
  imagePath?: string;
};

const SettingsPage = () => {
  const [env, setEnv] = useState<"unknown" | "electron" | "web">("unknown");
  const [pathInput, setPathInput] = useState("");
  const [currentSettings, setCurrentSettings] = useState<Settings>({});
  const [isChanging, setIsChanging] = useState(false);
  const {} = useDemo();

  const {
    analysis,
    isLoading,
    error,
    analyzePath,
    confirmSelection,
    cancelSelection: baseCancelSelection,
  } = useFolderSelection();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv(window.electron?.isElectron ? "electron" : "web");
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setCurrentSettings(data));
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

  const cancelSelection = () => {
    baseCancelSelection();
    setIsChanging(false);
  };

  const handleHistorySelect = (path: string) => {
    analyzePath(path);
    setIsChanging(true);
  };

  const renderChangeFolderUI = () => {
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
          <Button onClick={cancelSelection}>Try Again</Button>
        </div>
      );
    }

    if (analysis) {
      return (
        <div className={styles.analysisResult}>
          <h4>New Folder Summary</h4>
          <p className={styles.pathPreview}>{analysis.path}</p>
          <ul>
            {Object.entries(analysis.mediaTypes).map(([type, count]) => (
              <li key={type}>
                <span>{type.toUpperCase()}:</span> <span>{count}</span>
              </li>
            ))}
            <li className={styles.total}>
              <span>Total Media:</span> <span>{analysis.totalCount}</span>
            </li>
          </ul>
          <div className={styles.buttonGroup}>
            <Button onClick={confirmSelection}>Confirm & Save</Button>
            <Button onClick={cancelSelection} variant="secondary">
              <X className={styles.icon} /> Cancel
            </Button>
          </div>
        </div>
      );
    }

    if (env === "electron") {
      return (
        <Button onClick={handleSelectFolder}>
          <Folder className={styles.icon} /> Select New Folder
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
            placeholder="Paste the new absolute path"
          />
          <Button type="submit">Use Path</Button>
        </form>
      );
    }
    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.navColumn}>
        <div className={styles.sidebarHeader}>
          <h2>Settings</h2>
        </div>
        <nav>
          <ul>
            <li className={styles.active}>
              <SettingsIcon className={styles.icon} /> General
            </li>
          </ul>
        </nav>
      </div>

      <div className={styles.contentColumn}>
        <header className={styles.contentHeader}>
          <h1 className="text-2xl font-bold tracking-tight">
            General Settings
          </h1>
        </header>
        <div className={styles.settingsGrid}>
          <div className={styles.gridColumn}>
            <Card>
              <CardHeader>
                <CardTitle>Image Folder</CardTitle>
                <CardDescription>
                  This is the primary folder where your media is stored.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DemoGuard>
                  {isChanging
                    ? (
                      renderChangeFolderUI()
                    )
                    : (
                      <>
                        <div className={styles.pathDisplay}>
                          {currentSettings.imagePath || "No folder selected."}
                        </div>
                        <Button onClick={() => setIsChanging(true)}>
                          Change Folder
                        </Button>
                        <FolderHistory onSelectPath={handleHistorySelect} />
                      </>
                    )}
                </DemoGuard>
              </CardContent>
            </Card>
          </div>
          <div className={styles.gridColumn}>
            <Card>
              <CardHeader>
                <CardTitle>Models</CardTitle>
                <CardDescription>
                  Manage the global list of models available for assignment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataManager
                  title="Models"
                  apiEndpoint="/api/models"
                  itemName="Model"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>LoRAs</CardTitle>
                <CardDescription>
                  Manage the global list of LoRAs available for assignment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataManager
                  title="LoRAs"
                  apiEndpoint="/api/loras"
                  itemName="LoRA"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
