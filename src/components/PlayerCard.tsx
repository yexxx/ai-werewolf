import React from 'react';
import { Player, GameState, Role } from '../types';
import { Skull, Shield, Star, User, Bot } from 'lucide-react';
import { Language, t } from '../i18n';

const roleColors: Record<Role, string> = {
  Villager: 'text-blue-400',
  Werewolf: 'text-red-500',
  Seer: 'text-purple-400',
  Witch: 'text-pink-400',
  Hunter: 'text-orange-400',
  Guard: 'text-emerald-400'
};

interface Props {
  key?: React.Key;
  player: Player;
  state: GameState;
  language: Language;
}

export default function PlayerCard({ player, state, language }: Props) {
  const isCurrent = state.currentPlayerId === player.id && (state.phase === 'Day' || state.godView || state.waitingForHuman);
  const isDead = !player.isAlive;
  const hasHumanWerewolf = state.players.some(p => p.type === 'Human' && p.role === 'Werewolf');
  const showRole = isDead || state.godView || player.type === 'Human' || (hasHumanWerewolf && player.role === 'Werewolf');

  return (
    <div className={`
      relative p-4 rounded-2xl border transition-all duration-300
      ${isCurrent ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-neutral-800 scale-105 z-10' : 'border-neutral-800 bg-neutral-900'}
      ${isDead ? 'opacity-60 grayscale-[50%]' : ''}
    `}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xl font-bold text-neutral-200">#{player.id}</span>
          {player.isSheriff && <Star className="text-yellow-400 fill-yellow-400" size={20} />}
        </div>
        <div className="flex items-center gap-1 text-xs text-neutral-500 bg-neutral-950 px-2 py-1 rounded-md">
          {player.type === 'Human' ? <User size={12} /> : <Bot size={12} />}
          {player.type === 'Human' ? t('setup.human', language) : t('setup.ai', language)}
        </div>
      </div>
      
      <div className="text-lg font-medium text-neutral-100 mb-1 truncate">{player.name}</div>
      
      {showRole ? (
        <div className={`text-sm font-bold flex items-center gap-1 ${roleColors[player.role]}`}>
          <Shield size={14} /> {t(`roles.${player.role}`, language)}
        </div>
      ) : (
        <div className="text-sm font-medium text-neutral-600 flex items-center gap-1">
          <Shield size={14} /> {t('game.unknownRole', language)}
        </div>
      )}

      {isDead && (
        <div className="mt-3 text-xs font-bold text-red-400 flex items-center gap-1 bg-red-950/30 px-2 py-1 rounded-md w-fit">
          <Skull size={12} /> {t('game.dead', language)} ({player.deathReason ? t(`deathReasons.${player.deathReason}`, language) : ''} D{player.deathDay})
        </div>
      )}

      {isCurrent && !isDead && (
        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-neutral-950 text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg">
          {t('game.thinking', language)}
        </div>
      )}
    </div>
  );
}
