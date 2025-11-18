import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { createServer } from "http";
import next from "next";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const PORT = 3201;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const userDataPath = !app.isPackaged ? process.cwd() : app.getPath("userData");

async function createWindow() {
  const isDev = !app.isPackaged;
  const nextProjectDir = isDev ? "." : path.join(__dirname, "..");

  process.env.USER_DATA_PATH = userDataPath;

  const nextApp = next({ dev: isDev, dir: nextProjectDir });
  await nextApp.prepare();

  const handle = nextApp.getRequestHandler();

  const server = createServer((req, res) => {
    handle(req, res);
  });

  server.listen(PORT, (err) => {
    let startingURL = `http://localhost:${PORT}`;

    if (err) throw err;
    console.log(`> Ready on ${startingURL}`);

    const mainWindow = new BrowserWindow({
      width: 1600,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
    });

    mainWindow.setMenu(null);

    const settingsFilePath = path.join(userDataPath, "settings.json");
    if (fs.existsSync(settingsFilePath)) {
      // check if folder is defined
      const fileContent = fs.readFileSync(settingsFilePath, "utf-8");
      const settings = JSON.parse(fileContent);
      if (!settings.imagePath) {
        startingURL += "/welcome";
      }
    } else {
      startingURL += "/welcome";
    }

    mainWindow.loadURL(startingURL);

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
    mainWindow.maximize();
  });
}

ipcMain.handle("dialog:openFolder", async () => {
  const settingsFilePath = path.join(userDataPath, "settings.json");
  if (fs.existsSync(settingsFilePath)) {
    const fileContent = fs.readFileSync(settingsFilePath, "utf-8");
    const settings = JSON.parse(fileContent);
    if (settings.demo) {
      dialog.showMessageBox({
        type: "info",
        title: "Demo Mode",
        message: "Changing the folder is disabled in demo mode.",
      });
      return null;
    }
  }
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
