"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccessibility } from "@/context/AccessibilityContext";
import { speak, stopSpeaking, isSpeaking } from "@/lib/speechUtils";
import { useState, useEffect } from "react";

interface TextToSpeechButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function TextToSpeechButton({
  text,
  label = "Read aloud",
  className,
}: TextToSpeechButtonProps) {
  const { state } = useAccessibility();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSpeaking(isSpeaking());
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      speak(text, state.speechRate);
      setSpeaking(true);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={className}
      aria-label={speaking ? "Stop reading" : label}
      title={speaking ? "Stop reading" : label}
    >
      {speaking ? (
        <VolumeX className="h-5 w-5" />
      ) : (
        <Volume2 className="h-5 w-5" />
      )}
    </Button>
  );
}

export function useAutoRead(text: string, enabled: boolean) {
  const { state } = useAccessibility();

  useEffect(() => {
    if (enabled && state.autoReadEnabled && text) {
      speak(text, state.speechRate);
    }
    return () => {
      stopSpeaking();
    };
  }, [text, enabled, state.autoReadEnabled, state.speechRate]);
}
