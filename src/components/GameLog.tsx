import { GameEvent, Player } from '../types';
import { useEffect, useRef } from 'react';
import { MessageSquare, Zap, Brain, Info } from 'lucide-react';
import { Language, t } from '../i18n';

export default function GameLog({ history, godView, players, language }: { history: GameEvent[], godView: boolean, players: Player[], language: Language }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-950 font-sans" ref={scrollRef}>
      {history.map((h, i) => {
        const isPrivateForHuman = players.some(p => p.type === 'Human' && (h.privateFor === p.role || h.privateFor === p.id));
        if (!godView && h.privateFor && !isPrivateForHuman) return null;
        if (!godView && h.type === 'Thought') return null;
        
        let color = 'text-neutral-300';
        let bg = 'bg-neutral-900';
        let icon = <Info size={16} />;
        
        if (h.type === 'System') {
          color = 'text-yellow-400 font-medium';
          bg = 'bg-yellow-950/20 border border-yellow-900/50';
          icon = <Zap size={16} className="text-yellow-500" />;
        }
        if (h.type === 'Action') {
          color = 'text-emerald-400 font-medium';
          bg = 'bg-emerald-950/20 border border-emerald-900/50';
          icon = <Zap size={16} className="text-emerald-500" />;
        }
        if (h.type === 'Thought') {
          color = 'text-indigo-300 italic';
          bg = 'bg-indigo-950/20 border border-indigo-900/50';
          icon = <Brain size={16} className="text-indigo-400" />;
        }
        if (h.type === 'Speech') {
          color = 'text-neutral-200';
          bg = 'bg-neutral-800/50 border border-neutral-700/50';
          icon = <MessageSquare size={16} className="text-neutral-500" />;
        }
        
        return (
          <div key={i} className={`p-4 rounded-xl flex gap-3 items-start shadow-sm ${bg}`}>
            <div className="mt-0.5 opacity-80">{icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded-md">{t('game.day', language)} {h.day}</span>
                {h.privateFor && (
                  <span className="text-xs font-bold text-rose-400 bg-rose-950/30 px-2 py-0.5 rounded-md">{t('game.private', language)}</span>
                )}
              </div>
              <div className={`text-sm leading-relaxed ${color}`}>
                {h.message}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
