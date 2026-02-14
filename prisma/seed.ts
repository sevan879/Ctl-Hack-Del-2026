import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create default user
  const user = await prisma.user.upsert({
    where: { id: "default-user" },
    update: {},
    create: {
      id: "default-user",
      name: "Default User",
    },
  });

  // Check if sample deck exists
  const existingDeck = await prisma.deck.findFirst({
    where: { title: "Sample: World Capitals" },
  });

  if (!existingDeck) {
    await prisma.deck.create({
      data: {
        title: "Sample: World Capitals",
        userId: user.id,
        cards: {
          create: [
            {
              front: "What is the capital of France?",
              back: "Paris",
              hint: "It's known as the City of Light",
            },
            {
              front: "What is the capital of Japan?",
              back: "Tokyo",
              hint: "It was formerly known as Edo",
            },
            {
              front: "What is the capital of Brazil?",
              back: "Brasília",
              hint: "It's not Rio de Janeiro or São Paulo",
            },
            {
              front: "What is the capital of Australia?",
              back: "Canberra",
              hint: "It's not Sydney or Melbourne",
            },
            {
              front: "What is the capital of Canada?",
              back: "Ottawa",
              hint: "It's in the province of Ontario",
            },
          ],
        },
      },
    });
  }

  // Check if sample quiz exists
  const existingQuiz = await prisma.quiz.findFirst({
    where: { title: "Sample: General Knowledge" },
  });

  if (!existingQuiz) {
    await prisma.quiz.create({
      data: {
        title: "Sample: General Knowledge",
        userId: user.id,
        questions: {
          create: [
            {
              questionText: "What planet is known as the Red Planet?",
              options: JSON.stringify(["Venus", "Mars", "Jupiter", "Saturn"]),
              correctAnswer: 1,
            },
            {
              questionText: "What is the largest ocean on Earth?",
              options: JSON.stringify([
                "Atlantic Ocean",
                "Indian Ocean",
                "Arctic Ocean",
                "Pacific Ocean",
              ]),
              correctAnswer: 3,
            },
            {
              questionText: "How many continents are there on Earth?",
              options: JSON.stringify(["5", "6", "7", "8"]),
              correctAnswer: 2,
            },
            {
              questionText: "What gas do plants absorb from the atmosphere?",
              options: JSON.stringify([
                "Oxygen",
                "Nitrogen",
                "Carbon Dioxide",
                "Hydrogen",
              ]),
              correctAnswer: 2,
            },
            {
              questionText: "What is the hardest natural substance on Earth?",
              options: JSON.stringify([
                "Gold",
                "Iron",
                "Diamond",
                "Platinum",
              ]),
              correctAnswer: 2,
            },
          ],
        },
      },
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
