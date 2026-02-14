"use client";

import React, { createContext, useContext, useReducer, useEffect } from "react";

interface AccessibilityState {
  voiceControlEnabled: boolean;
  eyeTrackingEnabled: boolean;
  textToSpeechEnabled: boolean;
  autoReadEnabled: boolean;
  fontSize: "normal" | "large" | "xlarge";
  speechRate: number;
}

type AccessibilityAction =
  | { type: "TOGGLE_VOICE_CONTROL" }
  | { type: "TOGGLE_EYE_TRACKING" }
  | { type: "TOGGLE_TTS" }
  | { type: "TOGGLE_AUTO_READ" }
  | { type: "SET_FONT_SIZE"; payload: "normal" | "large" | "xlarge" }
  | { type: "SET_SPEECH_RATE"; payload: number }
  | { type: "LOAD_STATE"; payload: Partial<AccessibilityState> };

const initialState: AccessibilityState = {
  voiceControlEnabled: false,
  eyeTrackingEnabled: false,
  textToSpeechEnabled: false,
  autoReadEnabled: false,
  fontSize: "normal",
  speechRate: 1,
};

function accessibilityReducer(
  state: AccessibilityState,
  action: AccessibilityAction
): AccessibilityState {
  switch (action.type) {
    case "TOGGLE_VOICE_CONTROL":
      return { ...state, voiceControlEnabled: !state.voiceControlEnabled };
    case "TOGGLE_EYE_TRACKING":
      return { ...state, eyeTrackingEnabled: !state.eyeTrackingEnabled };
    case "TOGGLE_TTS":
      return { ...state, textToSpeechEnabled: !state.textToSpeechEnabled };
    case "TOGGLE_AUTO_READ":
      return { ...state, autoReadEnabled: !state.autoReadEnabled };
    case "SET_FONT_SIZE":
      return { ...state, fontSize: action.payload };
    case "SET_SPEECH_RATE":
      return { ...state, speechRate: action.payload };
    case "LOAD_STATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const AccessibilityContext = createContext<{
  state: AccessibilityState;
  dispatch: React.Dispatch<AccessibilityAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(accessibilityReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("accesslearn-accessibility");
      if (saved) {
        dispatch({ type: "LOAD_STATE", payload: JSON.parse(saved) });
      }
    } catch {}
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(
        "accesslearn-accessibility",
        JSON.stringify(state)
      );
    } catch {}
  }, [state]);

  return (
    <AccessibilityContext.Provider value={{ state, dispatch }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
