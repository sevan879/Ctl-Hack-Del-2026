import Link from "next/link";
import {
  BookOpen,
  Brain,
  PlusCircle,
  Mic,
  Eye,
  MousePointer,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

async function getDashboardData() {
  const [decks, quizzes] = await Promise.all([
    prisma.deck.findMany({
      include: { _count: { select: { cards: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.quiz.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  return { decks, quizzes };
}

export default async function HomePage() {
  const { decks, quizzes } = await getDashboardData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <section className="text-center py-12 sm:py-16" aria-labelledby="hero-title">
        <h1
          id="hero-title"
          className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
        >
          AccessLearn
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Accessible learning, your way. Study with flashcards and quizzes using
          mouse, voice, or eye tracking.
        </p>

        {/* Input modes */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12"
          aria-label="Input modes available"
        >
          <Card className="text-center">
            <CardContent className="pt-6">
              <MousePointer className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">Mouse &amp; Touch</h3>
              <p className="text-sm text-muted-foreground">
                Click, tap, and swipe your way through content
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Mic className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">Voice Control</h3>
              <p className="text-sm text-muted-foreground">
                Navigate and answer with spoken commands
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Eye className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">Eye Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Control the app with just your gaze
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto"
          aria-label="Quick actions"
        >
          <Link href="/flashcards" className="block">
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardContent className="flex flex-col items-center pt-6">
                <BookOpen className="h-8 w-8 text-primary mb-2" />
                <span className="font-medium text-sm">Study Flashcards</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/quizzes" className="block">
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardContent className="flex flex-col items-center pt-6">
                <Brain className="h-8 w-8 text-primary mb-2" />
                <span className="font-medium text-sm">Take a Quiz</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/flashcards/create" className="block">
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardContent className="flex flex-col items-center pt-6">
                <PlusCircle className="h-8 w-8 text-primary mb-2" />
                <span className="font-medium text-sm">Create Deck</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/quizzes/create" className="block">
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardContent className="flex flex-col items-center pt-6">
                <PlusCircle className="h-8 w-8 text-primary mb-2" />
                <span className="font-medium text-sm">Create Quiz</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Recent content */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Recent Decks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Decks</h2>
            <Link href="/flashcards">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
          {decks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No decks yet. Create your first deck!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {decks.map((deck) => (
                <Link key={deck.id} href={`/flashcards/${deck.id}`}>
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {deck.title}
                        </CardTitle>
                        <CardDescription>
                          {deck._count.cards} cards
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quizzes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Quizzes</h2>
            <Link href="/quizzes">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
          {quizzes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No quizzes yet. Create your first quiz!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <Link key={quiz.id} href={`/quizzes/${quiz.id}`}>
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {quiz.title}
                        </CardTitle>
                        <CardDescription>
                          {quiz._count.questions} questions
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
