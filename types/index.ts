export interface UrlRecord {
  id: string;
  url: string;
  created_at: string;
  updated_at: string;
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