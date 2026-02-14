import Link from "next/link";
import { Brain, PlusCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import DeleteQuizButton from "./DeleteQuizButton";

async function getQuizzes() {
  return prisma.quiz.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export default async function QuizzesPage() {
  const quizzes = await getQuizzes();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Quizzes</h1>
          <p className="text-muted-foreground mt-1">
            Choose a quiz to take or create a new one
          </p>
        </div>
        <Link href="/quizzes/create">
          <Button className="gap-2" aria-label="Create new quiz">
            <PlusCircle className="h-5 w-5" />
            New Quiz
          </Button>
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No quizzes yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first quiz to get started
            </p>
            <Link href="/quizzes/create">
              <Button>Create Quiz</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <Card
              key={quiz.id}
              className="hover:border-primary/50 transition-colors group"
            >
              <Link href={`/quizzes/${quiz.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    {quiz.title}
                  </CardTitle>
                  <CardDescription>
                    {quiz._count.questions} question
                    {quiz._count.questions !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
              </Link>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {new Date(quiz.createdAt).toLocaleDateString()}
                  </span>
                  <DeleteQuizButton quizId={quiz.id} quizTitle={quiz.title} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
