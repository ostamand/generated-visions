"use client";

import * as React from "react";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InputWithCopyProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  valueToCopy: string;
  tooltip?: string;
  inputClassName?: string;
}

const InputWithCopy = React.forwardRef<HTMLInputElement, InputWithCopyProps>(
  ({ className, valueToCopy, tooltip, inputClassName, ...props }, ref) => {
    const handleCopy = () => {
      navigator.clipboard.writeText(valueToCopy);
      toast.success("Copied to clipboard!");
    };

    const inputElement = (
      <Input
        ref={ref}
        {...props}
        readOnly
        className={cn("pr-12", inputClassName)}
      />
    );

    return (
      <div className={cn("relative flex items-center", className)}>
        {tooltip
          ? (
            <Tooltip>
              <TooltipTrigger asChild>
                {inputElement}
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )
          : inputElement}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 h-7 w-7"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4" />
          <span className="sr-only">Copy</span>
        </Button>
      </div>
    );
  },
);

InputWithCopy.displayName = "InputWithCopy";

export { InputWithCopy };
