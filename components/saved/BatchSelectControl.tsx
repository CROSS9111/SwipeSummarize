"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface BatchSelectControlProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
  disabled?: boolean;
}

export function BatchSelectControl({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onDeleteAll,
  disabled = false,
}: BatchSelectControlProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg mb-4">
      <div className="flex items-center gap-4">
        {hasSelection ? (
          <>
            <span className="text-sm font-medium">
              {selectedCount}件選択中
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeselectAll}
              disabled={disabled}
            >
              選択解除
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelected}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              選択削除
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">
              {totalCount}件の記事
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              disabled={disabled || totalCount === 0}
            >
              全選択
            </Button>
          </>
        )}
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={onDeleteAll}
        disabled={disabled || totalCount === 0}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        全削除
      </Button>
    </div>
  );
}