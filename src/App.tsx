import { useState, useRef, useEffect } from 'react';
import Setup from './components/Setup';
import GameBoard from './components/GameBoard';
import { GameEngine } from './engine/GameEngine';
import { GameState, Player } from './types';
import { Language } from './i18n';
import './index.css';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('werewolf_language') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('werewolf_language', language);
  }, [language]);

  const handleStart = (players: Player[]) => {
    const engine = new GameEngine(players, (newState) => {
      setGameState({ ...newState });
    }, language);
    engineRef.current = engine;
    engine.start();
  };

  const handleHumanAction = (action: any) => {
    if (engineRef.current && engineRef.current.humanResolver) {
      engineRef.current.humanResolver(action);
      engineRef.current.humanResolver = null;
    }
  };

  if (!gameState) {
    return <Setup onStart={handleStart} language={language} setLanguage={setLanguage} />;
  }

  return <GameBoard state={gameState} onAction={handleHumanAction} language={language} />;
}
