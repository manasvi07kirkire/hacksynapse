/** OpenRouter models that must remain on the free tier. */
export const FREE_MODELS_CHAIN = [
  "liquid/lfm-2.5-2.6b:free",
  "minimax/minimax-m2.7:free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "z-ai/glm-5.2:free",
  "poolside/laguna-xs-2.1:free",
  "inclusionai/ling-3.0-flash-sante:free",
] as const;

export function isFreeModel(model: string): boolean {
  return model.endsWith(":free");
}

/** Ordered free models: optional preferred model first, then built-in chain. */
export function resolveFreeModelChain(preferred?: string): string[] {
  const fromEnv = (process.env.OPENROUTER_MODELS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const chain: string[] = [];
  const add = (model: string) => {
    if (!isFreeModel(model))
      throw new Error(
        `OpenRouter model "${model}" is not free. Use only :free model IDs.`,
      );
    if (!chain.includes(model)) chain.push(model);
  };
  if (preferred?.trim()) add(preferred.trim());
  for (const model of fromEnv) add(model);
  for (const model of FREE_MODELS_CHAIN) add(model);
  return chain;
}

export function llmConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}
