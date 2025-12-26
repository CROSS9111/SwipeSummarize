"use client";

import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionButtonsProps {
  onKeep: () => void;
  onDiscard: () => void;
  onRetry: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ActionButtons({
  onKeep,
  onDiscard,
  onRetry,
  isLoading = false,
  disabled = false,
  className,
}: ActionButtonsProps) {
  const buttonDisabled = disabled || isLoading;

  return (
    <div className={cn("flex gap-4 justify-center", className)}>
      <Button
        size="lg"
        variant="destructive"
        onClick={onDiscard}
        disabled={buttonDisabled}
        className="flex-1 max-w-[140px] h-14"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Trash2 className="h-5 w-5 mr-2" />
            すてる
          </>
        )}
      </Button>

      <Button
        size="lg"
        variant="secondary"
        onClick={onRetry}
        disabled={buttonDisabled}
        className="flex-1 max-w-[140px] h-14"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <RefreshCw className="h-5 w-5 mr-2" />
            もう一度
          </>
        )}
      </Button>

      <Button
        size="lg"
        variant="default"
        onClick={onKeep}
        disabled={buttonDisabled}
        className="flex-1 max-w-[140px] h-14 bg-green-600 hover:bg-green-700"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Save className="h-5 w-5 mr-2" />
            とっとく
          </>
        )}
      </Button>
    </div>
  );
}