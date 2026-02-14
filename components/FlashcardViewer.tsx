"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TextToSpeechButton, useAutoRead } from "@/components/TextToSpeech";
import FeedbackButtons from "@/components/FeedbackButtons";
import ExplainDialog from "@/components/ExplainDialog";
import { useVoiceControl } from "@/components/VoiceControl";
import { useEyeTracking, useGazeZones } from "@/components/EyeTracker";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string | null;
}

interface FlashcardViewerProps {
  cards: Flashcard[];
  deckTitle: string;
}

export default function FlashcardViewer({
  cards,
  deckTitle,
}: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const { state } = useAccessibility();
  const { toast } = useToast();
  const { gazePosition } = useEyeTracking();

  const currentCard = cards[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, cards.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const flip = useCallback(() => {
    setIsFlipped((f) => !f);
  }, []);

  const showHint = useCallback(() => {
    if (currentCard?.hint) {
      toast({
        title: "Hint",
        description: currentCard.hint,
      });
    }
  }, [currentCard, toast]);

  // Voice commands
  const handleVoiceCommand = useCallback(
    (command: string) => {
      switch (command) {
        case "next":
          goNext();
          break;
        case "back":
          goPrev();
          break;
        case "flip":
          flip();
          break;
        case "hint":
          showHint();
          break;
      }
    },
    [goNext, goPrev, flip, showHint]
  );

  useVoiceControl(handleVoiceCommand);

  // Eye tracking zones
  const gazeZones = useMemo(
    () => [
      { id: "prev", xMin: 0, xMax: 0.2, yMin: 0.2, yMax: 0.8, dwellTime: 1500 },
      { id: "next", xMin: 0.8, xMax: 1.0, yMin: 0.2, yMax: 0.8, dwellTime: 1500 },
    ],
    []
  );

  const handleGazeDwell = useCallback(
    (zoneId: string) => {
      if (zoneId === "prev") goPrev();
      if (zoneId === "next") goNext();
    },
    [goPrev, goNext]
  );

  useGazeZones(gazePosition, gazeZones, handleGazeDwell);

  // Auto-read
  const cardText = isFlipped
    ? `Answer: ${currentCard?.back}`
    : `Question: ${currentCard?.front}`;
  useAutoRead(cardText, state.textToSpeechEnabled);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case " ":
        case "Enter":
          e.preventDefault();
          flip();
          break;
        case "h":
          showHint();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, flip, showHint]);

  if (!cards.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No flashcards in this deck.
        </p>
      </div>
    );
  }

  const fontSizeClass =
    state.fontSize === "xlarge"
      ? "text-2xl"
      : state.fontSize === "large"
        ? "text-xl"
        : "text-lg";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{deckTitle}</h1>
          <p className="text-muted-foreground">
            Card {currentIndex + 1} of {cards.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TextToSpeechButton
            text={`${currentCard.front}. The answer is: ${currentCard.back}`}
            label="Read card aloud"
          />
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-muted rounded-full h-2 mb-6" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={cards.length}>
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Eye tracking indicators */}
      {state.eyeTrackingEnabled && (
        <>
          <div
            className={cn(
              "fixed left-0 top-1/2 -translate-y-1/2 w-16 h-32 flex items-center justify-center transition-opacity duration-300",
              gazePosition && gazePosition.x < window.innerWidth * 0.2
                ? "opacity-100"
                : "opacity-20"
            )}
            aria-hidden="true"
          >
            <ChevronLeft className="h-10 w-10 text-primary" />
          </div>
          <div
            className={cn(
              "fixed right-0 top-1/2 -translate-y-1/2 w-16 h-32 flex items-center justify-center transition-opacity duration-300",
              gazePosition && gazePosition.x > window.innerWidth * 0.8
                ? "opacity-100"
                : "opacity-20"
            )}
            aria-hidden="true"
          >
            <ChevronRight className="h-10 w-10 text-primary" />
          </div>
        </>
      )}

      {/* Card */}
      <div
        className="perspective-1000 cursor-pointer mb-6"
        onClick={flip}
        role="button"
        tabIndex={0}
        aria-label={
          isFlipped
            ? `Answer: ${currentCard.back}. Click to show question.`
            : `Question: ${currentCard.front}. Click to show answer.`
        }
        aria-live="polite"
      >
        <Card
          className={cn(
            "min-h-[300px] flex items-center justify-center transition-all duration-300 hover:border-primary/50",
            isFlipped ? "bg-secondary" : "bg-card"
          )}
        >
          <CardContent className="p-8 text-center w-full">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
              {isFlipped ? "Answer" : "Question"}
            </p>
            <p className={cn("font-medium leading-relaxed", fontSizeClass)}>
              {isFlipped ? currentCard.back : currentCard.front}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentIndex === 0}
            aria-label="Previous card"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={goNext}
            disabled={currentIndex === cards.length - 1}
            aria-label="Next card"
          >
            Next
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {currentCard.hint && (
            <Button
              variant="outline"
              size="sm"
              onClick={showHint}
              className="gap-2"
              aria-label="Show hint"
            >
              <HelpCircle className="h-4 w-4" />
              Hint
            </Button>
          )}
          <ExplainDialog front={currentCard.front} back={currentCard.back} />
          <FeedbackButtons flashcardId={currentCard.id} />
        </div>
      </div>

      {/* Voice commands hint */}
      {state.voiceControlEnabled && (
        <p className="text-xs text-muted-foreground text-center mt-4" aria-live="polite">
          Voice commands: &quot;next&quot;, &quot;back&quot;, &quot;flip&quot;, &quot;hint&quot;
        </p>
      )}
    </div>
  );
}
