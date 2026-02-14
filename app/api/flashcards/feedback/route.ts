import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flashcardId, liked } = body;

    if (!flashcardId || typeof liked !== "boolean") {
      return NextResponse.json(
        { error: "flashcardId and liked (boolean) are required" },
        { status: 400 }
      );
    }

    // Ensure default user exists
    let user = await prisma.user.findUnique({ where: { id: "default-user" } });
    if (!user) {
      user = await prisma.user.create({
        data: { id: "default-user", name: "Default User" },
      });
    }

    const feedback = await prisma.feedback.create({
      data: {
        flashcardId,
        userId: user.id,
        liked,
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error("Failed to save feedback:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
