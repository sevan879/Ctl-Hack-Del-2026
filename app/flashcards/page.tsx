import Link from "next/link";
import { BookOpen, PlusCircle, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import DeleteDeckButton from "./DeleteDeckButton";

async function getDecks() {
  return prisma.deck.findMany({
    include: { _count: { select: { cards: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export default async function FlashcardsPage() {
  const decks = await getDecks();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Flashcard Decks</h1>
          <p className="text-muted-foreground mt-1">
            Choose a deck to study or create a new one
          </p>
        </div>
        <Link href="/flashcards/create">
          <Button className="gap-2" aria-label="Create new deck">
            <PlusCircle className="h-5 w-5" />
            New Deck
          </Button>
        </Link>
      </div>

      {decks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No decks yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first flashcard deck to get started
            </p>
            <Link href="/flashcards/create">
              <Button>Create Deck</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <Card
              key={deck.id}
              className="hover:border-primary/50 transition-colors group"
            >
              <Link href={`/flashcards/${deck.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {deck.title}
                  </CardTitle>
                  <CardDescription>
                    {deck._count.cards} card{deck._count.cards !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
              </Link>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {new Date(deck.createdAt).toLocaleDateString()}
                  </span>
                  <DeleteDeckButton deckId={deck.id} deckTitle={deck.title} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
