"use client";

import { useState, useEffect, useMemo } from "react";
import { useFilter } from "@/app/contexts/FilterContext";
import styles from "./style.module.scss";
import { Folder, PanelLeft, PanelRight, Search } from "lucide-react";
import SelectionDisplay from "./SelectionDisplay";
import { useResizable } from "@/app/hooks/useResizable";

interface Folder {
  path: string;
  displayName: string;
}

const FolderSidebar = () => {
  const { selectedFolders, setSelectedFolders } = useFilter();
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { width, startResizing } = useResizable({
    initialWidth: 280,
    minWidth: 220,
    maxWidth: 600,
    localStorageKey: "folder-sidebar-width",
  });

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await fetch("/api/folders");
        if (!response.ok) {
          throw new Error("Failed to fetch folders");
        }
        const data = await response.json();
        setAllFolders(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchFolders();
  }, []);

  const handleFolderToggle = (folderPath: string) => {
    const newSelectedFolders = selectedFolders.includes(folderPath)
      ? selectedFolders.filter((p) => p !== folderPath)
      : [...selectedFolders, folderPath];
    setSelectedFolders(newSelectedFolders);
  };

  const handleClearSelection = () => {
    setSelectedFolders([]);
  };

  const filteredFolders = useMemo(
    () =>
      allFolders.filter((folder) =>
        folder.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [allFolders, searchTerm]
  );

  const selectedFolderObjects = useMemo(
    () => allFolders.filter((folder) => selectedFolders.includes(folder.path)),
    [allFolders, selectedFolders]
  );

  if (isCollapsed) {
    return (
      <div className={`${styles.sidebar} ${styles.collapsed}`}>
        <button
          onClick={() => setIsCollapsed(false)}
          className={styles.toggleButton}
        >
          <PanelRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.sidebar} style={{ width: `${width}px` }}>
      <div className={styles.header}>
        <h2>Folders</h2>
        <button
          onClick={() => setIsCollapsed(true)}
          className={styles.toggleButton}
        >
          <PanelLeft size={20} />
        </button>
      </div>

      <SelectionDisplay
        selectedFolderObjects={selectedFolderObjects}
        onRemoveFolder={handleFolderToggle}
        onClear={handleClearSelection}
      />

      <div className={styles.searchWrapper}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search folders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      <ul className={styles.folderList}>
        {filteredFolders.map((folder) => (
          <li
            key={folder.path}
            className={`${styles.folderItem} ${
              selectedFolders.includes(folder.path) ? styles.selected : ""
            }`}
          >
            <label>
              <input
                type="checkbox"
                checked={selectedFolders.includes(folder.path)}
                onChange={() => handleFolderToggle(folder.path)}
              />
              <Folder size={16} className={styles.folderIcon} />
              <span>{folder.displayName}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className={styles.resizeHandle} onMouseDown={startResizing} />
    </div>
  );
};

export default FolderSidebar;
