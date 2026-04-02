import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 8080),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiLlmModel: process.env.GEMINI_LLM_MODEL ?? "gemini-2.5-flash",
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2-preview",
  geminiEmbeddingDimensions: Number(process.env.GEMINI_EMBEDDING_DIMENSIONS ?? 768),
  nvdApiKey: process.env.NVD_API_KEY ?? "",
};
