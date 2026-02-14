import { NextRequest, NextResponse } from "next/server";
import { explainConcept } from "@/lib/claude";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { front, back } = body;

    if (!front || !back) {
      return NextResponse.json(
        { error: "front and back text are required" },
        { status: 400 }
      );
    }

    const explanation = await explainConcept(front, back);
    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Failed to explain concept:", error);
    return NextResponse.json(
      { error: "Failed to explain concept" },
      { status: 500 }
    );
  }
}
