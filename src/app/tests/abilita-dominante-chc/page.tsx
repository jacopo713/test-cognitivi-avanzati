// src/app/tests/abilita-dominante-chc/page.tsx
'use client'; 

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { GeneratedItemWithBase64, generateFullMatrixItem } from './matrix-item-generator';

const MAX_DIFFICULTY_LEVEL = 3;
const ITEM_TIME_LIMIT_SECONDS = 60; 
const FEEDBACK_DURATION_MS = 2000; 

const cx = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

export default function ProceduralMatrixCATPage() {
  const [currentItem, setCurrentItem] = useState<GeneratedItemWithBase64 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDifficultyLevel, setCurrentDifficultyLevel] = useState(1);
  
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const [score, setScore] = useState(0);
  const [itemsAttempted, setItemsAttempted] = useState(0); // This will serve as itemGlobalIndex
  
  const [timeLeft, setTimeLeft] = useState(ITEM_TIME_LIMIT_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadNewItem = useCallback((difficulty: number, itemIndex: number) => {
    setIsLoading(true);
    setFeedbackMessage(null);
    setSelectedOption(null);
    setIsCorrect(null);
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);

    try {
      // Pass itemsAttempted (as itemIndex) to the generator
      const item = generateFullMatrixItem(difficulty, itemIndex); 
      setCurrentItem(item);
      setTimeLeft(ITEM_TIME_LIMIT_SECONDS);
    } catch (error) {
      console.error("Error generating matrix item:", error);
      setCurrentItem(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect for loading items, now depends on itemsAttempted as well for pattern changes
  useEffect(() => {
    // itemsAttempted is 0-indexed, so for the first item, it's 0.
    loadNewItem(currentDifficultyLevel, itemsAttempted);
  }, [currentDifficultyLevel, itemsAttempted, loadNewItem]);


  useEffect(() => { // Timer effect
    if (!isLoading && currentItem && timeLeft > 0 && isCorrect === null) {
      timerRef.current = setInterval(() => setTimeLeft(prevTime => prevTime - 1), 1000);
    } else if (timeLeft === 0 && isCorrect === null) {
      if (timerRef.current) clearInterval(timerRef.current);
      handleTimeUp();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLoading, currentItem, timeLeft, isCorrect]);


  const proceedToNextItem = useCallback(() => {
    // Difficulty logic remains: increase on correct, or stay same/decrease
    if (isCorrect) {
      if (currentDifficultyLevel < MAX_DIFFICULTY_LEVEL) {
        setCurrentDifficultyLevel(prev => prev + 1);
      }
      // setItemsAttempted will trigger useEffect to load new item with new pattern if criteria met
    } else {
      // If incorrect, difficulty might decrease or stay same. For now, it stays.
      // setItemsAttempted will still trigger new item load.
    }
    // The actual loading of the new item is handled by the useEffect watching itemsAttempted & currentDifficultyLevel
    // We just need to make sure itemsAttempted is updated AFTER feedback to trigger the load.
    // This is handled by handleAnswer incrementing itemsAttempted.
    // The loadNewItem in useEffect will use the updated itemsAttempted.
  }, [isCorrect, currentDifficultyLevel]);


  const handleAnswer = (isTimeout: boolean, selectedAnswerIndex?: number) => {
    if (!currentItem || isCorrect !== null) return; 

    if (timerRef.current) clearInterval(timerRef.current);
    // Increment itemsAttempted HERE, so the next useEffect for loadNewItem uses the new index
    // setItemsAttempted(prev => prev + 1); // This will be done *after* feedback normally

    if (isTimeout) {
      setIsCorrect(false);
      setFeedbackMessage("Tempo scaduto!");
      setSelectedOption(null); 
    } else if (selectedAnswerIndex !== undefined) {
      setSelectedOption(selectedAnswerIndex);
      if (selectedAnswerIndex === currentItem.correctOptionIndex) {
        setIsCorrect(true);
        setFeedbackMessage("Corretto!");
        setScore(prev => prev + currentItem.difficultyLevelUsed * (currentItem.patternTypeUsed || 1)); 
      } else {
        setIsCorrect(false);
        setFeedbackMessage(`Sbagliato. La risposta corretta era l'opzione ${currentItem.correctOptionIndex + 1}.`);
      }
    }

    feedbackTimerRef.current = setTimeout(() => {
      setItemsAttempted(prev => prev + 1); // Increment here to trigger next item load via useEffect
      // proceedToNextItem will be implicitly called by state changes if difficulty changes
      // If difficulty doesn't change, the change in itemsAttempted alone triggers the load
      if (isCorrect && currentDifficultyLevel < MAX_DIFFICULTY_LEVEL) {
         setCurrentDifficultyLevel(prev => prev + 1);
      } else if (isCorrect && currentDifficultyLevel === MAX_DIFFICULTY_LEVEL) {
         // Stay at max, but itemsAttempted has changed, so new item of same diff, new pattern if applicable
      } else {
         // Incorrect or timeout, difficulty doesn't change, itemsAttempted change loads new
      }
    }, FEEDBACK_DURATION_MS);
  };
  
  const handleOptionSelect = (selectedIndex: number) => handleAnswer(false, selectedIndex);
  const handleTimeUp = () => handleAnswer(true);
  
  const difficultyStars = Array(MAX_DIFFICULTY_LEVEL).fill(0).map((_, i) => (
    <span key={i} className={cx("text-xl sm:text-2xl", i < (currentItem?.difficultyLevelUsed || currentDifficultyLevel) ? "text-yellow-400" : "text-gray-300 dark:text-gray-600")}>★</span>
  ));

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 font-[family-name:var(--font-geist-sans)] text-[var(--foreground)]">
      <header className="mb-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">Test: Matrici Procedurali Adattive</h1>
        <div className="my-1 sm:my-2 flex justify-center items-center space-x-1">{difficultyStars}</div>
        <p className="text-md sm:text-lg opacity-80">Punteggio: <span className="font-bold text-green-500">{score}</span></p>
        <p className="text-xs sm:text-sm opacity-70">Item: {itemsAttempted + 1} {currentItem && `(Pattern: ${currentItem.patternTypeUsed})`}</p>
        {currentItem && currentItem.rules && <p className="text-xs opacity-60 mt-1">{currentItem.rules.join(' | ')}</p>}
      </header>

      <div className="fixed top-2 sm:top-4 right-2 sm:right-4 bg-white dark:bg-neutral-800 p-2 sm:p-3 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-10">
        <div className="text-xs sm:text-sm">Tempo:</div>
        <div className={cx("text-2xl sm:text-3xl font-bold", timeLeft <= 10 && timeLeft > 5 && "text-yellow-500 animate-pulse", timeLeft <= 5 && "text-red-500 animate-ping")}>
          {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>

      {feedbackMessage && (
        <div className={cx( "p-2 sm:p-3 mb-3 text-center rounded-md text-xs sm:text-base T",
          isCorrect === true && "bg-green-100 dark:bg-green-800 border text-green-700 dark:text-green-200",
          isCorrect === false && "bg-red-100 dark:bg-red-800 border text-red-700 dark:text-red-200",
        )}> {feedbackMessage} </div>
      )}
      
      <div className="mb-6 p-2 sm:p-3 md:p-4 border rounded-lg shadow-lg bg-white dark:bg-neutral-900 min-h-[400px] sm:min-h-[480px] md:min-h-[520px] relative">
        {isLoading ? ( <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm rounded-lg"><p>Generazione item...</p></div>
        ) : currentItem ? (
          <div>
            <div className="grid grid-cols-3 gap-px md:gap-0.5 w-[calc(96px*3+2*0.5px)] xs:w-[calc(112px*3+2*0.5px)] sm:w-[calc(128px*3+2*0.5px)] md:w-[calc(160px*3+2*0.5px)] lg:w-[calc(192px*3+2*1px)] xl:w-[calc(224px*3+2*1px)] mx-auto mb-4 bg-neutral-300 dark:bg-neutral-700 p-px md:p-0.5 rounded shadow-md">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={`matrix-cell-${index}`} className="w-[96px] h-[96px] xs:w-[112px] xs:h-[112px] sm:w-[128px] sm:h-[128px] md:w-[160px] md:h-[160px] lg:w-[192px] lg:h-[192px] xl:w-[224px] xl:h-[224px] bg-white dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
                  {index < 8 && currentItem.matrixCellsBase64[index] ? ( <img src={`data:image/svg+xml;base64,${currentItem.matrixCellsBase64[index]}`} alt={`Cell ${index + 1}`} className="w-full h-full object-contain"/>
                  ) : index === 8 ? ( <span className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-neutral-500 dark:text-neutral-400 select-none">?</span>
                  ) : ( <span className="text-xs">Vuota</span> )}
                </div>
              ))}
            </div>
            <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 sm:mb-3 text-center mt-4 md:mt-6">Scegli l'opzione corretta:</h3>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:gap-3 max-w-[280px] xs:max-w-[320px] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg mx-auto">
              {currentItem.optionsBase64.map((optionBase64, optionIndex) => {
                const isSelected = selectedOption === optionIndex;
                const showAsCorrect = isCorrect !== null && optionIndex === currentItem.correctOptionIndex;
                const showAsIncorrect = isSelected && isCorrect === false;
                return (
                  <button key={`option-${optionIndex}`} onClick={() => handleOptionSelect(optionIndex)} disabled={isCorrect !== null || isLoading} 
                    className={cx( "border-2 rounded-md p-0.5 sm:p-1 shadow-lg hover:shadow-xl T bg-white dark:bg-neutral-800 D",
                      isCorrect === null && "border-blue-500 hover:border-blue-700 dark:border-sky-500 dark:hover:border-sky-400 focus:ring-2 F",
                      showAsCorrect && "border-green-500 dark:border-green-400 ring-2 sm:ring-4 RG animate-pulse",
                      showAsIncorrect && "border-red-500 dark:border-red-400 ring-2 sm:ring-4 RR",
                      !showAsCorrect && !showAsIncorrect && isCorrect !== null && "opacity-50 BND" 
                    )} title={`Opzione ${optionIndex + 1}`} >
                    <img src={`data:image/svg+xml;base64,${optionBase64}`} alt={`Option ${optionIndex + 1}`} className="w-full h-full object-contain"/>
                  </button>
                );
              })}
            </div>
          </div>
        ) : ( <p className="text-center py-10 text-red-500"> Impossibile caricare l'item del test. </p> )}
      </div>
      <div className="text-center mt-8"> <Link href="/" className="text-blue-600 hover:underline dark:text-sky-500 text-xs sm:text-sm"> Torna alla Dashboard Principale </Link> </div>
    </div>
  );
}
