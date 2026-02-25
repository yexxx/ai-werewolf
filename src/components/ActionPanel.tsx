import { useState } from 'react';
import { GameState } from '../types';
import { Send, SkipForward } from 'lucide-react';
import { Language, t } from '../i18n';

export default function ActionPanel({ state, onAction, godView, language }: { state: GameState, onAction: (action: any) => void, godView: boolean, language: Language }) {
  const [speech, setSpeech] = useState("");

  if (!state.waitingForHuman) {
    const showPlayer = state.phase === 'Day' || godView;
    return (
      <div className="p-6 bg-neutral-900 border-t border-neutral-800 flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium animate-pulse">
            {showPlayer && state.currentPlayerId ? `${t('game.waitingFor', language)} ${state.currentPlayerId}...` : t('game.actionsInProgress', language)}
          </p>
        </div>
      </div>
    );
  }

  const currentPlayer = state.players.find(p => p.id === state.currentPlayerId);

  return (
    <div className="p-6 bg-neutral-900 border-t border-neutral-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
          <span className="bg-emerald-950 px-3 py-1 rounded-lg text-sm">Your Turn</span>
          {currentPlayer?.name} ({currentPlayer?.role})
        </h3>
      </div>
      
      <p className="mb-6 text-neutral-300 font-medium bg-neutral-800 p-4 rounded-xl border border-neutral-700">
        {state.actionPrompt}
      </p>
      
      {state.isSpeech && (
        <textarea 
          className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-4 mb-6 text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none transition-all"
          rows={3}
          placeholder="Type your speech here..."
          value={speech}
          onChange={e => setSpeech(e.target.value)}
        />
      )}

      <div className="flex flex-wrap gap-3">
        {state.validTargets.map(targetId => {
          const isSkip = targetId === 0;
          const hasSpeech = speech.trim().length > 0;
          let btnText = isSkip ? (hasSpeech ? t('game.sendMessage', language) : t('game.skip', language)) : `${t('game.targetPlayer', language)} ${targetId}`;
          
          return (
            <button 
              key={targetId}
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-lg
                ${isSkip ? (hasSpeech ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200') : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
              onClick={() => {
                onAction({ action: targetId, speech });
                setSpeech("");
              }}
            >
              {isSkip ? (hasSpeech ? <Send size={18} /> : <SkipForward size={18} />) : <Send size={18} />}
              {btnText}
            </button>
          );
        })}
        {state.validTargets.length === 0 && (
          <button 
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            onClick={() => {
              onAction({ action: 0, speech });
              setSpeech("");
            }}
          >
            <Send size={18} /> {t('game.confirm', language)}
          </button>
        )}
      </div>
    </div>
  );
}
