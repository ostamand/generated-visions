"use client";

import { useDemo } from "@/app/contexts/DemoContext";
import React from "react";
import { toast } from "sonner";

interface DemoGuardProps {
  children: React.ReactNode;
  message?: string;
  clickableClass?: string;
}

export const DemoGuard: React.FC<DemoGuardProps> = ({
  children,
  message = "This feature is disabled in demo mode.",
  clickableClass,
}) => {
  const { isDemoMode } = useDemo();

  if (!isDemoMode) {
    return <>{children}</>;
  }

  const handleInteraction = (e: React.MouseEvent) => {
    if (
      clickableClass && (e.target as HTMLElement).closest(`.${clickableClass}`)
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    toast.info(message);
  };

  return (
    <div
      onClickCapture={handleInteraction}
      onDoubleClickCapture={handleInteraction}
    >
      {children}
    </div>
  );
};
