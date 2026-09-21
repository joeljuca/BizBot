import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️  OPENAI_API_KEY not set — analysis will be skipped");
}

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const ANALYSIS_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
