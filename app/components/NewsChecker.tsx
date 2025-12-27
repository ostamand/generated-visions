"use client";

import { useEffect, useState } from "react";
import { News, NewsModal } from "./NewsModal";

type Settings = {
    lastSeenNewsCreatedAt?: string;
};

export function NewsChecker() {
    const [news, setNews] = useState<News | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const checkNews = async () => {
            if (typeof window === "undefined" || !navigator.onLine) return;

            try {
                const apiUrl =
                    process.env.NEXT_PUBLIC_GENERATED_VISIONS_API_URL || "";

                const [settingsRes, newsRes] = await Promise.allSettled([
                    fetch("/api/settings"),
                    fetch(`${apiUrl}/public/news`),
                ]);

                if (newsRes.status === "rejected" || !newsRes.value.ok) {
                    console.error(
                        "Failed to fetch news",
                        newsRes.status === "rejected"
                            ? newsRes.reason
                            : newsRes.value.statusText,
                    );
                    return;
                }

                const latestNews = (await newsRes.value.json()) as News;

                let lastSeenDate = new Date(0); // Default to epoch if no settings or no lastSeen

                if (
                    settingsRes.status === "fulfilled" && settingsRes.value.ok
                ) {
                    const settings =
                        (await settingsRes.value.json()) as Settings;
                    if (settings.lastSeenNewsCreatedAt) {
                        lastSeenDate = new Date(settings.lastSeenNewsCreatedAt);
                    }
                }

                const newsDate = new Date(latestNews.createdAt);

                // If news is newer than what we've last seen
                if (newsDate > lastSeenDate) {
                    setNews(latestNews);
                    setIsOpen(true);
                }
            } catch (error) {
                console.error("Error checking for news:", error);
            }
        };

        checkNews();
    }, []);

    const handleDontShowAgain = async () => {
        if (!news) return;

        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    lastSeenNewsCreatedAt: news.createdAt,
                }),
            });
        } catch (error) {
            console.error("Failed to update settings:", error);
        }
    };

    return (
        <NewsModal
            news={news}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onDontShowAgain={handleDontShowAgain}
        />
    );
}
