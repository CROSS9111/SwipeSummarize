import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useTagFilter } from "../useTagFilter";
import type { SavedRecord } from "@/types";

// fetch のモック
const globalFetch = vi.fn();
global.fetch = globalFetch;

describe("useTagFilter", () => {
  const mockItems: SavedRecord[] = [
    {
      id: "1",
      title: "React News",
      summary: 'React is great. ```json\n{"tags": ["React"]}\n```',
      original_url: "https://example.com/1",
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "2",
      title: "TypeScript Tips",
      summary: 'TS is awesome. ```json\n{"tags": ["TypeScript"]}\n```',
      original_url: "https://example.com/2",
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockTagsResponse = {
    tags: [
      { tag: "React", count: 1 },
      { tag: "TypeScript", count: 1 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    globalFetch.mockResolvedValue({
      ok: true,
      json: async () => mockTagsResponse,
    });
  });

  it("初期状態でタグをロードし、全アイテムを取得すること", async () => {
    const { result } = renderHook(() => useTagFilter(mockItems));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tags).toHaveLength(2);
    expect(result.current.filteredItems).toHaveLength(2);
  });

  it("タグを選択するとフィルタリングが機能すること", async () => {
    const { result } = renderHook(() => useTagFilter(mockItems));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.selectTag("React");
    });

    expect(result.current.selectedTags).toContain("React");
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].title).toBe("React News");
  });

  it("タグを解除するとフィルタリングが更新されること", async () => {
    const { result } = renderHook(() => useTagFilter(mockItems));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.selectTag("React");
    });
    expect(result.current.filteredItems).toHaveLength(1);

    act(() => {
      result.current.deselectTag("React");
    });

    expect(result.current.selectedTags).not.toContain("React");
    expect(result.current.filteredItems).toHaveLength(2);
  });

  it("全解除ボタンで全てのフィルタがリセットされること", async () => {
    const { result } = renderHook(() => useTagFilter(mockItems));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.selectTag("React");
      result.current.selectTag("TypeScript");
    });
    expect(result.current.selectedTags).toHaveLength(2);

    act(() => {
      result.current.clearAllTags();
    });

    expect(result.current.selectedTags).toHaveLength(0);
    expect(result.current.filteredItems).toHaveLength(2);
  });
});
