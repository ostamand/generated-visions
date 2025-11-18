"use client";

import Link from "next/link";
import { Filter, LayoutGrid, RefreshCw, Settings } from "lucide-react"; // Import icons
import { useFilter } from "../../contexts/FilterContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import styles from "./style.module.scss";
import { usePathname } from "next/navigation";
import { useDemo } from "../../contexts/DemoContext";
import { useEffect, useState } from "react";

type Model = {
  id: number;
  name: string;
};

export function Header() {
  const {
    mediaType,
    setMediaType,
    clearFilters,
    showHidden,
    setShowHidden,
    onlyWithPrompt,
    setOnlyWithPrompt,
    refreshData,
    model,
    setModel,
  } = useFilter();
  const { isDemoMode } = useDemo();
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => setModels(data));
  }, []);

  const pathname = usePathname();
  const isSettingsPage = pathname === "/settings";
  const isWelcomePage = pathname === "/welcome";

  // Determine if any dropdown filter is active
  const hasActiveFilters = mediaType !== "all" || showHidden ||
    onlyWithPrompt || model !== "all";

  const selectedModelName = models.find((m) => m.name === model)?.name || "All";

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <img
            src={"/image-no-bkg.png"}
            width="64px"
            alt="Generated Visions Logo"
          >
          </img>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoText}>GENERATED VISIONS</span>
          </Link>
          {isDemoMode && <span className={styles.demoBadge}>Demo</span>}
        </div>

        <div className={styles.right}>
          {!isSettingsPage && !isWelcomePage && (
            <>
              <Button
                variant="ghost"
                className={styles.filterButton}
                onClick={refreshData}
              >
                <RefreshCw className={styles.filterIcon} />
                Refresh
              </Button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={styles.filterButton}>
                    <Filter className={styles.filterIcon} />
                    Filters
                    {hasActiveFilters && (
                      <div className={styles.activeFilterIndicator} />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={`dark ${styles.filterDropdownContent}`}
                >
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuLabel>Media Type</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={mediaType === "all"}
                    onCheckedChange={() => setMediaType("all")}
                  >
                    All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={mediaType === "image"}
                    onCheckedChange={() => setMediaType("image")}
                  >
                    Images
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={mediaType === "video"}
                    onCheckedChange={() => setMediaType("video")}
                  >
                    Videos
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel>Model</DropdownMenuLabel>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>{selectedModelName}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup
                          value={model}
                          onValueChange={setModel}
                        >
                          <DropdownMenuRadioItem value="all">
                            All
                          </DropdownMenuRadioItem>
                          {models.map((m) => (
                            <DropdownMenuRadioItem
                              key={m.id}
                              value={m.name}
                            >
                              {m.name}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel>Display Options</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={showHidden}
                    onCheckedChange={setShowHidden}
                  >
                    Show Hidden Images
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={onlyWithPrompt}
                    onCheckedChange={setOnlyWithPrompt}
                  >
                    Show only with prompt
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onSelect={clearFilters}>
                    <Button
                      variant="ghost"
                      className={styles.clearFilterButton}
                    >
                      Clear All Filters
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!isWelcomePage && (
            <nav className={styles.nav}>
              {isSettingsPage
                ? (
                  <Link href="/" passHref>
                    <Button variant="ghost" className={styles.filterButton}>
                      <LayoutGrid className={styles.filterIcon} />
                      Gallery
                    </Button>
                  </Link>
                )
                : (
                  <Link href="/settings" passHref>
                    <Button variant="ghost" className={styles.filterButton}>
                      <Settings className={styles.filterIcon} />
                      Settings
                    </Button>
                  </Link>
                )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
