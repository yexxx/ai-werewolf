export type Role = 'Villager' | 'Werewolf' | 'Seer' | 'Witch' | 'Hunter' | 'Guard';
export type PlayerType = 'Human' | 'AI';

export interface AIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface Player {
  id: number;
  name: string;
  type: PlayerType;
  aiConfig?: AIConfig;
  role: Role;
  isAlive: boolean;
  isSheriff: boolean;
  sheriffCandidate: boolean;
  deathReason?: 'Exiled' | 'Killed' | 'Poisoned' | 'Shot';
  deathDay?: number;
  potionUsed?: { heal: boolean; poison: boolean };
}

export type GamePhase = 'Setup' | 'Night' | 'Day' | 'GameOver';
export type NightSubPhase = 'Guard' | 'WerewolfDiscuss' | 'Werewolf' | 'Witch' | 'Seer';
export type DaySubPhase = 'Announce' | 'SheriffRun' | 'SheriffSpeech' | 'SheriffVote' | 'Speech' | 'Vote' | 'LastWords' | 'HunterShoot';

export interface GameEvent {
  day: number;
  type: 'System' | 'Speech' | 'Action' | 'Thought';
  message: string;
  playerId?: number;
  privateFor?: Role | number;
}

export interface GameState {
  phase: GamePhase;
  subPhase?: NightSubPhase | DaySubPhase;
  day: number;
  players: Player[];
  history: GameEvent[];
  currentPlayerId?: number;
  waitingForHuman: boolean;
  actionPrompt: string;
  validTargets: number[];
  isSpeech: boolean;
  
  nightActions: {
    lastProtected?: number;
    guardProtect?: number;
    werewolfKillTarget?: number;
    witchSave?: boolean;
    witchPoison?: number;
    seerCheck?: number;
  };
  
  diedTonight: number[];
  winner?: 'Villagers' | 'Werewolves';
  godView: boolean;
}
