"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Mic,
  MicOff,
  Loader2,
  Save,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import FileUploader from "@/components/FileUploader";
import { useVoiceTranscription, isSpeechRecognitionSupported } from "@/components/VoiceControl";
import { useToast } from "@/components/ui/use-toast";

interface FlashcardDraft {
  front: string;
  back: string;
  hint: string;
}

type CreateMode = "manual" | "voice" | "ai" | "file";

export default function CreateFlashcardsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<CreateMode>("manual");
  const [title, setTitle] = useState("");
  const [cards, setCards] = useState<FlashcardDraft[]>([
    { front: "", back: "", hint: "" },
  ]);
  const [aiText, setAiText] = useState("");
  const [cardCount, setCardCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<FlashcardDraft[] | null>(
    null
  );

  // Voice recording state
  const {
    transcript,
    isRecording,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useVoiceTranscription();
  const [voiceStep, setVoiceStep] = useState<"front" | "back">("front");
  const [voiceCards, setVoiceCards] = useState<FlashcardDraft[]>([]);
  const [currentVoiceFront, setCurrentVoiceFront] = useState("");

  const addCard = () => {
    setCards([...cards, { front: "", back: "", hint: "" }]);
  };

  const removeCard = (index: number) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const updateCard = (
    index: number,
    field: keyof FlashcardDraft,
    value: string
  ) => {
    const newCards = [...cards];
    newCards[index] = { ...newCards[index], [field]: value };
    setCards(newCards);
  };

  // Voice recording handlers
  const handleVoiceSave = () => {
    if (voiceStep === "front" && transcript) {
      setCurrentVoiceFront(transcript);
      setVoiceStep("back");
      clearTranscript();
      stopRecording();
    } else if (voiceStep === "back" && transcript) {
      setVoiceCards([
        ...voiceCards,
        { front: currentVoiceFront, back: transcript, hint: "" },
      ]);
      setCurrentVoiceFront("");
      setVoiceStep("front");
      clearTranscript();
      stopRecording();
      toast({ title: "Card saved", description: "Voice flashcard added" });
    }
  };

  // AI generation
  const generateFlashcards = async (text: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, count: cardCount }),
      });

      if (!response.ok) throw new Error("Generation failed");

      const data = await response.json();
      setGeneratedCards(data.cards);
      toast({
        title: "Flashcards generated",
        description: `${data.cards.length} flashcards ready for review`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate flashcards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // File upload handler
  const handleFileText = (text: string, filename: string) => {
    setAiText(text);
    if (!title) setTitle(`From: ${filename}`);
    toast({
      title: "File processed",
      description: `Text extracted from ${filename}. Click Generate to create flashcards.`,
    });
  };

  // Save deck
  const saveDeck = async (cardsToSave: FlashcardDraft[]) => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a deck title",
        variant: "destructive",
      });
      return;
    }

    if (cardsToSave.length === 0) {
      toast({
        title: "No cards",
        description: "Add at least one flashcard",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), cards: cardsToSave }),
      });

      if (!response.ok) throw new Error("Save failed");

      const deck = await response.json();
      toast({ title: "Deck saved!", description: `"${title}" created successfully` });
      router.push(`/flashcards/${deck.id}`);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save deck",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentCards =
    mode === "voice"
      ? voiceCards
      : generatedCards || (mode === "manual" ? cards : []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/flashcards">
        <Button variant="ghost" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Decks
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-2">Create Flashcard Deck</h1>
      <p className="text-muted-foreground mb-8">
        Create flashcards manually, by voice, with AI, or from a file
      </p>

      {/* Deck title */}
      <div className="mb-6">
        <Label htmlFor="deck-title" className="text-base font-medium">
          Deck Title
        </Label>
        <Input
          id="deck-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Biology Chapter 5"
          className="mt-2"
        />
      </div>

      {/* Mode tabs */}
      <div
        className="flex flex-wrap gap-2 mb-8"
        role="tablist"
        aria-label="Creation method"
      >
        {(
          [
            { id: "manual", label: "Manual", icon: Plus },
            { id: "voice", label: "Voice", icon: Mic },
            { id: "ai", label: "AI Generate", icon: Sparkles },
            { id: "file", label: "File Upload", icon: Eye },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={mode === tab.id ? "default" : "outline"}
              onClick={() => {
                setMode(tab.id);
                setGeneratedCards(null);
              }}
              className="gap-2"
              role="tab"
              aria-selected={mode === tab.id}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Manual creation */}
      {mode === "manual" && (
        <div className="space-y-4">
          {cards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Card {index + 1}
                  </CardTitle>
                  {cards.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCard(index)}
                      aria-label={`Remove card ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor={`front-${index}`}>Front (Question)</Label>
                  <Textarea
                    id={`front-${index}`}
                    value={card.front}
                    onChange={(e) => updateCard(index, "front", e.target.value)}
                    placeholder="Enter the question or prompt"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`back-${index}`}>Back (Answer)</Label>
                  <Textarea
                    id={`back-${index}`}
                    value={card.back}
                    onChange={(e) => updateCard(index, "back", e.target.value)}
                    placeholder="Enter the answer"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`hint-${index}`}>Hint (Optional)</Label>
                  <Input
                    id={`hint-${index}`}
                    value={card.hint}
                    onChange={(e) => updateCard(index, "hint", e.target.value)}
                    placeholder="Enter a helpful hint"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addCard} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Card
          </Button>
        </div>
      )}

      {/* Voice creation */}
      {mode === "voice" && (
        <Card>
          <CardHeader>
            <CardTitle>Record Flashcards</CardTitle>
            <CardDescription>
              {!isSpeechRecognitionSupported()
                ? "Speech recognition is not supported in your browser. Please use Chrome or Edge."
                : voiceStep === "front"
                  ? "Say the front (question) of the flashcard, then click Save"
                  : "Say the back (answer) of the flashcard, then click Save"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSpeechRecognitionSupported() && (
              <>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "default"}
                    className="gap-2"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="h-4 w-4" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" />
                        Start Recording
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Recording: {voiceStep === "front" ? "Question" : "Answer"}
                  </span>
                </div>

                {transcript && (
                  <div className="p-4 rounded-lg bg-secondary">
                    <p className="text-sm font-medium mb-1">Transcript:</p>
                    <p>{transcript}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleVoiceSave}
                    disabled={!transcript}
                    variant="outline"
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {voiceStep === "front" ? "Save & Record Answer" : "Save Card"}
                  </Button>
                </div>

                {voiceCards.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="font-medium">
                      Recorded Cards ({voiceCards.length}):
                    </p>
                    {voiceCards.map((card, i) => (
                      <div
                        key={i}
                        className="p-3 rounded border border-border text-sm"
                      >
                        <p>
                          <strong>Q:</strong> {card.front}
                        </p>
                        <p>
                          <strong>A:</strong> {card.back}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI generation */}
      {mode === "ai" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Flashcard Generator
            </CardTitle>
            <CardDescription>
              Enter a topic or paste your notes, and AI will generate flashcards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ai-input">Topic or Notes</Label>
              <Textarea
                id="ai-input"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="Enter a topic (e.g., 'Photosynthesis') or paste your study notes..."
                className="mt-1 min-h-[150px]"
              />
            </div>
            <div>
              <Label>Number of flashcards: {cardCount}</Label>
              <Slider
                value={[cardCount]}
                onValueChange={([val]) => setCardCount(val)}
                min={5}
                max={30}
                step={1}
                className="mt-2"
                aria-label="Number of flashcards to generate"
              />
            </div>
            <Button
              onClick={() => generateFlashcards(aiText)}
              disabled={!aiText.trim() || isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating flashcards...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Flashcards
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* File upload */}
      {mode === "file" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload a File</CardTitle>
            <CardDescription>
              Upload a PDF, DOCX, or TXT file to generate flashcards from its
              content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploader onTextExtracted={handleFileText} />

            {aiText && (
              <>
                <div>
                  <Label>Number of flashcards: {cardCount}</Label>
                  <Slider
                    value={[cardCount]}
                    onValueChange={([val]) => setCardCount(val)}
                    min={5}
                    max={30}
                    step={1}
                    className="mt-2"
                    aria-label="Number of flashcards to generate"
                  />
                </div>
                <Button
                  onClick={() => generateFlashcards(aiText)}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating flashcards...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Flashcards
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview generated cards */}
      {generatedCards && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            Generated Flashcards ({generatedCards.length})
          </h2>
          <div className="space-y-3">
            {generatedCards.map((card, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <p className="font-medium">Q: {card.front}</p>
                  <p className="text-muted-foreground mt-1">A: {card.back}</p>
                  {card.hint && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Hint: {card.hint}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="mt-8 flex justify-end">
        <Button
          onClick={() => saveDeck(currentCards)}
          disabled={isSaving || currentCards.length === 0}
          size="lg"
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Deck ({currentCards.length} cards)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
