"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export type News = {
    title: string;
    content: string;
    createdAt: string;
};

interface NewsModalProps {
    news: News | null;
    isOpen: boolean;
    onClose: () => void;
    onDontShowAgain: () => void;
}

export function NewsModal({
    news,
    isOpen,
    onClose,
    onDontShowAgain,
}: NewsModalProps) {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleClose = () => {
        if (dontShowAgain) {
            onDontShowAgain();
        }
        onClose();
    };

    if (!news) return null;

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => !open && handleClose()}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{news.title}</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                        {new Date(news.createdAt).toLocaleDateString()}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-sm text-foreground space-y-4">
                    <p>{news.content}</p>
                </div>
                <DialogFooter className="flex-col sm:justify-between sm:flex-row items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="dont-show"
                            checked={dontShowAgain}
                            onCheckedChange={(checked) =>
                                setDontShowAgain(checked === true)}
                        />
                        <label
                            htmlFor="dont-show"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Don&apos;t show this again
                        </label>
                    </div>
                    <Button onClick={handleClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
