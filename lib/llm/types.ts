export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionOptions {
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LLMCompletionResult {
  text: string;
  modelUsed: string;
  latencyMs: number;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  isFallback: boolean;
}

// Strictly 100% FREE models (:free suffix only).
// Never include "openrouter/auto" without a :free suffix, as auto-routing
// can route to cheap paid models like DeepSeek.
export const FREE_MODELS_CHAIN = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemma-2-9b-it:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "liquid/lfm-2.5-2.6b:free",
  "openai/gpt-oss-20b:free",
] as const;
