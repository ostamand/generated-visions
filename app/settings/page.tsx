"use client";

import styles from "./page.module.scss";
import { useEffect, useState } from "react";
import {
  Folder,
  Loader2,
  Settings as SettingsIcon,
  Trash2,
  X,
} from "lucide-react";
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
import { ApiKey } from "@/lib/settings";
import { InputWithCopy } from "@/components/ui/input-with-copy";
import { toast } from "sonner";

type Settings = {
  imagePath?: string;
  user_access_token?: string;
  api_keys?: ApiKey[];
};

const SettingsPage = () => {
  const [env, setEnv] = useState<"unknown" | "electron" | "web">("unknown");
  const [pathInput, setPathInput] = useState("");
  const [currentSettings, setCurrentSettings] = useState<Settings>({});
  const [isChanging, setIsChanging] = useState(false);
  const [newTokenKey, setNewTokenKey] = useState("");
  const { isDemoMode } = useDemo();

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
      .then((data) => {
        setCurrentSettings(data);
      });
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

  const handleSaveToken = async () => {
    if (isDemoMode) {
      toast.info("This feature is disabled in demo mode.");
      return;
    }

    if (!newTokenKey.trim()) {
      toast.error("Please enter an API Key.");
      return;
    }

    try {
      // Clear api_keys and set user_access_token
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_access_token: newTokenKey,
          api_keys: []
        }),
      });

      if (!response.ok) throw new Error("Failed to save API Key");

      setCurrentSettings({
        ...currentSettings,
        user_access_token: newTokenKey,
        api_keys: []
      });
      setNewTokenKey("");
      toast.success("API Key saved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save API key.");
    }
  };

  const handleClearToken = async () => {
    if (isDemoMode) {
      toast.info("This feature is disabled in demo mode.");
      return;
    }
    if (!confirm("Are you sure you want to remove the API Key?")) return;

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_access_token: "", api_keys: [] }),
      });

      if (!response.ok) throw new Error("Failed to clear settings");

      setCurrentSettings({ ...currentSettings, user_access_token: "", api_keys: [] });
      toast.success("API Key cleared successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to clear API key.");
    }
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
          <h1>General Settings</h1>
        </header>
        <div className={styles.settingsGrid}>
          <div className={styles.gridColumn}>
            <Card className="bg-transparent border-neutral-800">
              <CardHeader>
                <CardTitle className={styles.cardTitle}>API Key</CardTitle>
                <CardDescription className={styles.cardDescription}>
                  Manage the API key available for external access.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DemoGuard>
                  <div className="space-y-4">
                    {currentSettings.user_access_token ? (
                      <div className="space-y-2">
                        <div className={styles.label}>Current API Key</div>
                        <div className="flex items-center gap-2">
                          <InputWithCopy
                            valueToCopy={currentSettings.user_access_token}
                            value={currentSettings.user_access_token} // Show full key as requested for copy/paste convenience
                            className="font-mono flex-1"
                            type="password" // Mask it but allow copy
                          />
                          <Button variant="ghost" size="icon" onClick={handleClearToken} className="text-red-500 hover:text-red-700 hover:bg-red-100">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-500 italic py-2">
                        No API key set.
                      </div>
                    )}

                    <div className="space-y-2 pt-4 border-t border-neutral-800">
                      <div className={styles.label}>{currentSettings.user_access_token ? "Update API Key" : "Set API Key"}</div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Paste your API Key here..."
                          value={newTokenKey}
                          onChange={(e) => setNewTokenKey(e.target.value)}
                          type="password"
                          className="flex-1"
                        />
                        <Button onClick={handleSaveToken} disabled={isDemoMode}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                </DemoGuard>
              </CardContent>
            </Card>
            <Card className="bg-transparent border-neutral-800">
              <CardHeader>
                <CardTitle className={styles.cardTitle}>Image Folder</CardTitle>
                <CardDescription className={styles.cardDescription}>
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
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setIsChanging(true)}
                            variant="secondary"
                          >
                            Change Folder
                          </Button>
                        </div>
                        <FolderHistory onSelectPath={handleHistorySelect} />
                      </>
                    )}
                </DemoGuard>
              </CardContent>
            </Card>
          </div>
          <div className={styles.gridColumn}>
            <Card className="bg-transparent border-neutral-800">
              <CardHeader>
                <CardTitle className={styles.cardTitle}>Models</CardTitle>
                <CardDescription className={styles.cardDescription}>
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
            <Card className="bg-transparent border-neutral-800">
              <CardHeader>
                <CardTitle className={styles.cardTitle}>LoRAs</CardTitle>
                <CardDescription className={styles.cardDescription}>
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
