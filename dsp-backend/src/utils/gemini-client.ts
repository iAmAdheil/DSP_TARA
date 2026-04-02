import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { Schema } from "@google/generative-ai";
import { env } from "../config/env.js";

const genAI = new GoogleGenerativeAI(env.geminiApiKey);

/**
 * Call Gemini with a structured output schema.
 * Returns the parsed JSON response.
 *
 * Accepts a loose schema object — SchemaType enum values are widened
 * by TS when defined inline, but are correct at runtime.
 */
export async function geminiStructuredCall<T>(opts: {
  systemPrompt: string;
  userMessage: string;
  responseSchema: Record<string, unknown>;
  model?: string;
}): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: opts.model ?? env.geminiLlmModel,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: opts.responseSchema as unknown as Schema,
    },
    systemInstruction: opts.systemPrompt,
  });

  const result = await model.generateContent(opts.userMessage);
  const text = result.response.text();
  return JSON.parse(text) as T;
}

export { SchemaType };
