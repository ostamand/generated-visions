# Generated Visions

This project is built with a modern stack, perfect for developers who want to contribute or tinker.

-   **Framework:** [Next.js](https://nextjs.org/)
-   **Desktop Shell:** [Electron](https://www.electronjs.org/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **UI:** [React](https://reactjs.org/)
-   **Styling:** [SCSS Modules](https://sass-lang.com/)
-   **Database:** [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for metadata.

## Development Setup

If you want to run the project from the source code for development purposes, follow these steps.

**Prerequisites:**
- [Node.js](https://nodejs.org/) (v20 or later recommended)

**1. Clone the Repository**
```bash
git clone https://github.com/ostamand/generated-visions
cd generated-visions
```

**2. Install Dependencies**
```bash
npm install
```

**3. Run the Application**

You can run the application in two ways:

**As a standard web app:**
  ```bash
  npm run next:dev
  ```
  Then open [http://localhost:3000](http://localhost:3000) in your browser.

**As a desktop application (with hot-reloading):**
  ```bash
  npm run electron:dev
  ```
  This will launch the Electron app in a development environment.

## Building from Source

You can also build the installers yourself.

**Build the desktop installers:**
  ```bash
  npm run electron:build
  ```
  The output files will be located in the `dist` directory.