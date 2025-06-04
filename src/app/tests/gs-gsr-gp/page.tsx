// src/app/tests/gs-gsr-gp/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

const TEST_DURATION_SECONDS = 3 * 60; // 3 minutes
const MIN_ISI_MS = 2000; // 2 seconds for Inter-Stimulus Interval
const MAX_ISI_MS = 10000; // 10 seconds for Inter-Stimulus Interval
const LAPSE_THRESHOLD_MS = 500; // RTs slower than this are lapses
const FEEDBACK_MESSAGE_DURATION_MS = 1500; // How long to show RT/feedback message

const cx = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// Helper to get random integer
const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper to calculate mean
const calculateMean = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  return arr.reduce((acc, val) => acc + val, 0) / arr.length;
};

// Helper to calculate median
const calculateMedian = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const sortedArr = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sortedArr.length / 2);
  return sortedArr.length % 2 !== 0 ? sortedArr[mid] : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
};

export default function PVTPage() {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stimulusVisible, setStimulusVisible] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [lapses, setLapses] = useState<number>(0);
  const [falseStarts, setFalseStarts] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(TEST_DURATION_SECONDS);
  const [message, setMessage] = useState<string>("Premi 'Inizia Test' per cominciare.");
  const [showResults, setShowResults] = useState<boolean>(false);
  const [feedbackColor, setFeedbackColor] = useState<string>('text-neutral-700 dark:text-neutral-300');

  const interStimulusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const testDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageClearTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canRespondRef = useRef<boolean>(false);

  console.log(`[Render] isRunning: ${isRunning}, stimulusVisible: ${stimulusVisible}, timeLeft: ${timeLeft}, message: "${message}"`);

  const clearAllTimers = useCallback(() => {
    console.log("[Timers] clearAllTimers called");
    if (interStimulusTimerRef.current) {
      clearTimeout(interStimulusTimerRef.current);
      console.log("[Timers] Cleared interStimulusTimerRef");
    }
    if (testDurationTimerRef.current) {
      clearInterval(testDurationTimerRef.current);
      console.log("[Timers] Cleared testDurationTimerRef");
    }
    if (messageClearTimerRef.current) {
      clearTimeout(messageClearTimerRef.current);
      console.log("[Timers] Cleared messageClearTimerRef");
    }
  }, []);

  const showTemporaryMessage = useCallback((text: string, color: string = 'text-neutral-700 dark:text-neutral-300', duration: number = FEEDBACK_MESSAGE_DURATION_MS) => {
    console.log(`[Message] showTemporaryMessage: "${text}", color: ${color}, duration: ${duration}`);
    setMessage(text);
    setFeedbackColor(color);
    if (messageClearTimerRef.current) clearTimeout(messageClearTimerRef.current);
    messageClearTimerRef.current = setTimeout(() => {
      console.log("[Message] Temporary message timeout. Current state:", { isRunning, stimulusVisible, showResults });
      if (isRunning && !stimulusVisible) {
         setMessage("Attendi...");
         setFeedbackColor('text-neutral-700 dark:text-neutral-300');
         console.log("[Message] Set to 'Attendi...'");
      } else if (!isRunning && !showResults) {
         setMessage("Premi 'Inizia Test' per cominciare.");
         setFeedbackColor('text-neutral-700 dark:text-neutral-300');
         console.log("[Message] Set to 'Premi 'Inizia Test' per cominciare.'");
      }
    }, duration);
  }, [isRunning, stimulusVisible, showResults]);


  const presentStimulus = useCallback(() => {
    console.log("[Stimulus] presentStimulus called. Setting stimulusVisible to true.");
    setStimulusVisible(true);
    canRespondRef.current = true;
    setMessage("Premi SPAZIO!");
    setFeedbackColor('text-red-500 dark:text-red-400');
    setStartTime(Date.now());
  }, []);

  const scheduleStimulus = useCallback(() => {
    if (!isRunning) {
      console.log("[Stimulus] scheduleStimulus: Test not running, returning.");
      return;
    }
    console.log("[Stimulus] scheduleStimulus: Setting stimulusVisible to false. Scheduling next stimulus.");
    setStimulusVisible(false);
    canRespondRef.current = false;
    setMessage("Attendi...");
    setFeedbackColor('text-neutral-700 dark:text-neutral-300');

    const isi = getRandomInt(MIN_ISI_MS, MAX_ISI_MS);
    console.log(`[Stimulus] Next stimulus in ${isi}ms.`);
    if (interStimulusTimerRef.current) clearTimeout(interStimulusTimerRef.current);
    interStimulusTimerRef.current = setTimeout(() => {
      console.log("[Stimulus] ISI timeout fired! Calling presentStimulus.");
      presentStimulus();
    }, isi);
  }, [isRunning, presentStimulus]);

  const endTest = useCallback(() => {
    console.log("[TestFlow] endTest called.");
    setIsRunning(false);
    clearAllTimers();
    setStimulusVisible(false);
    canRespondRef.current = false;
    setMessage(`Test Completato! Media RT: ${calculateMean(reactionTimes).toFixed(0)} ms`);
    setFeedbackColor('text-green-600 dark:text-green-400');
    setShowResults(true);
  }, [clearAllTimers, reactionTimes]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      testDurationTimerRef.current = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      console.log("[TestFlow] Time is up, ending test.");
      endTest();
    }
    return () => {
      if (testDurationTimerRef.current) clearInterval(testDurationTimerRef.current);
    };
  }, [isRunning, timeLeft, endTest]);

  const handleStartTest = useCallback(() => {
    console.log("[TestFlow] handleStartTest called.");
    clearAllTimers();
    setReactionTimes([]);
    setLapses(0);
    setFalseStarts(0);
    setTimeLeft(TEST_DURATION_SECONDS);
    setShowResults(false);
    setIsRunning(true); // This will trigger the useEffect for timer and scheduleStimulus
    // Schedule stimulus will be called because isRunning becomes true, and scheduleStimulus depends on it
    // To be absolutely sure the first one is scheduled:
    console.log("[TestFlow] Explicitly calling scheduleStimulus from handleStartTest.");
    scheduleStimulus();
  }, [clearAllTimers, scheduleStimulus]); // Added scheduleStimulus to dependencies

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.code !== 'Space' || !isRunning) return;
    event.preventDefault();
    console.log("[Input] Spacebar pressed.");

    if (canRespondRef.current && stimulusVisible && startTime) {
      const rt = Date.now() - startTime;
      console.log(`[Input] Valid response. RT: ${rt}ms`);
      setReactionTimes(prevRTs => [...prevRTs, rt]);
      canRespondRef.current = false;
      setStimulusVisible(false); 

      if (rt > LAPSE_THRESHOLD_MS) {
        setLapses(prev => prev + 1);
        showTemporaryMessage(`Lapsus: ${rt} ms`, 'text-orange-500 dark:text-orange-400');
      } else {
        showTemporaryMessage(`RT: ${rt} ms`, 'text-green-600 dark:text-green-400');
      }
      scheduleStimulus();
    } else if (!stimulusVisible && isRunning) {
      console.log("[Input] False start.");
      setFalseStarts(prev => prev + 1);
      showTemporaryMessage("Falsa Partenza!", 'text-yellow-500 dark:text-yellow-400');
    }
  }, [isRunning, stimulusVisible, startTime, scheduleStimulus, showTemporaryMessage]);

  useEffect(() => {
    if (isRunning) {
      console.log("[Event Listener] Adding keydown listener.");
      window.addEventListener('keydown', handleKeyPress);
    } else {
      console.log("[Event Listener] Removing keydown listener.");
      window.removeEventListener('keydown', handleKeyPress);
    }
    return () => {
      console.log("[Event Listener] Cleanup: Removing keydown listener.");
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isRunning, handleKeyPress]);

  useEffect(() => {
    console.log("[Effect] Component unmount cleanup effect registered.");
    return () => {
      console.log("[Effect] Component unmounting. Clearing all timers.");
      clearAllTimers();
    };
  }, [clearAllTimers]);


  const meanRT = calculateMean(reactionTimes);
  const medianRT = calculateMedian(reactionTimes);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 font-[family-name:var(--font-geist-sans)] text-[var(--foreground)] min-h-screen flex flex-col">
      <header className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">Test: PVT (Reazione - Gs/Gsr + Gp)</h1>
        <p className="text-md sm:text-lg opacity-80">Premi la barra spaziatrice appena vedi lo stimolo.</p>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center">
        <div className="w-full max-w-md p-4 sm:p-6 border rounded-lg shadow-xl bg-white dark:bg-neutral-900">
          <div className="text-center mb-4">
            <div className="text-lg font-semibold">Tempo Rimanente</div>
            <div className="text-4xl font-bold text-blue-600 dark:text-sky-500">
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          </div>

          <div className={cx(
            "h-48 sm:h-56 w-full rounded-md flex items-center justify-center text-3xl sm:text-4xl font-bold text-center p-4 transition-colors duration-100 ease-in-out",
            stimulusVisible ? "bg-red-500 dark:bg-red-600 text-white" : "bg-neutral-200 dark:bg-neutral-800", // Removed animate-pulse for debugging
            !isRunning && !showResults && "bg-neutral-200 dark:bg-neutral-800"
          )}>
            {stimulusVisible ? "X" : isRunning ? " " : " "} {/* Simplified stimulus to "X" */}
          </div>
          
          <div className={cx("h-12 text-center mt-4 text-xl font-medium", feedbackColor)}>
            {message}
          </div>

          {!isRunning && !showResults && (
            <button
              onClick={handleStartTest}
              className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
            >
              Inizia Test
            </button>
          )}
           {isRunning && (
            <button
              onClick={endTest}
              className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
            >
              Termina Test Manualmente
            </button>
          )}
        </div>

        {showResults && (
          <div className="w-full max-w-md mt-8 p-4 sm:p-6 border rounded-lg shadow-xl bg-white dark:bg-neutral-900">
            <h2 className="text-2xl font-semibold text-center mb-4">Risultati del Test</h2>
            <ul className="space-y-2 text-lg">
              <li><strong>Reazioni Totali:</strong> {reactionTimes.length}</li>
              <li><strong>Tempo Medio di Reazione:</strong> {meanRT.toFixed(2)} ms</li>
              <li><strong>Tempo Mediano di Reazione:</strong> {medianRT.toFixed(2)} ms</li>
              <li><strong>Lapsus (&gt;{LAPSE_THRESHOLD_MS}ms):</strong> {lapses}</li>
              <li><strong>False Partenze:</strong> {falseStarts}</li>
            </ul>
            <button
              onClick={handleStartTest}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
            >
              Riprova Test
            </button>
          </div>
        )}
      </main>

      <footer className="text-center py-6 mt-auto">
        <Link href="/" className="text-blue-600 hover:underline dark:text-sky-500 text-sm sm:text-base">
          Torna alla Dashboard Principale
        </Link>
      </footer>
    </div>
  );
}
