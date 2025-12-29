// プロバイダー一覧の定義
export const PROVIDERS = [
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    models: [
      "gpt-5",
      "gpt-5-mini",
      "o3",
      "o3-mini",
      "o1",
      "o1-mini",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4",
      "gpt-4-turbo",
    ],
    configFields: ["endpoint", "apiKey", "deploymentName", "apiVersion"],
    category: "enterprise",
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      "gpt-5",
      "gpt-5-mini",
      "o3",
      "o3-mini",
      "o1",
      "o1-mini",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
    ],
    configFields: ["apiKey"],
    category: "standard",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: [
      "claude-opus-4-5",
      "claude-opus-4-1",
      "claude-sonnet-4-0",
      "claude-3-7-sonnet-latest",
      "claude-3-5-haiku-latest",
    ],
    configFields: ["apiKey"],
    category: "standard",
  },
  {
    id: "google",
    name: "Google Generative AI",
    models: [
      "gemini-3-pro-preview",
      "gemini-3-flash",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.0-flash-exp",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ],
    configFields: ["apiKey"],
    category: "standard",
  },
  {
    id: "vertex_ai",
    name: "Google Vertex AI",
    models: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.0-flash-exp",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ],
    configFields: ["projectId", "location", "credentials"],
    category: "enterprise",
  },
  {
    id: "bedrock",
    name: "AWS Bedrock",
    models: [
      // Anthropic
      "anthropic.claude-sonnet-4-20250115-v1:0",
      "anthropic.claude-3-haiku-20240307-v1:0",
      // Meta Llama
      "meta.llama3-8b-instruct-v1:0",
      "meta.llama3-70b-instruct-v1:0",
      "meta-llama/Llama-4-Scout-17B-16E-Instruct",
      // Amazon Nova
      "amazon.nova-pro-v1:0",
      "amazon.nova-lite-v1:0",
    ],
    configFields: ["region", "accessKeyId", "secretAccessKey"],
    category: "enterprise",
  },
  {
    id: "xai",
    name: "xAI Grok",
    models: [
      "grok-4",
      "grok-3",
      "grok-3-fast",
      "grok-2-1212",
      "grok-2-vision-1212",
    ],
    configFields: ["apiKey"],
    category: "standard",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    models: ["llama3", "phi3", "gemma2"],
    configFields: ["baseUrl"],
    category: "local",
  },
] as const;

export type ProviderId = typeof PROVIDERS[number]["id"];
export type ProviderCategory = "enterprise" | "standard" | "local";

export interface LLMProvider {
  id: ProviderId;
  name: string;
  models: readonly string[];
  configFields: readonly string[];
  category: ProviderCategory;
  status?: "configured" | "not_configured";
}