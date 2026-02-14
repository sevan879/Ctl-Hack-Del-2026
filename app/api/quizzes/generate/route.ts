import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/claude";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, count = 10 } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text content is required" },
        { status: 400 }
      );
    }

    const questionCount = Math.min(Math.max(count, 5), 25);
    const questions = await generateQuiz(text, questionCount);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Failed to generate quiz:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
