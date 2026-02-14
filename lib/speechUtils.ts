export function speak(text: string, rate: number = 1): void {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false;
  return window.speechSynthesis.speaking;
}

export function speakSequence(
  texts: string[],
  rate: number = 1,
  pauseMs: number = 500
): void {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  synth.cancel();

  texts.forEach((text, index) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;

    if (index > 0) {
      // Add pause between items by using a silent utterance
      const pause = new SpeechSynthesisUtterance("");
      pause.volume = 0;
      // Use a timeout-based approach for pauses
      utterance.onstart = () => {};
    }

    synth.speak(utterance);
  });
}
