import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import GalleryFetcher from "./components/GalleryFetcher";
import FolderSidebar from "./components/FolderSidebar";
import styles from "./page.module.scss";
import { NewsChecker } from "./components/NewsChecker";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = getSettings();

  if (!settings.imagePath) {
    return redirect("/welcome");
  }

  return (
    <div className={styles.mainContainer}>
      <FolderSidebar />
      <main id="main-scroll-container" className={styles.mainContent}>
        <GalleryFetcher />
        <NewsChecker />
      </main>
    </div>
  );
}
