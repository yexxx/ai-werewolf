import { GameState } from '../types';
import PlayerCard from './PlayerCard';
import GameLog from './GameLog';
import ActionPanel from './ActionPanel';
import { Eye, EyeOff, Moon, Sun, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Language, t } from '../i18n';

export default function GameBoard({ state, onAction, language }: { state: GameState, onAction: (action: any) => void, language: Language }) {
  const [godView, setGodView] = useState(false);

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-200 font-sans overflow-hidden">
      <div className="w-2/3 flex flex-col border-r border-neutral-800">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black text-emerald-400 tracking-tight">{t('setup.title', language)}</h2>
            <div className="flex items-center gap-2 bg-neutral-800 px-4 py-2 rounded-full border border-neutral-700 shadow-inner">
              {state.phase === 'Night' ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-yellow-400" />}
              <span className="font-bold text-neutral-300">{t(`game.${state.phase.toLowerCase()}`, language)} {state.day}</span>
              <span className="text-neutral-500 text-sm ml-2">({t(`subPhases.${state.subPhase}`, language)})</span>
            </div>
          </div>
          <button 
            onClick={() => setGodView(!godView)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${godView ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            {godView ? <Eye size={18} /> : <EyeOff size={18} />} {t('game.godView', language)}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {state.players.map(p => (
              <PlayerCard key={p.id} player={p} state={{...state, godView}} language={language} />
            ))}
          </div>
        </div>
      </div>
      
      <div className="w-1/3 flex flex-col bg-neutral-950 relative">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md z-10">
          <h3 className="font-bold text-neutral-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {t('game.gameLog', language)}
          </h3>
        </div>
        <GameLog history={state.history} godView={godView} players={state.players} language={language} />
        <ActionPanel state={state} onAction={onAction} godView={godView} language={language} />
        
        {state.phase === 'GameOver' && (
          <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-neutral-900 p-10 rounded-3xl text-center border border-neutral-800 shadow-2xl max-w-md w-full transform transition-all scale-100">
              <h2 className="text-5xl font-black text-emerald-400 mb-6 drop-shadow-lg">{t('game.gameOver', language)}</h2>
              <p className="text-2xl mb-10 font-bold text-neutral-200">
                {state.winner === 'Villagers' ? `🛡️ ${t('game.villagersWin', language)}` : `🐺 ${t('game.werewolvesWin', language)}`}
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-xl transition-transform hover:scale-105 active:scale-95 shadow-lg"
              >
                <RotateCcw size={24} /> {t('game.playAgain', language)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
