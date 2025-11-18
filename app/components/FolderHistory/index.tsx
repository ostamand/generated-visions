"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/time";
import { History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type FolderHistoryItem = {
  path: string;
  last_imported_at: number;
};

type FolderHistoryProps = {
  onSelectPath: (path: string) => void;
};

export const FolderHistory = ({ onSelectPath }: FolderHistoryProps) => {
  const [history, setHistory] = useState<FolderHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/folder-history");
      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }
      const data = await response.json();
      setHistory(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (path: string) => {
    try {
      const response = await fetch("/api/folder-history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete history item.");
      }
      // Refresh history after deletion
      fetchHistory();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  if (error) {
    return <div className="text-destructive mt-4">Error: {error}</div>;
  }

  if (history.length === 0) {
    return null; // Don't render anything if there's no history
  }

  return (
    <div className="mt-8">
      <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4 border-b border-border pb-2">
        <History size={16} /> Recently Used Folders
      </h4>
      <ul className="list-none p-0 flex flex-col gap-2">
        {history.map((item) => (
          <li
            key={item.path}
            className="flex justify-between items-center bg-muted/50 hover:bg-muted/80 transition-colors rounded-lg p-3"
          >
            <div
              className="cursor-pointer flex flex-col gap-1 flex-grow"
              onClick={() => onSelectPath(item.path)}
            >
              <span className="font-mono text-sm text-foreground">
                {item.path}
              </span>
              <span className="text-xs text-muted-foreground">
                {timeAgo(item.last_imported_at)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(item.path)}
              className="size-8 flex-shrink-0"
            >
              <Trash2 size={16} />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
