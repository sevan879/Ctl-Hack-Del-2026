import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

export async function generateFlashcards(
  text: string,
  count: number,
  feedbackContext?: string
): Promise<{ front: string; back: string; hint: string }[]> {
  const feedbackSection = feedbackContext
    ? `\n${feedbackContext}\n`
    : "";

  const prompt = `You are generating flashcards for a learning tool designed for users with disabilities.
Generate ${count} flashcards on the following topic/notes. Each flashcard should have:
- "front": a clear question or prompt
- "back": a concise, accurate answer
- "hint": a helpful hint that guides toward the answer without giving it away

Keep language simple and accessible. Vary difficulty slightly.
${feedbackSection}
Topic/Notes:
${text}

Respond ONLY with a JSON array: [{"front": "...", "back": "...", "hint": "..."}, ...]`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return parseJsonResponse(content.text);
}

export async function generateQuiz(
  text: string,
  count: number
): Promise<
  { questionText: string; options: string[]; correctAnswer: number }[]
> {
  const prompt = `Generate a multiple choice quiz with ${count} questions on the following topic/notes.
Each question should have:
- "questionText": clear, accessible question
- "options": array of exactly 4 answer choices
- "correctAnswer": index (0-3) of the correct option

Keep language simple and clear. Make wrong answers plausible but clearly distinguishable.

Topic/Notes:
${text}

Respond ONLY with a JSON array: [{"questionText": "...", "options": ["...", "...", "...", "..."], "correctAnswer": 0}, ...]`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return parseJsonResponse(content.text);
}

export async function explainConcept(
  front: string,
  back: string
): Promise<string> {
  const prompt = `Explain this concept in simple, accessible terms for a student. Be thorough but clear.

Flashcard Front: ${front}
Flashcard Back: ${back}

Provide a clear, detailed explanation that helps someone understand this concept deeply.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return content.text;
}

function parseJsonResponse<T>(text: string): T {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("No JSON array found in response");
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Failed to parse JSON response");
  }
}
