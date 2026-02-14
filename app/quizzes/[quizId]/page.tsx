import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import QuizPlayer from "@/components/QuizPlayer";

interface Props {
  params: { quizId: string };
}

async function getQuiz(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true },
  });
  return quiz;
}

export default async function TakeQuizPage({ params }: Props) {
  const quiz = await getQuiz(params.quizId);

  if (!quiz) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/quizzes">
        <Button variant="ghost" className="mb-4 gap-2" aria-label="Back to quizzes">
          <ArrowLeft className="h-4 w-4" />
          Back to Quizzes
        </Button>
      </Link>

      <QuizPlayer questions={quiz.questions} quizTitle={quiz.title} />
    </div>
  );
}
