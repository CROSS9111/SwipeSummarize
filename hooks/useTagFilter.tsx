import { useState, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import type { SavedRecord, TagWithCount, SanitizedTag, TagsResponse } from '@/types';

interface UseTagFilterReturn {
  tags: SanitizedTag[];
  selectedTags: string[];
  filteredItems: SavedRecord[];
  isLoading: boolean;
  error: string | null;
  selectTag: (tag: string) => void;
  deselectTag: (tag: string) => void;
  clearAllTags: () => void;
  refetch: () => void;
}

// XSS防止付きタグフィルタリング
function filterItemsByTags(
  items: SavedRecord[],
  selectedTags: string[]
): SavedRecord[] {
  if (selectedTags.length === 0) return items;

  // 入力値をサニタイズ
  const sanitizedTags = selectedTags.map(tag =>
    DOMPurify.sanitize(tag.trim())
  ).filter(Boolean);

  return items.filter(item => {
    if (!item.tags || !Array.isArray(item.tags)) return false;

    return sanitizedTags.some(selectedTag =>
      item.tags.some(itemTag =>
        DOMPurify.sanitize(itemTag) === selectedTag
      )
    );
  });
}

export function useTagFilter(savedItems: SavedRecord[]): UseTagFilterReturn {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagsData, setTagsData] = useState<TagsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // タグ一覧取得
  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/saved/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data: TagsResponse = await response.json();
      setTagsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期ロード
  useMemo(() => {
    fetchTags();
  }, [fetchTags]);

  // セキュアなタグ選択処理
  const selectTag = useCallback((tag: string) => {
    const sanitizedTag = DOMPurify.sanitize(tag.trim());
    if (sanitizedTag && !selectedTags.includes(sanitizedTag)) {
      setSelectedTags(prev => [...prev, sanitizedTag]);
    }
  }, [selectedTags]);

  const deselectTag = useCallback((tag: string) => {
    const sanitizedTag = DOMPurify.sanitize(tag.trim());
    setSelectedTags(prev => prev.filter(t => t !== sanitizedTag));
  }, []);

  const clearAllTags = useCallback(() => {
    setSelectedTags([]);
  }, []);

  // パフォーマンス最適化：メモ化されたフィルタリング
  const filteredItems = useMemo(() => {
    return filterItemsByTags(savedItems, selectedTags);
  }, [savedItems, selectedTags]);

  // サニタイズ済みタグデータ
  const tags = useMemo(() => {
    if (!tagsData?.tags) return [];

    return tagsData.tags.map((tag) => ({
      tag: DOMPurify.sanitize(tag.tag),
      count: tag.count,
      isSelected: selectedTags.includes(DOMPurify.sanitize(tag.tag))
    }));
  }, [tagsData, selectedTags]);

  return {
    tags,
    selectedTags,
    filteredItems,
    isLoading,
    error,
    selectTag,
    deselectTag,
    clearAllTags,
    refetch: fetchTags
  };
}