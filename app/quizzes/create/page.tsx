"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Save,
  CheckCircle,
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
import { useToast } from "@/components/ui/use-toast";

interface QuestionDraft {
  questionText: string;
  options: string[];
  correctAnswer: number;
}

type CreateMode = "prompt" | "file";

export default function CreateQuizPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<CreateMode>("prompt");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<
    QuestionDraft[] | null
  >(null);

  const generateQuiz = async (inputText: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, count: questionCount }),
      });

      if (!response.ok) throw new Error("Generation failed");

      const data = await response.json();
      setGeneratedQuestions(data.questions);
      toast({
        title: "Quiz generated",
        description: `${data.questions.length} questions ready for review`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileText = (extractedText: string, filename: string) => {
    setText(extractedText);
    if (!title) setTitle(`Quiz: ${filename}`);
    toast({
      title: "File processed",
      description: `Text extracted from ${filename}. Click Generate to create quiz.`,
    });
  };

  const saveQuiz = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a quiz title",
        variant: "destructive",
      });
      return;
    }

    if (!generatedQuestions || generatedQuestions.length === 0) {
      toast({
        title: "No questions",
        description: "Generate questions first",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          questions: generatedQuestions,
        }),
      });

      if (!response.ok) throw new Error("Save failed");

      const quiz = await response.json();
      toast({ title: "Quiz saved!", description: `"${title}" created successfully` });
      router.push(`/quizzes/${quiz.id}`);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save quiz",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const OPTION_LABELS = ["A", "B", "C", "D"];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/quizzes">
        <Button variant="ghost" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Quizzes
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-2">Create Quiz</h1>
      <p className="text-muted-foreground mb-8">
        Generate a quiz from a topic or uploaded file using AI
      </p>

      {/* Quiz title */}
      <div className="mb-6">
        <Label htmlFor="quiz-title" className="text-base font-medium">
          Quiz Title
        </Label>
        <Input
          id="quiz-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Biology Chapter 5 Quiz"
          className="mt-2"
        />
      </div>

      {/* Mode tabs */}
      <div
        className="flex gap-2 mb-8"
        role="tablist"
        aria-label="Creation method"
      >
        <Button
          variant={mode === "prompt" ? "default" : "outline"}
          onClick={() => setMode("prompt")}
          className="gap-2"
          role="tab"
          aria-selected={mode === "prompt"}
        >
          <Sparkles className="h-4 w-4" />
          From Topic/Notes
        </Button>
        <Button
          variant={mode === "file" ? "default" : "outline"}
          onClick={() => setMode("file")}
          className="gap-2"
          role="tab"
          aria-selected={mode === "file"}
        >
          File Upload
        </Button>
      </div>

      {/* From prompt */}
      {mode === "prompt" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Quiz Generator
            </CardTitle>
            <CardDescription>
              Enter a topic or paste your notes to generate quiz questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="quiz-text">Topic or Notes</Label>
              <Textarea
                id="quiz-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter a topic or paste study notes..."
                className="mt-1 min-h-[150px]"
              />
            </div>
            <div>
              <Label>Number of questions: {questionCount}</Label>
              <Slider
                value={[questionCount]}
                onValueChange={([val]) => setQuestionCount(val)}
                min={5}
                max={25}
                step={1}
                className="mt-2"
                aria-label="Number of questions to generate"
              />
            </div>
            <Button
              onClick={() => generateQuiz(text)}
              disabled={!text.trim() || isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating quiz...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Quiz
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
              Upload a PDF, DOCX, or TXT file to generate quiz questions from
              its content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploader onTextExtracted={handleFileText} />

            {text && (
              <>
                <div>
                  <Label>Number of questions: {questionCount}</Label>
                  <Slider
                    value={[questionCount]}
                    onValueChange={([val]) => setQuestionCount(val)}
                    min={5}
                    max={25}
                    step={1}
                    className="mt-2"
                    aria-label="Number of questions to generate"
                  />
                </div>
                <Button
                  onClick={() => generateQuiz(text)}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating quiz...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Quiz
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview generated questions */}
      {generatedQuestions && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            Generated Questions ({generatedQuestions.length})
          </h2>
          <div className="space-y-4">
            {generatedQuestions.map((q, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <p className="font-medium mb-3">
                    {i + 1}. {q.questionText}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, j) => (
                      <div
                        key={j}
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          j === q.correctAnswer
                            ? "bg-green-500/10 border border-green-500/30"
                            : "bg-secondary"
                        }`}
                      >
                        <span className="font-mono font-bold text-xs">
                          {OPTION_LABELS[j]}
                        </span>
                        {opt}
                        {j === q.correctAnswer && (
                          <CheckCircle className="h-3 w-3 text-green-400 ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={saveQuiz}
              disabled={isSaving}
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
                  Save Quiz ({generatedQuestions.length} questions)
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
