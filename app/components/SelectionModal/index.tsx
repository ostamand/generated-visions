"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "../SearchableSelect";
import styles from "./style.module.scss";

interface SelectionModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: string;
  options: { value: number; label: string }[];
  onSelect: (selectedValue: number) => void;
}

export default function SelectionModal({
  isOpen,
  setIsOpen,
  title,
  options,
  onSelect,
}: SelectionModalProps) {
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  const handleConfirm = () => {
    if (selectedValue !== null) {
      onSelect(selectedValue);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="dark">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select an item to apply to all selected media.
          </DialogDescription>
        </DialogHeader>
        <div className={styles.selectContainer}>
          <SearchableSelect
            options={options}
            value={selectedValue || ""}
            onChange={(val) => setSelectedValue(val as number)}
            placeholder={`Select a ${title.toLowerCase()}...`}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedValue === null}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
