import fs from "fs";
import path from "path";
import { closeDatabase, getGlobalDatabaseInstance } from "./database";

const MAX_HISTORY_ITEMS = 5;

interface SeedData {
  models: string[];
  loras: string[];
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
}

interface Settings {
  imagePath?: string;
  isSeeded?: boolean;
  seed?: SeedData;
  demo?: boolean;
  user_access_token?: string;
  api_keys?: ApiKey[];
  lastSeenNewsCreatedAt?: string;
}

const settingsFilePath = path.join(
  process.env.USER_DATA_PATH || process.cwd(),
  "settings.json",
);

const seedFilePath = path.join(process.cwd(), "seed.json");

function getDefaultSeedData(): SeedData {
  try {
    if (fs.existsSync(seedFilePath)) {
      const fileContent = fs.readFileSync(seedFilePath, "utf-8");
      return JSON.parse(fileContent) as SeedData;
    }
  } catch (error) {
    console.error("Error reading seed.json:", error);
  }
  // Fallback if seed.json is not found or invalid
  return {
    models: ["SDXL", "Qwen-Image", "FLUX.1-dev"],
    loras: ["Detail Tweaker XL", "ClearVAE", "NegativeXL"],
  };
}

export function getSettings(): Settings {
  const defaultSeedData = getDefaultSeedData();

  try {
    if (fs.existsSync(settingsFilePath)) {
      const fileContent = fs.readFileSync(settingsFilePath, "utf-8");
      const settings = JSON.parse(fileContent) as Settings;
      // Ensure seed data exists for existing users
      if (!settings.seed) {
        settings.seed = defaultSeedData;
      } else {
        // Ensure models and loras exist within seed, for partial updates
        if (!settings.seed.models) {
          settings.seed.models = defaultSeedData.models;
        }
        if (!settings.seed.loras) {
          settings.seed.loras = defaultSeedData.loras;
        }
      }
      return settings;
    }
  } catch (error) {
    console.error("Error reading settings file:", error);
  }

  // Default settings for a new user
  return {
    isSeeded: false,
    seed: defaultSeedData,
    demo: false,
  };
}

export function saveSettings(settings: Settings): void {
  try {
    const fileContent = JSON.stringify(settings, null, 2);
    fs.writeFileSync(settingsFilePath, fileContent, "utf-8");
  } catch (error) {
    console.error("Error writing settings file:", error);
    throw new Error("Could not save settings.");
  }
}

export function getUserAccessToken(): string | undefined {
  const settings = getSettings();
  if (settings.api_keys && settings.api_keys.length > 0) {
    // Prefer the key named 'app', otherwise take the first one
    const appKey = settings.api_keys.find((k) => k.name === "app");
    if (appKey) return appKey.key;
    return settings.api_keys[0].key;
  }
  return settings.user_access_token;
}

export function setAndRecordImagePath(newImagePath: string): void {
  const settings = getSettings();
  settings.imagePath = newImagePath;
  saveSettings(settings);

  const db = getGlobalDatabaseInstance();
  try {
    // Add or update the entry with the current timestamp
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO folder_history (path, last_accessed) VALUES (?, ?)",
    );
    stmt.run(newImagePath, Date.now());

    // Trim the history to the maximum number of items
    const countStmt = db.prepare(
      "SELECT COUNT(*) as count FROM folder_history",
    );
    const { count } = countStmt.get() as { count: number };

    if (count > MAX_HISTORY_ITEMS) {
      const deleteStmt = db.prepare(
        "DELETE FROM folder_history WHERE path IN (SELECT path FROM folder_history ORDER BY last_accessed ASC LIMIT ?)",
      );
      deleteStmt.run(count - MAX_HISTORY_ITEMS);
    }
  } finally {
    closeDatabase(db);
  }
}

export function removeFolderFromHistory(folderPath: string): void {
  const db = getGlobalDatabaseInstance();
  try {
    const stmt = db.prepare("DELETE FROM folder_history WHERE path = ?");
    stmt.run(folderPath);
  } finally {
    closeDatabase(db);
  }
}
