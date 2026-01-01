import { memo, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TagListItem } from './TagListItem';
import { useTagFilter } from '@/hooks/useTagFilter';
import type { SavedRecord } from '@/types';

interface TagSidebarProps {
  savedItems: SavedRecord[];
  onItemsFiltered: (items: SavedRecord[]) => void;
}

export const TagSidebar = memo<TagSidebarProps>(({
  savedItems,
  onItemsFiltered
}) => {
  const {
    tags,
    selectedTags,
    filteredItems,
    isLoading,
    error,
    selectTag,
    deselectTag,
    clearAllTags
  } = useTagFilter(savedItems);

  useEffect(() => {
    onItemsFiltered(filteredItems);
  }, [filteredItems, onItemsFiltered]);

  return (
    <aside
      className="w-60 bg-background border-r border-border h-full overflow-hidden flex flex-col"
      role="complementary"
      aria-label="タグフィルター"
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm text-foreground">
            タグフィルター
          </h2>
          {selectedTags.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllTags}
              className="text-xs h-7 px-2"
            >
              クリア
            </Button>
          )}
        </div>
        {selectedTags.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {selectedTags.length}個選択中
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">
              読み込み中...
            </span>
          </div>
        )}

        {error && (
          <Alert className="mx-2 mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && tags.length === 0 && (
          <div className="text-center py-8 px-2">
            <p className="text-sm text-muted-foreground">
              タグがありません
            </p>
          </div>
        )}

        {!isLoading && !error && tags.length > 0 && (
          <div className="space-y-1">
            {tags.map((tag) => (
              <TagListItem
                key={tag.tag}
                tag={tag.tag}
                count={tag.count}
                isSelected={tag.isSelected}
                onClick={() =>
                  tag.isSelected
                    ? deselectTag(tag.tag)
                    : selectTag(tag.tag)
                }
              />
            ))}
          </div>
        )}
      </div>

      {filteredItems.length !== savedItems.length && (
        <div className="p-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            {filteredItems.length} / {savedItems.length} 件表示中
          </p>
        </div>
      )}
    </aside>
  );
});

TagSidebar.displayName = 'TagSidebar';