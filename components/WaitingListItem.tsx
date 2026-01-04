"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw, Loader2, Clock, CheckCircle, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { UrlStatus } from "@/types";

interface WaitingListItemProps {
  id: string;
  url: string;
  domain: string;
  status: UrlStatus;
  error_message?: string;
  createdAt: string;
  onRetry?: (id: string) => Promise<void>;
}

const statusConfig: Record<UrlStatus, {
  icon: typeof Clock;
  label: string;
  className: string;
}> = {
  pending: {
    icon: Clock,
    label: "待機中",
    className: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30",
  },
  processing: {
    icon: Zap,
    label: "処理中",
    className: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
  },
  completed: {
    icon: CheckCircle,
    label: "完了",
    className: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
  },
  error: {
    icon: XCircle,
    label: "エラー",
    className: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
  },
};

export function WaitingListItem({
  id,
  url,
  domain,
  status,
  error_message,
  onRetry,
}: WaitingListItemProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry(id);
    } finally {
      setIsRetrying(false);
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <TooltipProvider>
      <div className="w-full p-3 hover:bg-muted/50 transition-colors rounded-lg group flex items-center gap-2">
        {/* Status Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex-shrink-0 p-1.5 rounded-full ${config.className}`}>
              {status === "processing" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <StatusIcon className="h-3.5 w-3.5" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.label}</p>
            {error_message && status === "error" && (
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                {error_message}
              </p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Main Content */}
        <button
          onClick={handleClick}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-start gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate group-hover:text-primary">
                {domain}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {url}
              </p>
            </div>
          </div>
        </button>

        {/* Retry Button (only for error status) */}
        {status === "error" && onRetry && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>再試行</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
