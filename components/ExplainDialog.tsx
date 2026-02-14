"use client";

import { useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TextToSpeechButton } from "@/components/TextToSpeech";

interface ExplainDialogProps {
  front: string;
  back: string;
}

export default function ExplainDialog({ front, back }: ExplainDialogProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchExplanation = async () => {
    if (explanation) return; // Already fetched
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/flashcards/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front, back }),
      });

      if (!response.ok) throw new Error("Failed to get explanation");

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err) {
      setError("Failed to get explanation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !explanation && !isLoading) {
      fetchExplanation();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label="Explain this concept"
        >
          <Lightbulb className="h-4 w-4" />
          Explain
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Concept Explanation
          </DialogTitle>
          <DialogDescription>
            AI-generated explanation for: {front}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Generating explanation...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchExplanation} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {explanation && (
            <div>
              <div className="flex justify-end mb-2">
                <TextToSpeechButton
                  text={explanation}
                  label="Read explanation aloud"
                />
              </div>
              <div className="prose prose-invert max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
                {explanation}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
