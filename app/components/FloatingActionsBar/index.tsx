"use client";

import { useState } from "react";
import { useFilter } from "@/app/contexts/FilterContext";
import styles from "./style.module.scss";
import { Button } from "@/components/ui/button";
import { Download, Tags, X } from "lucide-react";
import SelectionModal from "../SelectionModal";
import { useDemo } from "@/app/contexts/DemoContext";
import { toast } from "sonner";

type ModalType = "model" | "lora";

interface ModalState {
  isOpen: boolean;
  type: ModalType | null;
  title: string;
  options: { value: number; label: string }[];
}

export default function FloatingActionsBar() {
  const { selectedItems, setSelectedItems, updateBatchMetadata } = useFilter();
  const [isLoading, setIsLoading] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: null,
    title: "",
    options: [],
  });
  const { isDemoMode } = useDemo();

  if (selectedItems.length === 0) {
    return null;
  }

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/batch-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: selectedItems }),
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "generated-visions-download.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = async (type: ModalType) => {
    setIsLoading(true);
    const title = type === "model" ? "Model" : "LoRA";
    try {
      const res = await fetch(`/api/${type}s`);
      if (!res.ok) throw new Error(`Failed to fetch ${type}s`);
      const data = await res.json();
      setModalState({
        isOpen: true,
        type,
        title,
        options: data.map((item: { id: number; name: string }) => ({
          value: item.id,
          label: item.name,
        })),
      });
    } catch (error) {
      console.error(`Error fetching ${type}s:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyClick = (type: ModalType) => {
    if (isDemoMode) {
      toast.info("This feature is disabled in demo mode.");
      return;
    }
    openModal(type);
  };

  const handleModalSelect = async (selectedValueId: number) => {
    if (!modalState.type) return;

    const updateKey = modalState.type === "model" ? "modelId" : "loraId";
    updateBatchMetadata(selectedItems, { [updateKey]: selectedValueId });

    const selectedName = modalState.options.find(
      (o) => o.value === selectedValueId,
    )?.label;
    if (!selectedName) return;

    try {
      await fetch("/api/batch-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaIds: selectedItems,
          metadata: { [modalState.type]: selectedName },
        }),
      });
      setSelectedItems([]);
    } catch (error) {
      console.error("Error applying metadata in background:", error);
      // Here we might want to add logic to revert the optimistic update on failure
    }
  };

  return (
    <>
      <div className={styles.floatingBar}>
        <div className={styles.leftContent}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeselectAll}
            className={styles.deselectButton}
          >
            <X />
          </Button>
          <span className={styles.count}>{selectedItems.length} selected</span>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={handleDownload} disabled={isLoading}>
            <Download className={styles.icon} />
            {isLoading ? "Downloading..." : "Download"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleApplyClick("model")}
            disabled={isLoading || isDemoMode}
          >
            <Tags className={styles.icon} />
            Apply Model
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleApplyClick("lora")}
            disabled={isLoading || isDemoMode}
          >
            <Tags className={styles.icon} />
            Apply LoRA
          </Button>
        </div>
      </div>
      <SelectionModal
        isOpen={modalState.isOpen}
        setIsOpen={(isOpen) => setModalState((prev) => ({ ...prev, isOpen }))}
        title={modalState.title}
        options={modalState.options}
        onSelect={handleModalSelect}
      />
    </>
  );
}
