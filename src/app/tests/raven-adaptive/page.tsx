'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { generateRavenMatrixItem, MatrixResponse } from './matrix-generator';

const ITEM_TIME_LIMIT_SECONDS = 60;
const FEEDBACK_DURATION_MS = 2000;

// Difficulty expressed as IQ levels
const IQ_LEVELS = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160];

const cx = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

export default function RavenTenItemTest() {
  const [currentItem, setCurrentItem] = useState<MatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ITEM_TIME_LIMIT_SECONDS);
  const [testFinished, setTestFinished] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const iqToDifficulty = (iq: number) => Math.max(0, Math.min(1, (iq - 70) / 90));

  const loadNewItem = useCallback(() => {
    if (itemIndex >= IQ_LEVELS.length) {
      setTestFinished(true);
      setCurrentItem(null);
      return;
    }

    setIsLoading(true);
    setFeedbackMessage(null);
    setSelectedOption(null);
    setIsCorrect(null);

    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);

    try {
      const difficulty = iqToDifficulty(IQ_LEVELS[itemIndex]);
      const item = generateRavenMatrixItem(difficulty, `item-${itemIndex}`);
      setCurrentItem(item);
      setTimeLeft(ITEM_TIME_LIMIT_SECONDS);
    } catch (error) {
      console.error('Error generating matrix item:', error);
      setCurrentItem(null);
    } finally {
      setIsLoading(false);
    }
  }, [itemIndex]);

  useEffect(() => {
    loadNewItem();
  }, [loadNewItem]);

  useEffect(() => {
    if (!isLoading && currentItem && timeLeft > 0 && isCorrect === null) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isCorrect === null) {
      if (timerRef.current) clearInterval(timerRef.current);
      handleTimeUp();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading, currentItem, timeLeft, isCorrect]);

  const handleTimeUp = useCallback(() => {
    if (!currentItem || isCorrect !== null) return;

    if (timerRef.current) clearInterval(timerRef.current);

    setIsCorrect(false);
    setFeedbackMessage('Tempo scaduto!');
    setSelectedOption(null);

    feedbackTimerRef.current = setTimeout(() => {
      setItemIndex(prev => prev + 1);
      loadNewItem();
    }, FEEDBACK_DURATION_MS);
  }, [currentItem, isCorrect, loadNewItem]);

  const handleOptionSelect = (selectedIndex: number) => {
    if (!currentItem || isCorrect !== null) return;

    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedOption(selectedIndex);

    if (selectedIndex === currentItem.metadata.correct_option_index) {
      setIsCorrect(true);
      setFeedbackMessage('Corretto!');
      setScore(prev => prev + Math.round(currentItem.metadata.difficulty_estimate * 100));
    } else {
      setIsCorrect(false);
      setFeedbackMessage(`Sbagliato. La risposta corretta era l'opzione ${currentItem.metadata.correct_option_index + 1}.`);
    }

    feedbackTimerRef.current = setTimeout(() => {
      setItemIndex(prev => prev + 1);
      loadNewItem();
    }, FEEDBACK_DURATION_MS);
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 font-[family-name:var(--font-geist-sans)] text-[var(--foreground)]">
      <header className="mb-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">Test: Raven 10 Item</h1>
        <p className="text-md sm:text-lg opacity-80">
          Punteggio: <span className="font-bold text-green-500">{score}</span>
        </p>
        <p className="text-xs sm:text-sm opacity-70">
          Item {Math.min(itemIndex + 1, IQ_LEVELS.length)} / {IQ_LEVELS.length}
          {currentItem && (
            <span className="ml-4">
              Difficoltà: {currentItem.metadata.difficulty_estimate.toFixed(2)} | Regole: {currentItem.metadata.rules.join(', ')}
            </span>
          )}
        </p>
      </header>

      {!testFinished && (
        <div className="fixed top-2 sm:top-4 right-2 sm:right-4 bg-white dark:bg-neutral-800 p-2 sm:p-3 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-10">
          <div className="text-xs sm:text-sm">Tempo:</div>
          <div className={cx(
            'text-2xl sm:text-3xl font-bold',
            timeLeft <= 10 && timeLeft > 5 && 'text-yellow-500 animate-pulse',
            timeLeft <= 5 && 'text-red-500 animate-ping'
          )}>
            {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        </div>
      )}

      {feedbackMessage && (
        <div
          className={cx(
            'p-2 sm:p-3 mb-3 text-center rounded-md text-xs sm:text-base border',
            isCorrect === true && 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200',
            isCorrect === false && 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
          )}
        >
          {feedbackMessage}
        </div>
      )}

      {!testFinished ? (
        <div className="mb-6 p-2 sm:p-3 md:p-4 border rounded-lg shadow-lg bg-white dark:bg-neutral-900 min-h-[400px] sm:min-h-[480px] md:min-h-[520px] relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm rounded-lg">
              <p>Generazione item...</p>
            </div>
          ) : currentItem ? (
            <div>
              {/* Matrix */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-lg mx-auto mb-6 bg-neutral-200 dark:bg-neutral-700 p-2 rounded shadow-md">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div
                    key={`matrix-cell-${index}`}
                    className="aspect-square bg-white dark:bg-neutral-800 flex items-center justify-center overflow-hidden rounded border"
                  >
                    {index < 8 && currentItem.matrix_cells[index] ? (
                      <img
                        src={`data:image/svg+xml;base64,${currentItem.matrix_cells[index]}`}
                        alt={`Matrix cell ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                    ) : index === 8 ? (
                      <span className="text-4xl text-neutral-500 dark:text-neutral-400 select-none">?</span>
                    ) : (
                      <span className="text-xs">Empty</span>
                    )}
                  </div>
                ))}
              </div>
              {/* Options */}
              <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-3 text-center">Scegli l&apos;opzione corretta:</h3>
              <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
                {currentItem.options.map((optionBase64, optionIndex) => {
                  const isSelected = selectedOption === optionIndex;
                  const showAsCorrect = isCorrect !== null && optionIndex === currentItem.metadata.correct_option_index;
                  const showAsIncorrect = isSelected && isCorrect === false;
                  return (
                    <button
                      key={`option-${optionIndex}`}
                      onClick={() => handleOptionSelect(optionIndex)}
                      disabled={isCorrect !== null || isLoading}
                      className={cx(
                        'aspect-square border-2 rounded-md p-1 shadow-lg hover:shadow-xl transition-all bg-white dark:bg-neutral-800',
                        isCorrect === null && 'border-blue-500 hover:border-blue-700 dark:border-sky-500 dark:hover:border-sky-400 focus:ring-2',
                        showAsCorrect && 'border-green-500 dark:border-green-400 ring-2 animate-pulse',
                        showAsIncorrect && 'border-red-500 dark:border-red-400 ring-2',
                        !showAsCorrect && !showAsIncorrect && isCorrect !== null && 'opacity-50'
                      )}
                      title={`Opzione ${optionIndex + 1}`}
                    >
                      <img
                        src={`data:image/svg+xml;base64,${optionBase64}`}
                        alt={`Option ${optionIndex + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center py-10 text-red-500">Impossibile caricare l&apos;item del test.</p>
          )}
        </div>
      ) : (
        <div className="text-center p-8 border rounded-md bg-white dark:bg-neutral-900">
          <p className="text-lg mb-4">Test completato! Punteggio finale: <span className="font-bold">{score}</span></p>
          <p className="mb-2 text-sm">Grazie per aver completato il test.</p>
        </div>
      )}

      <div className="text-center mt-8">
        <Link href="/" className="text-blue-600 hover:underline dark:text-sky-500 text-xs sm:text-sm">
          Torna alla Dashboard Principale
        </Link>
      </div>
    </div>
  );
}

