"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeedbackButtonsProps {
  flashcardId: string;
  className?: string;
}

export default function FeedbackButtons({
  flashcardId,
  className,
}: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = async (liked: boolean) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await fetch("/api/flashcards/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcardId, liked }),
      });
      setFeedback(liked);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="group"
      aria-label="Rate this flashcard"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => submitFeedback(true)}
        disabled={isSubmitting}
        className={cn(
          "transition-colors",
          feedback === true && "text-green-400 bg-green-400/10"
        )}
        aria-label="Like this flashcard"
        aria-pressed={feedback === true}
      >
        <ThumbsUp className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => submitFeedback(false)}
        disabled={isSubmitting}
        className={cn(
          "transition-colors",
          feedback === false && "text-red-400 bg-red-400/10"
        )}
        aria-label="Dislike this flashcard"
        aria-pressed={feedback === false}
      >
        <ThumbsDown className="h-5 w-5" />
      </Button>
    </div>
  );
}
