import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import FlashcardViewer from "@/components/FlashcardViewer";

interface Props {
  params: { deckId: string };
}

async function getDeck(deckId: string) {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: { cards: { orderBy: { createdAt: "asc" } } },
  });
  return deck;
}

export default async function StudyDeckPage({ params }: Props) {
  const deck = await getDeck(params.deckId);

  if (!deck) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/flashcards">
        <Button variant="ghost" className="mb-4 gap-2" aria-label="Back to decks">
          <ArrowLeft className="h-4 w-4" />
          Back to Decks
        </Button>
      </Link>

      <FlashcardViewer cards={deck.cards} deckTitle={deck.title} />
    </div>
  );
}
