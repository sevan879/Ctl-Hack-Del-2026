import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get("deckId");

  if (deckId) {
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        cards: { orderBy: { createdAt: "asc" } },
        _count: { select: { cards: true } },
      },
    });
    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    return NextResponse.json(deck);
  }

  const decks = await prisma.deck.findMany({
    include: { _count: { select: { cards: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(decks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, cards } = body;

  if (!title || !cards || !Array.isArray(cards)) {
    return NextResponse.json(
      { error: "Title and cards array are required" },
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

  const deck = await prisma.deck.create({
    data: {
      title,
      userId: user.id,
      cards: {
        create: cards.map(
          (card: { front: string; back: string; hint?: string }) => ({
            front: card.front,
            back: card.back,
            hint: card.hint || null,
          })
        ),
      },
    },
    include: { cards: true },
  });

  return NextResponse.json(deck, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get("deckId");

  if (!deckId) {
    return NextResponse.json(
      { error: "deckId is required" },
      { status: 400 }
    );
  }

  await prisma.deck.delete({ where: { id: deckId } });
  return NextResponse.json({ success: true });
}
