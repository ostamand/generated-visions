"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useDemo } from "../../contexts/DemoContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DataManagerProps {
  title: string;
  apiEndpoint: string;
  itemName: string;
}

interface DataItem {
  id: number;
  name: string;
}

export const DataManager: React.FC<DataManagerProps> = ({
  title,
  apiEndpoint,
  itemName,
}) => {
  const [items, setItems] = useState<DataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { isDemoMode } = useDemo();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${itemName}s`);
      }
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `An unknown error occurred.`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, itemName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode) {
      toast.info("This feature is disabled in demo mode.");
      return;
    }
    if (!newItemName.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newItemName }),
      });
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || `Failed to add ${itemName}`);
      }
      setNewItemName("");
      await fetchData(); // Refresh list
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `An unknown error occurred while adding ${itemName}.`,
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteItem = async (name: string) => {
    if (isDemoMode) {
      toast.info("This feature is disabled in demo mode.");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete this ${itemName}? This will remove its association from all media.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${apiEndpoint}?name=${name}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || `Failed to delete ${itemName}`);
      }
      await fetchData(); // Refresh list
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `An unknown error occurred while deleting ${itemName}.`,
      );
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {isLoading && <Loader2 className="animate-spin mx-auto my-4" />}
      {error && (
        <div className="bg-destructive/10 text-destructive-foreground p-3 border border-destructive/20 rounded-md my-4 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      {!isLoading && !error && (
        <ul className="mt-2 list-none p-0 max-h-52 overflow-y-auto bg-background rounded-md border border-border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex justify-between items-center p-2 border-b border-border last:border-b-0"
            >
              <span className="text-sm">{item.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteItem(item.name)}
                disabled={isDemoMode}
                className="size-8"
              >
                <Trash2 size={16} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAddItem} className="flex gap-2 mt-4">
        <Input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder={`New ${itemName} name`}
          disabled={isAdding || isDemoMode}
        />
        <Button
          type="submit"
          disabled={isAdding || isDemoMode}
          className="w-24"
        >
          {isAdding
            ? <Loader2 className="animate-spin" size={16} />
            : <Plus size={16} className="mr-1" />}
          Add
        </Button>
      </form>
    </div>
  );
};
