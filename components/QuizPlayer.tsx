"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { CheckCircle, XCircle, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TextToSpeechButton, useAutoRead } from "@/components/TextToSpeech";
import { useVoiceControl } from "@/components/VoiceControl";
import { useEyeTracking, useGazeZones } from "@/components/EyeTracker";
import { useAccessibility } from "@/context/AccessibilityContext";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  questionText: string;
  options: string;
  correctAnswer: number;
}

interface QuizPlayerProps {
  questions: Question[];
  quizTitle: string;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export default function QuizPlayer({
  questions,
  quizTitle,
}: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(questions.length).fill(null)
  );
  const [isComplete, setIsComplete] = useState(false);
  const { state } = useAccessibility();
  const { gazePosition } = useEyeTracking();

  const currentQuestion = questions[currentIndex];
  const options: string[] = JSON.parse(currentQuestion.options);

  const selectAnswer = useCallback(
    (index: number) => {
      if (showResult) return;
      setSelectedAnswer(index);
      setShowResult(true);
      const newAnswers = [...answers];
      newAnswers[currentIndex] = index;
      setAnswers(newAnswers);
    },
    [showResult, answers, currentIndex]
  );

  const goNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, questions.length]);

  // Voice commands
  const handleVoiceCommand = useCallback(
    (command: string) => {
      if (showResult && command === "next") {
        goNext();
        return;
      }

      const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
      if (command in letterMap) {
        selectAnswer(letterMap[command]);
        return;
      }

      // Fuzzy match spoken text to options
      const cmdLower = command.toLowerCase();
      for (let i = 0; i < options.length; i++) {
        const optionWords = options[i].toLowerCase().split(" ");
        const matchCount = optionWords.filter((w) =>
          cmdLower.includes(w)
        ).length;
        if (matchCount >= Math.ceil(optionWords.length / 2)) {
          selectAnswer(i);
          return;
        }
      }
    },
    [showResult, goNext, selectAnswer, options]
  );

  useVoiceControl(handleVoiceCommand);

  // Eye tracking for quiz answers (4 quadrants)
  const gazeZones = useMemo(
    () => [
      { id: "0", xMin: 0, xMax: 0.5, yMin: 0.3, yMax: 0.6, dwellTime: 2000 },
      { id: "1", xMin: 0.5, xMax: 1.0, yMin: 0.3, yMax: 0.6, dwellTime: 2000 },
      { id: "2", xMin: 0, xMax: 0.5, yMin: 0.6, yMax: 0.9, dwellTime: 2000 },
      { id: "3", xMin: 0.5, xMax: 1.0, yMin: 0.6, yMax: 0.9, dwellTime: 2000 },
    ],
    []
  );

  const handleGazeDwell = useCallback(
    (zoneId: string) => {
      if (!showResult) {
        selectAnswer(parseInt(zoneId));
      }
    },
    [showResult, selectAnswer]
  );

  useGazeZones(gazePosition, gazeZones, handleGazeDwell);

  // Auto-read
  const readText = `Question ${currentIndex + 1}: ${currentQuestion.questionText}. Options: ${options.map((o, i) => `${OPTION_LABELS[i]}: ${o}`).join(". ")}`;
  useAutoRead(readText, state.textToSpeechEnabled && !isComplete);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showResult && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        goNext();
        return;
      }

      const keyMap: Record<string, number> = {
        "1": 0,
        "2": 1,
        "3": 2,
        "4": 3,
        a: 0,
        b: 1,
        c: 2,
        d: 3,
      };
      if (e.key.toLowerCase() in keyMap && !showResult) {
        selectAnswer(keyMap[e.key.toLowerCase()]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showResult, goNext, selectAnswer]);

  const fontSizeClass =
    state.fontSize === "xlarge"
      ? "text-xl"
      : state.fontSize === "large"
        ? "text-lg"
        : "text-base";

  // Score summary
  if (isComplete) {
    const correctCount = answers.filter(
      (a, i) => a === questions[i].correctAnswer
    ).length;
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="max-w-3xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <Trophy className="h-16 w-16 mx-auto text-primary mb-4" />
            <CardTitle className="text-3xl">Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-5xl font-bold text-primary mb-2">
                {correctCount}/{questions.length}
              </p>
              <p className="text-xl text-muted-foreground">{percentage}%</p>
            </div>

            <div className="text-left space-y-3">
              <h3 className="font-semibold text-lg">Results:</h3>
              {questions.map((q, i) => {
                const opts: string[] = JSON.parse(q.options);
                const isCorrect = answers[i] === q.correctAnswer;
                return (
                  <div
                    key={q.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      isCorrect
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-red-500/30 bg-red-500/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {q.questionText}
                        </p>
                        {!isCorrect && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Your answer: {answers[i] !== null ? opts[answers[i]!] : "Skipped"}{" "}
                            | Correct: {opts[q.correctAnswer]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={() => {
                setCurrentIndex(0);
                setSelectedAnswer(null);
                setShowResult(false);
                setAnswers(new Array(questions.length).fill(null));
                setIsComplete(false);
              }}
              className="gap-2"
              aria-label="Retake quiz"
            >
              <RotateCcw className="h-4 w-4" />
              Retake Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{quizTitle}</h1>
          <p className="text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <TextToSpeechButton text={readText} label="Read question aloud" />
      </div>

      {/* Progress */}
      <Progress
        value={currentIndex + 1}
        max={questions.length}
        className="mb-6"
      />

      {/* Question */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <p
            className={cn("font-medium leading-relaxed", fontSizeClass)}
            aria-live="polite"
          >
            {currentQuestion.questionText}
          </p>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6" role="radiogroup" aria-label="Answer options">
        {options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correctAnswer;

          let optionStyle = "border-border hover:border-primary/50 bg-card";
          if (showResult) {
            if (isCorrect) {
              optionStyle = "border-green-500 bg-green-500/10";
            } else if (isSelected && !isCorrect) {
              optionStyle = "border-red-500 bg-red-500/10";
            }
          } else if (isSelected) {
            optionStyle = "border-primary bg-primary/10";
          }

          return (
            <button
              key={index}
              onClick={() => selectAnswer(index)}
              disabled={showResult}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left min-h-[64px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                optionStyle,
                !showResult && "cursor-pointer"
              )}
              role="radio"
              aria-checked={isSelected}
              aria-label={`Option ${OPTION_LABELS[index]}: ${option}`}
            >
              <span
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold text-sm shrink-0",
                  showResult && isCorrect
                    ? "border-green-500 text-green-400"
                    : showResult && isSelected && !isCorrect
                      ? "border-red-500 text-red-400"
                      : "border-border text-muted-foreground"
                )}
              >
                {OPTION_LABELS[index]}
              </span>
              <span className={cn(fontSizeClass)}>{option}</span>
              {showResult && isCorrect && (
                <CheckCircle className="h-5 w-5 text-green-400 ml-auto shrink-0" />
              )}
              {showResult && isSelected && !isCorrect && (
                <XCircle className="h-5 w-5 text-red-400 ml-auto shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      {showResult && (
        <div className="flex justify-center">
          <Button onClick={goNext} size="lg" aria-label={currentIndex < questions.length - 1 ? "Next question" : "See results"}>
            {currentIndex < questions.length - 1
              ? "Next Question"
              : "See Results"}
          </Button>
        </div>
      )}

      {/* Voice commands hint */}
      {state.voiceControlEnabled && (
        <p className="text-xs text-muted-foreground text-center mt-4" aria-live="polite">
          Voice commands: say &quot;A&quot;, &quot;B&quot;, &quot;C&quot;, &quot;D&quot; or the answer text
        </p>
      )}
    </div>
  );
}
