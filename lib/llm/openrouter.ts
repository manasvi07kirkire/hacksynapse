import { LLMCompletionOptions, LLMCompletionResult, LLMMessage } from "./types";
import { AppError, fail } from "../server/errors";
import { resolveFreeModelChain } from "./free-models";
import { z } from "zod";

const completionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().trim().min(1).max(20000),
        }),
        finish_reason: z.enum(["stop", "length"]),
      }),
    )
    .min(1)
    .max(1),
});

export class OpenRouterClient {
  constructor(
    private apiKey?: string,
    private transport: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  async completeWithFallback(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {},
  ): Promise<LLMCompletionResult> {
    const key = this.apiKey || process.env.OPENROUTER_API_KEY;
    if (!key)
      fail(
        503,
        "LLM_NOT_CONFIGURED",
        "Configure OpenRouter for this feature.",
      );
    if (messages.reduce((n, m) => n + m.content.length, 0) > 24000)
      fail(422, "LLM_INPUT_LIMIT", "Model input exceeds budget.");

    let models: string[];
    try {
      models = resolveFreeModelChain(process.env.OPENROUTER_MODEL);
    } catch (error) {
      fail(
        503,
        "LLM_CONFIG_INVALID",
        error instanceof Error
          ? error.message
          : "OpenRouter free model configuration is invalid.",
      );
    }

    const start = Date.now();
    let lastError: AppError | null = null;

    for (let index = 0; index < models.length; index++) {
      const model = models[index];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const res = await this.transport(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.any([
              controller.signal,
              ...(options.signal ? [options.signal] : []),
            ]),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model,
              messages: messages.map((m) => ({
                ...m,
                content: m.content.replace(
                  /(?:gh[pousr]_[a-zA-Z0-9]{20,}|sk-[a-zA-Z0-9_-]{20,}|Bearer\s+[a-zA-Z0-9_.-]+)/g,
                  "[REDACTED]",
                ),
              })),
              temperature: options.temperature ?? 0.1,
              max_tokens: Math.min(options.maxTokens || 1024, 3000),
              response_format: options.jsonMode
                ? { type: "json_object" }
                : undefined,
            }),
          },
        );

        if (!res.ok) {
          const retryable =
            res.status === 429 || res.status === 502 || res.status >= 500;
          lastError = new AppError(
            502,
            "LLM_PROVIDER_FAILED",
            "Model provider request failed.",
            retryable,
          );
          if (retryable && index < models.length - 1) continue;
          throw lastError;
        }

        const reader = res.body?.getReader();
        let size = 0;
        const chunks: Uint8Array[] = [];
        if (reader)
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 65536) {
              await reader.cancel();
              fail(502, "LLM_OUTPUT_LIMIT", "Model response exceeds budget.");
            }
            chunks.push(value);
          }

        const data = completionSchema.parse(
          JSON.parse(Buffer.concat(chunks).toString("utf8")),
        );
        return {
          text: data.choices[0].message.content,
          modelUsed: model,
          latencyMs: Date.now() - start,
          isFallback: index > 0,
        };
      } catch (error) {
        if (error instanceof AppError) {
          lastError = error;
          if (error.retryable && index < models.length - 1) continue;
          throw error;
        }
        lastError = new AppError(
          502,
          "LLM_INVALID_RESPONSE",
          "Model provider returned an invalid response or timed out.",
          true,
        );
        if (index < models.length - 1) continue;
        throw lastError;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw (
      lastError ||
      new AppError(
        502,
        "LLM_PROVIDER_FAILED",
        "All configured free models failed.",
        true,
      )
    );
  }
}

export const openRouter = new OpenRouterClient();
