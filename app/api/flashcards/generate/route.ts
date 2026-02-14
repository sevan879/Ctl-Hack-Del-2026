import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFlashcards } from "@/lib/claude";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, count = 10, deckId } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text content is required" },
        { status: 400 }
      );
    }

    const cardCount = Math.min(Math.max(count, 5), 30);

    // Build feedback context if deckId is provided
    let feedbackContext = "";
    if (deckId) {
      const feedback = await prisma.feedback.findMany({
        where: { flashcard: { deckId } },
        include: { flashcard: true },
      });

      if (feedback.length > 0) {
        const liked = feedback
          .filter((f) => f.liked)
          .map((f) => f.flashcard.front)
          .slice(0, 5);
        const disliked = feedback
          .filter((f) => !f.liked)
          .map((f) => f.flashcard.front)
          .slice(0, 5);

        if (liked.length > 0 || disliked.length > 0) {
          feedbackContext =
            "The user has previously provided feedback on flashcards:";
          if (liked.length > 0) {
            feedbackContext += `\nLiked questions similar to: ${liked.join("; ")}`;
          }
          if (disliked.length > 0) {
            feedbackContext += `\nDisliked questions similar to: ${disliked.join("; ")}`;
          }
          feedbackContext += "\nAdjust the style and difficulty accordingly.";
        }
      }
    }

    const cards = await generateFlashcards(text, cardCount, feedbackContext);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Failed to generate flashcards:", error);
    return NextResponse.json(
      { error: "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}
