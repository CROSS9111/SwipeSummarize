import { type ProviderId } from "./providers";

export interface LLMConfig {
  provider: ProviderId;
  model: string;
  environment: "local" | "staging" | "production";
  apiKey?: string;
  endpoint?: string;
  maxTokens?: number;
  temperature?: number;
  // Azure特有
  deploymentName?: string;
  apiVersion?: string;
  // AWS特有
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  // Vertex AI特有
  projectId?: string;
  location?: string;
}

export interface SummaryResult {
  summary: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  provider: string;
  model: string;
  processingTime?: number;
}

export interface LLMSettings {
  id: string;
  provider: ProviderId;
  model: string;
  environment: string;
  config: Record<string, any>;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsageRecord {
  id: string;
  provider: ProviderId;
  model: string;
  environment: string;
  requestId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  status: "success" | "error" | "rate_limited" | "timeout";
  errorMessage?: string;
  responseTimeMs?: number;
  createdAt: string;
}