import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// Determine paths
const userDataPath = process.env.USER_DATA_PATH || process.cwd();
const settingsFilePath = path.join(userDataPath, 'settings.json');

console.log(`Reading settings from: ${settingsFilePath}`);

if (!fs.existsSync(settingsFilePath)) {
  console.error('Error: settings.json not found.');
  process.exit(1);
}

// Read settings
let settings;
try {
  const fileContent = fs.readFileSync(settingsFilePath, 'utf-8');
  settings = JSON.parse(fileContent);
} catch (error) {
  console.error('Error parsing settings.json:', error);
  process.exit(1);
}

const imagePath = settings.imagePath;

if (!imagePath) {
  console.error('Error: imagePath is not defined in settings.json.');
  process.exit(1);
}

const dbPath = path.join(imagePath, '.visions', 'metadata.db');
console.log(`Database path: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error('Error: metadata.db not found at the expected location.');
  process.exit(1);
}

// Perform cleanup
try {
  const db = new Database(dbPath);
  
  // Check for items to update
  const countStmt = db.prepare("SELECT COUNT(*) as count FROM images WHERE is_shared = 1 OR share_id IS NOT NULL");
  const { count } = countStmt.get();

  if (count > 0) {
    const updateStmt = db.prepare("UPDATE images SET is_shared = 0, share_id = NULL WHERE is_shared = 1 OR share_id IS NOT NULL");
    const info = updateStmt.run();
    console.log(`Successfully cleared 'share' status for ${info.changes} items.`);
  } else {
    console.log("No shared items found. Database is already clean.");
  }

  db.close();
} catch (error) {
  console.error('Error accessing or updating the database:', error);
  process.exit(1);
}
