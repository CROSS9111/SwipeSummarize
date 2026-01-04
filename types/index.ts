/**
 * URL処理ステータス
 * Feature: F-007-ASYNC-PROCESS
 */
export type UrlStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * URLレコード（拡張版）
 * Feature: F-007-ASYNC-PROCESS
 */
export interface UrlRecord {
  id: string;
  url: string;
  title?: string;
  summary?: string;
  tags: string[];
  status: UrlStatus;
  error_message?: string;
  retry_count: number;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * 待機リストアイテム
 * Feature: F-007-ASYNC-PROCESS
 */
export interface WaitingListItem {
  id: string;
  url: string;
  domain: string;
  status: UrlStatus;
  error_message?: string;
  created_at: string;
}

/**
 * 待機リストレスポンス
 * Feature: F-007-ASYNC-PROCESS
 */
export interface WaitingListResponse {
  items: WaitingListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  statusCounts: {
    pending: number;
    processing: number;
    completed: number;
    error: number;
  };
}

export interface SavedRecord {
  id: string;
  title: string;
  summary: string;
  original_url: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SummaryWithUrl {
  id: string;
  url: string;
  title: string;
  summary: string;
  tags: string[];
  original_length: number;
  created_at: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export type SwipeAction = 'keep' | 'discard' | 'retry';

export interface JinaResponse {
  title: string;
  content: string;
  url: string;
}

// タグサイドバー機能用の型定義
export interface TagWithCount {
  tag: string;
  count: number;
}

export interface SanitizedTag {
  tag: string;
  count: number;
  isSelected: boolean;
}

export interface TagsResponse {
  tags: TagWithCount[];
}

export interface TagFilterState {
  selectedTags: string[];
  filteredItems: SavedRecord[];
  isLoading: boolean;
  error: string | null;
}