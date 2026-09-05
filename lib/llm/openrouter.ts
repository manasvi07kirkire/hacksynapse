import { LLMCompletionOptions, LLMCompletionResult, LLMMessage } from "./types";
import { AppError, fail } from "../server/errors";
import { z } from "zod";
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
    const model = process.env.OPENROUTER_MODEL;
    if (!key || !model)
      fail(
        503,
        "LLM_NOT_CONFIGURED",
        "Configure OpenRouter and a model for this feature.",
      );
    if (messages.reduce((n, m) => n + m.content.length, 0) > 24000)
      fail(422, "LLM_INPUT_LIMIT", "Model input exceeds budget.");
    const start = Date.now();
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
      if (!res.ok)
        throw new AppError(
          502,
          "LLM_PROVIDER_FAILED",
          "Model provider request failed.",
          res.status === 429 || res.status >= 500,
        );
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
      const data = z
        .object({
          choices: z
            .array(
              z.object({
                message: z.object({
                  content: z.string().trim().min(1).max(20000),
                }),
                finish_reason: z.literal("stop"),
              }),
            )
            .min(1)
            .max(1),
        })
        .parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      return {
        text: data.choices[0].message.content,
        modelUsed: model,
        latencyMs: Date.now() - start,
        isFallback: false,
      };
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError(
        502,
        "LLM_INVALID_RESPONSE",
        "Model provider returned an invalid response or timed out.",
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
export const openRouter = new OpenRouterClient();
