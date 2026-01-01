import { memo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TagListItemProps {
  /** サニタイズ済みタグ名 */
  tag: string;
  /** 使用件数 */
  count: number;
  /** 選択状態 */
  isSelected: boolean;
  /** クリック時のコールバック */
  onClick: () => void;
  /** 無効状態 */
  disabled?: boolean;
}

export const TagListItem = memo<TagListItemProps>(({
  tag,
  count,
  isSelected,
  onClick,
  disabled = false
}) => {
  // セキュリティ: 表示前の最終サニタイゼーション
  const sanitizedTag = DOMPurify.sanitize(tag);

  const handleClick = useCallback(() => {
    if (!disabled) onClick();
  }, [onClick, disabled]);

  return (
    <Button
      variant={isSelected ? "default" : "ghost"}
      size="sm"
      className="w-full justify-between h-auto p-2"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={`${sanitizedTag}タグ、${count}件の記事`}
    >
      <span className="truncate flex-1 text-left" title={sanitizedTag}>
        {sanitizedTag}
      </span>
      <Badge variant="secondary" className="ml-2 text-xs">
        {count}
      </Badge>
    </Button>
  );
});

TagListItem.displayName = 'TagListItem';