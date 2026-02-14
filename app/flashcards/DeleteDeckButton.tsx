"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteDeckButtonProps {
  deckId: string;
  deckTitle: string;
}

export default function DeleteDeckButton({
  deckId,
  deckTitle,
}: DeleteDeckButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete "${deckTitle}"? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      await fetch(`/api/flashcards?deckId=${deckId}`, { method: "DELETE" });
      router.refresh();
    } catch {
      alert("Failed to delete deck");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
      aria-label={`Delete ${deckTitle}`}
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
