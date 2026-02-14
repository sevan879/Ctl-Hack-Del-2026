"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";

const COMMANDS = [
  "next",
  "back",
  "flip",
  "hint",
  "a",
  "b",
  "c",
  "d",
  "read",
  "save",
  "done",
];

function getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useVoiceControl(onCommand?: (command: string) => void) {
  const { state } = useAccessibility();
  const [lastCommand, setLastCommand] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastCommandTimeRef = useRef(0);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  useEffect(() => {
    if (!state.voiceControlEnabled) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const now = Date.now();
      if (now - lastCommandTimeRef.current < 1000) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();

        for (const cmd of COMMANDS) {
          if (transcript.includes(cmd)) {
            lastCommandTimeRef.current = now;
            setLastCommand(cmd);
            onCommandRef.current?.(cmd);
            break;
          }
        }
      }
    };

    recognition.onend = () => {
      if (state.voiceControlEnabled) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch {}

    return () => {
      try {
        recognition.stop();
      } catch {}
      setIsListening(false);
    };
  }, [state.voiceControlEnabled]);

  return { lastCommand, isListening };
}

export function useVoiceTranscription() {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      setTranscript(fullTranscript);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsRecording(true);
      setTranscript("");
    } catch {}
  }, []);

  const stopRecording = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setIsRecording(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return { transcript, isRecording, startRecording, stopRecording, clearTranscript };
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionClass() !== null;
}
