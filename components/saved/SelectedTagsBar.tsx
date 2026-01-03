"use client";

import { memo } from "react";
import { X, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SelectedTagsBarProps {
  selectedTags: string[];
  onRemoveTag: (tag: string) => void;
  onClearAll: () => void;
}

export const SelectedTagsBar = memo<SelectedTagsBarProps>(
  ({ selectedTags, onRemoveTag, onClearAll }) => {
    if (selectedTags.length === 0) {
      return null;
    }

    return (
      <div
        role="region"
        aria-label="選択中のタグ"
        aria-live="polite"
        className="bg-muted/30 px-4 py-3 border-y border-border"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              選択中
            </span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto flex-1">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1.5 pl-2.5 pr-1 py-0.5 border-primary/10 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <span className="text-xs font-medium">{tag}</span>
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="rounded-full hover:bg-muted p-0.5 transition-colors group"
                  aria-label={`${tag}を解除`}
                >
                  <X className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                </button>
              </Badge>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs h-7 px-2.5 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
          >
            クリア
          </Button>
        </div>
      </div>
    );
  }
);

SelectedTagsBar.displayName = "SelectedTagsBar";
