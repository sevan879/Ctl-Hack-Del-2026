"use client";

import { useState } from "react";
import {
  Mic,
  MicOff,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Settings,
  X,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAccessibility } from "@/context/AccessibilityContext";
import { cn } from "@/lib/utils";
import { isSpeechRecognitionSupported } from "@/components/VoiceControl";

export default function AccessibilityToolbar() {
  const { state, dispatch } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        aria-label={
          isOpen
            ? "Close accessibility settings"
            : "Open accessibility settings"
        }
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Settings className="h-6 w-6" />
        )}
      </Button>

      {/* Toolbar panel */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-80 rounded-lg border border-border bg-card shadow-xl transition-all duration-200",
          isOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
        role="dialog"
        aria-label="Accessibility settings"
        aria-hidden={!isOpen}
      >
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Accessibility</h2>
          <p className="text-xs text-muted-foreground">
            Customize your experience
          </p>
        </div>

        <div className="p-4 space-y-5">
          {/* Voice Control */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {state.voiceControlEnabled ? (
                <Mic className="h-5 w-5 text-primary" />
              ) : (
                <MicOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="voice-control" className="text-sm font-medium">
                  Voice Control
                </Label>
                {state.voiceControlEnabled && (
                  <p className="text-xs text-primary">Listening...</p>
                )}
                {!isSpeechRecognitionSupported() && (
                  <p className="text-xs text-destructive">Not supported</p>
                )}
              </div>
            </div>
            <Switch
              id="voice-control"
              checked={state.voiceControlEnabled}
              onCheckedChange={() => dispatch({ type: "TOGGLE_VOICE_CONTROL" })}
              aria-label="Toggle voice control"
            />
          </div>

          {/* Eye Tracking */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {state.eyeTrackingEnabled ? (
                <Eye className="h-5 w-5 text-primary" />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="eye-tracking" className="text-sm font-medium">
                  Eye Tracking
                </Label>
                {state.eyeTrackingEnabled && (
                  <p className="text-xs text-primary">Tracking...</p>
                )}
              </div>
            </div>
            <Switch
              id="eye-tracking"
              checked={state.eyeTrackingEnabled}
              onCheckedChange={() => dispatch({ type: "TOGGLE_EYE_TRACKING" })}
              aria-label="Toggle eye tracking"
            />
          </div>

          {/* Text-to-Speech */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {state.textToSpeechEnabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
              <Label htmlFor="tts" className="text-sm font-medium">
                Text-to-Speech
              </Label>
            </div>
            <Switch
              id="tts"
              checked={state.textToSpeechEnabled}
              onCheckedChange={() => dispatch({ type: "TOGGLE_TTS" })}
              aria-label="Toggle text-to-speech"
            />
          </div>

          {/* Auto-Read */}
          {state.textToSpeechEnabled && (
            <div className="flex items-center justify-between pl-8">
              <Label htmlFor="auto-read" className="text-sm">
                Auto-read content
              </Label>
              <Switch
                id="auto-read"
                checked={state.autoReadEnabled}
                onCheckedChange={() => dispatch({ type: "TOGGLE_AUTO_READ" })}
                aria-label="Toggle auto-read"
              />
            </div>
          )}

          {/* Speech Rate */}
          {state.textToSpeechEnabled && (
            <div className="pl-8 space-y-2">
              <Label className="text-sm">
                Speech Rate: {state.speechRate}x
              </Label>
              <Slider
                value={[state.speechRate]}
                onValueChange={([val]) =>
                  dispatch({ type: "SET_SPEECH_RATE", payload: val })
                }
                min={0.75}
                max={1.5}
                step={0.25}
                aria-label="Adjust speech rate"
              />
            </div>
          )}

          {/* Font Size */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Type className="h-5 w-5 text-muted-foreground" />
              <Label className="text-sm font-medium">Font Size</Label>
            </div>
            <Select
              value={state.fontSize}
              onValueChange={(val) =>
                dispatch({
                  type: "SET_FONT_SIZE",
                  payload: val as "normal" | "large" | "xlarge",
                })
              }
            >
              <SelectTrigger
                className="w-28 h-10"
                aria-label="Select font size"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="xlarge">X-Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </>
  );
}
