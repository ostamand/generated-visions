"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import styles from "./style.module.scss";
import { Button } from "@/components/ui/button";
import { useFilter } from "@/app/contexts/FilterContext";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const { isOverlayOpen } = useFilter();

  useEffect(() => {
    const scrollContainer = document.getElementById("main-scroll-container");

    const toggleVisibility = () => {
      if (scrollContainer && scrollContainer.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", toggleVisibility);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", toggleVisibility);
      }
    };
  }, []);

  const scrollToTop = () => {
    const scrollContainer = document.getElementById("main-scroll-container");
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  if (isOverlayOpen) {
    return null;
  }

  return (
    <Button
      onClick={scrollToTop}
      variant="outline"
      size="icon"
      className={`${styles.backToTop} ${isVisible ? styles.visible : ""}`}
    >
      <ArrowUp className={styles.icon} />
    </Button>
  );
}
