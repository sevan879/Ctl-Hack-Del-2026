"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

declare global {
  interface Window {
    webgazer: {
      setGazeListener: (
        callback: (data: { x: number; y: number } | null) => void
      ) => typeof window.webgazer;
      begin: () => Promise<typeof window.webgazer>;
      end: () => typeof window.webgazer;
      pause: () => typeof window.webgazer;
      resume: () => typeof window.webgazer;
      showVideo: (show: boolean) => typeof window.webgazer;
      showPredictionPoints: (show: boolean) => typeof window.webgazer;
      showFaceOverlay: (show: boolean) => typeof window.webgazer;
      showFaceFeedbackBox: (show: boolean) => typeof window.webgazer;
      setRegression: (type: string) => typeof window.webgazer;
      setTracker: (type: string) => typeof window.webgazer;
    };
  }
}

interface GazePosition {
  x: number;
  y: number;
}

export function useEyeTracking() {
  const { state } = useAccessibility();
  const [gazePosition, setGazePosition] = useState<GazePosition | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (!state.eyeTrackingEnabled) {
      if (initRef.current && window.webgazer) {
        try {
          window.webgazer.end();
        } catch {}
        initRef.current = false;
      }
      setGazePosition(null);
      setIsCalibrated(false);
      return;
    }

    const loadWebGazer = async () => {
      if (initRef.current) return;
      setIsLoading(true);

      // Load script if not already loaded
      if (!window.webgazer) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://webgazer.cs.brown.edu/webgazer.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load WebGazer"));
          document.head.appendChild(script);
        });
      }

      try {
        await window.webgazer
          .setRegression("ridge")
          .setTracker("TFFacemesh")
          .setGazeListener((data) => {
            if (data) {
              setGazePosition({ x: data.x, y: data.y });
            }
          })
          .showVideo(false)
          .showPredictionPoints(false)
          .showFaceOverlay(false)
          .showFaceFeedbackBox(false)
          .begin();

        initRef.current = true;
        setIsCalibrated(true);
      } catch (err) {
        console.error("WebGazer init failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadWebGazer();
  }, [state.eyeTrackingEnabled]);

  return { gazePosition, isCalibrated, isLoading };
}

interface CalibrationScreenProps {
  onComplete: () => void;
}

export function CalibrationScreen({ onComplete }: CalibrationScreenProps) {
  const [clickCounts, setClickCounts] = useState<number[]>(
    new Array(9).fill(0)
  );
  const requiredClicks = 5;

  const positions = [
    { top: "10%", left: "10%" },
    { top: "10%", left: "50%" },
    { top: "10%", left: "90%" },
    { top: "50%", left: "10%" },
    { top: "50%", left: "50%" },
    { top: "50%", left: "90%" },
    { top: "90%", left: "10%" },
    { top: "90%", left: "50%" },
    { top: "90%", left: "90%" },
  ];

  const handleClick = (index: number) => {
    const newCounts = [...clickCounts];
    newCounts[index]++;
    setClickCounts(newCounts);

    if (newCounts.every((c) => c >= requiredClicks)) {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Eye Tracking Calibration</h2>
        <p className="text-muted-foreground">
          Click each dot {requiredClicks} times while looking at it
        </p>
      </div>
      <div className="relative w-full h-full">
        {positions.map((pos, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className="absolute w-8 h-8 rounded-full transition-all duration-200 transform -translate-x-1/2 -translate-y-1/2 focus:outline-none focus:ring-2 focus:ring-ring"
            style={{
              top: pos.top,
              left: pos.left,
              backgroundColor:
                clickCounts[i] >= requiredClicks
                  ? "#22c55e"
                  : `rgba(233, 69, 96, ${0.4 + (clickCounts[i] / requiredClicks) * 0.6})`,
            }}
            aria-label={`Calibration point ${i + 1}, ${clickCounts[i]} of ${requiredClicks} clicks`}
          >
            <span className="sr-only">
              {clickCounts[i]}/{requiredClicks}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface GazeZoneDetectorProps {
  gazePosition: GazePosition | null;
  zones: {
    id: string;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    dwellTime: number;
  }[];
  onDwell: (zoneId: string) => void;
}

export function useGazeZones(
  gazePosition: GazePosition | null,
  zones: GazeZoneDetectorProps["zones"],
  onDwell: (zoneId: string) => void
) {
  const dwellTimers = useRef<Record<string, number>>({});
  const onDwellRef = useRef(onDwell);
  onDwellRef.current = onDwell;

  useEffect(() => {
    if (!gazePosition) return;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    zones.forEach((zone) => {
      const inZone =
        gazePosition.x >= zone.xMin * screenWidth &&
        gazePosition.x <= zone.xMax * screenWidth &&
        gazePosition.y >= zone.yMin * screenHeight &&
        gazePosition.y <= zone.yMax * screenHeight;

      if (inZone) {
        if (!dwellTimers.current[zone.id]) {
          dwellTimers.current[zone.id] = Date.now();
        } else {
          const elapsed = Date.now() - dwellTimers.current[zone.id];
          if (elapsed >= zone.dwellTime) {
            onDwellRef.current(zone.id);
            dwellTimers.current[zone.id] = Date.now() + 2000; // cooldown
          }
        }
      } else {
        delete dwellTimers.current[zone.id];
      }
    });
  }, [gazePosition, zones]);
}
