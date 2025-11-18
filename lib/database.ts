import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { getSettings, saveSettings } from "./settings";

export type ImageMetadata = {
  path: string;
  hidden: boolean;
  starred: boolean;
  prompt?: string | null;
  title?: string | null;
  width?: number;
  height?: number;
  modelId?: number | null;
  loras?: number[] | null;
};

const userDataPath = process.env.USER_DATA_PATH || process.cwd();

// This function will return a database instance for the global data.
export function getGlobalDatabaseInstance(): Database.Database {
  const dbPath = path.join(userDataPath, "global.db");

  // Ensure the directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma("journal_mode = WAL");

  // Initialize the schema if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS loras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS folder_history (
      path TEXT PRIMARY KEY,
      last_accessed INTEGER NOT NULL
    );
  `);

  // Seed the database if it's the first time
  const settings = getSettings();
  if (!settings.isSeeded) {
    // Seed models
    if (settings.seed?.models && settings.seed.models.length > 0) {
      const insertModel = db.prepare(
        "INSERT OR IGNORE INTO models (name) VALUES (?)",
      );
      const insertManyModels = db.transaction((models) => {
        for (const model of models) {
          insertModel.run(model);
        }
      });
      insertManyModels(settings.seed.models);
      console.log("Seeded models:", settings.seed.models);
    }

    // Seed loras
    if (settings.seed?.loras && settings.seed.loras.length > 0) {
      const insertLora = db.prepare(
        "INSERT OR IGNORE INTO loras (name) VALUES (?)",
      );
      const insertManyLoras = db.transaction((loras) => {
        for (const lora of loras) {
          insertLora.run(lora);
        }
      });
      insertManyLoras(settings.seed.loras);
      console.log("Seeded loras:", settings.seed.loras);
    }

    settings.isSeeded = true;
    saveSettings(settings);
  }

  return db;
}

// This function will return a database instance for a given gallery root.
// It ensures the .visions directory and metadata.db file exist.
export function getDatabaseInstance(galleryRoot: string): Database.Database {
  const visionsDir = path.join(galleryRoot, ".visions");
  const dbPath = path.join(visionsDir, "metadata.db");

  // Ensure the .visions directory exists
  if (!fs.existsSync(visionsDir)) {
    fs.mkdirSync(visionsDir, { recursive: true });
  }

  const db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma("journal_mode = WAL");

  // Initialize the schema if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      path TEXT PRIMARY KEY,
      hidden BOOLEAN NOT NULL DEFAULT FALSE,
      starred BOOLEAN NOT NULL DEFAULT FALSE,
      prompt TEXT
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS folder_display_names (
      path TEXT PRIMARY KEY,
      display_name TEXT NOT NULL
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_path TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (media_path) REFERENCES images(path) ON DELETE CASCADE
    );
  `);
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_comments_updated_at
    AFTER UPDATE ON comments
    FOR EACH ROW
    BEGIN
      UPDATE comments SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `);

  // Add prompt column to images table if it doesn't exist
  try {
    db.exec(`ALTER TABLE images ADD COLUMN prompt TEXT`);
  } catch (error) {
    if (
      !(error instanceof Error &&
        error.message.includes("duplicate column name"))
    ) {
      throw error;
    }
  }

  // Add title column to images table if it doesn't exist
  try {
    db.exec(`ALTER TABLE images ADD COLUMN title TEXT`);
  } catch (error) {
    if (
      !(error instanceof Error &&
        error.message.includes("duplicate column name"))
    ) {
      throw error;
    }
  }

  // Add modified_at column to images table if it doesn't exist
  try {
    db.exec(`ALTER TABLE images ADD COLUMN modified_at INTEGER`);
  } catch (error) {
    if (
      !(error instanceof Error &&
        error.message.includes("duplicate column name"))
    ) {
      throw error;
    }
  }

  // Add width and height columns to images table if they don't exist
  try {
    db.exec(`ALTER TABLE images ADD COLUMN width INTEGER`);
    db.exec(`ALTER TABLE images ADD COLUMN height INTEGER`);
  } catch (error) {
    if (
      !(error instanceof Error &&
        error.message.includes("duplicate column name"))
    ) {
      throw error;
    }
  }

  // Add model_id column to images table if it doesn't exist
  try {
    db.exec(`ALTER TABLE images ADD COLUMN model_id INTEGER`);
  } catch (error) {
    if (
      !(error instanceof Error &&
        error.message.includes("duplicate column name"))
    ) {
      throw error;
    }
  }

  // Create media_loras table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS media_loras (
      media_path TEXT NOT NULL,
      lora_id INTEGER NOT NULL,
      PRIMARY KEY (media_path, lora_id)
    )
  `);

  return db;
}

// Helper function to close the database connection
export function closeDatabase(db: Database.Database) {
  db.close();
}
