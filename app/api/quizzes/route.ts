import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get("quizId");

  if (quizId) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    return NextResponse.json(quiz);
  }

  const quizzes = await prisma.quiz.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(quizzes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, questions } = body;

  if (!title || !questions || !Array.isArray(questions)) {
    return NextResponse.json(
      { error: "Title and questions array are required" },
      { status: 400 }
    );
  }

  let user = await prisma.user.findUnique({ where: { id: "default-user" } });
  if (!user) {
    user = await prisma.user.create({
      data: { id: "default-user", name: "Default User" },
    });
  }

  const quiz = await prisma.quiz.create({
    data: {
      title,
      userId: user.id,
      questions: {
        create: questions.map(
          (q: {
            questionText: string;
            options: string[];
            correctAnswer: number;
          }) => ({
            questionText: q.questionText,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
          })
        ),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json(quiz, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get("quizId");

  if (!quizId) {
    return NextResponse.json(
      { error: "quizId is required" },
      { status: 400 }
    );
  }

  await prisma.quiz.delete({ where: { id: quizId } });
  return NextResponse.json({ success: true });
}
