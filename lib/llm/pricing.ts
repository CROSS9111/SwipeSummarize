// プロバイダー別の価格設定（USD per 1K tokens）
export const PRICING = {
  openai: {
    "gpt-5": { input: 0.015, output: 0.045 }, // 推定価格
    "gpt-5-mini": { input: 0.007, output: 0.021 },
    o3: { input: 0.1, output: 0.3 }, // 推論モデル（高価格）
    "o3-mini": { input: 0.02, output: 0.06 },
    o1: { input: 0.015, output: 0.06 },
    "o1-mini": { input: 0.003, output: 0.012 },
    "gpt-4o": { input: 0.005, output: 0.015 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
  },
  "azure-openai": {
    // Azure価格は通常OpenAIと同等
    "gpt-5": { input: 0.015, output: 0.045 },
    o3: { input: 0.1, output: 0.3 },
    "gpt-4o": { input: 0.005, output: 0.015 },
    "gpt-4": { input: 0.03, output: 0.06 },
  },
  anthropic: {
    "claude-opus-4-5": { input: 0.015, output: 0.075 },
    "claude-opus-4-1": { input: 0.015, output: 0.075 },
    "claude-sonnet-4-0": { input: 0.003, output: 0.015 },
    "claude-3-7-sonnet-latest": { input: 0.003, output: 0.015 },
    "claude-3-5-haiku-latest": { input: 0.00025, output: 0.00125 },
  },
  bedrock: {
    // Anthropic on Bedrock
    "anthropic.claude-sonnet-4-20250115-v1:0": { input: 0.003, output: 0.015 },
    "anthropic.claude-3-haiku-20240307-v1:0": {
      input: 0.00025,
      output: 0.00125,
    },
    // Meta Llama
    "meta.llama3-70b-instruct-v1:0": { input: 0.00265, output: 0.0035 },
    "meta.llama3-8b-instruct-v1:0": { input: 0.0003, output: 0.0006 },
    // Amazon Nova
    "amazon.nova-pro-v1:0": { input: 0.0008, output: 0.0032 },
    "amazon.nova-lite-v1:0": { input: 0.00012, output: 0.00015 },
  },
  google: {
    "gemini-3-pro-preview": { input: 0.002, output: 0.006 }, // 推定
    "gemini-3-flash": { input: 0.0001, output: 0.0004 },
    "gemini-2.5-pro": { input: 0.00125, output: 0.00375 },
    "gemini-2.5-flash": { input: 0.000075, output: 0.0003 },
    "gemini-2.0-flash-exp": { input: 0.000075, output: 0.0003 },
    "gemini-1.5-pro": { input: 0.00125, output: 0.00375 },
    "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
  },
  vertex_ai: {
    // Google Cloud価格（若干高め）
    "gemini-2.5-pro": { input: 0.00125, output: 0.00375 },
    "gemini-2.5-flash": { input: 0.000075, output: 0.0003 },
    "gemini-1.5-pro": { input: 0.00125, output: 0.00375 },
  },
  xai: {
    "grok-4": { input: 0.01, output: 0.03 }, // 推定
    "grok-3": { input: 0.005, output: 0.015 },
    "grok-3-fast": { input: 0.001, output: 0.003 },
  },
  ollama: {
    // ローカル実行のため課金なし
    "*": { input: 0.0, output: 0.0 },
  },
} as const;

export function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = (PRICING as any)[provider]?.[model];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}