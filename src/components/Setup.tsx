import { useState, useEffect } from 'react';
import { Player, AIConfig, Role } from '../types';
import { Settings, Play, User, Bot, Globe } from 'lucide-react';
import { Language, t } from '../i18n';

const ROLES: Role[] = [
  'Werewolf', 'Werewolf', 'Werewolf', 'Werewolf',
  'Villager', 'Villager', 'Villager', 'Villager',
  'Seer', 'Witch', 'Hunter', 'Guard'
];

const DEFAULT_NAMES = ["Alice", "Bob", "Charlie", "Dave", "Eve", "Frank", "Grace", "Heidi", "Ivan", "Judy", "Mallory", "Oscar"];

export default function Setup({ onStart, language, setLanguage }: { onStart: (players: Player[]) => void, language: Language, setLanguage: (l: Language) => void }) {
  const [globalAI, setGlobalAI] = useState<AIConfig>(() => {
    const saved = localStorage.getItem('werewolf_globalAI');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini'
    };
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('werewolf_players');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i + 1,
      name: DEFAULT_NAMES[i] || `Player ${i + 1}`,
      type: i === 0 ? 'Human' : 'AI',
      aiConfig: { ...globalAI },
      role: 'Villager',
      isAlive: true,
      isSheriff: false,
      sheriffCandidate: false
    }));
  });

  useEffect(() => {
    localStorage.setItem('werewolf_globalAI', JSON.stringify(globalAI));
  }, [globalAI]);

  useEffect(() => {
    localStorage.setItem('werewolf_players', JSON.stringify(players));
  }, [players]);

  const handleApplyGlobalAI = () => {
    setPlayers(players.map(p => p.type === 'AI' ? { ...p, aiConfig: { ...globalAI } } : p));
  };

  const handleStart = () => {
    const shuffledRoles = [...ROLES].sort(() => Math.random() - 0.5);
    const finalPlayers = players.map((p, i) => ({
      ...p,
      role: shuffledRoles[i]
    }));
    onStart(finalPlayers);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold text-emerald-400 mb-2">{t('setup.title', language)}</h1>
            <p className="text-neutral-400">{t('setup.description', language)}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 transition-colors text-sm font-medium border border-neutral-800"
            >
              <Globe size={16} />
              {language === 'en' ? '中文' : 'English'}
            </button>
            <button 
              onClick={handleStart}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              <Play size={20} /> {t('setup.start', language)}
            </button>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-indigo-400">
            <Settings size={20} /> {t('setup.globalAI', language)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">{t('setup.baseURL', language)}</label>
              <input 
                type="text" 
                value={globalAI.baseURL}
                onChange={e => setGlobalAI({...globalAI, baseURL: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">{t('setup.apiKey', language)}</label>
              <input 
                type="password" 
                value={globalAI.apiKey}
                onChange={e => setGlobalAI({...globalAI, apiKey: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">{t('setup.model', language)}</label>
              <input 
                type="text" 
                value={globalAI.model}
                onChange={e => setGlobalAI({...globalAI, model: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <button 
            onClick={handleApplyGlobalAI}
            className="text-sm bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 px-4 py-2 rounded-lg transition-colors"
          >
            {t('setup.applyAll', language)}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p, i) => (
            <div key={p.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg text-neutral-300">#{p.id}</span>
                <div className="flex bg-neutral-950 rounded-lg p-1">
                  <button 
                    onClick={() => {
                      const newPlayers = [...players];
                      newPlayers[i].type = 'Human';
                      setPlayers(newPlayers);
                    }}
                    className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${p.type === 'Human' ? 'bg-emerald-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    <User size={14} /> {t('setup.human', language)}
                  </button>
                  <button 
                    onClick={() => {
                      const newPlayers = [...players];
                      newPlayers[i].type = 'AI';
                      setPlayers(newPlayers);
                    }}
                    className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${p.type === 'AI' ? 'bg-indigo-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    <Bot size={14} /> {t('setup.ai', language)}
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">{t('setup.name', language)}</label>
                  <input 
                    type="text" 
                    value={p.name}
                    onChange={e => {
                      const newPlayers = [...players];
                      newPlayers[i].name = e.target.value;
                      setPlayers(newPlayers);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                
                {p.type === 'AI' && p.aiConfig && (
                  <div className="pt-2 border-t border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-neutral-500">{t('setup.baseURL', language)}</label>
                      <input 
                        type="text" 
                        value={p.aiConfig.baseURL}
                        onChange={e => {
                          const newPlayers = [...players];
                          newPlayers[i].aiConfig!.baseURL = e.target.value;
                          setPlayers(newPlayers);
                        }}
                        className="w-2/3 bg-neutral-950 border border-neutral-800 rounded p-1 text-xs focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-neutral-500">{t('setup.apiKey', language)}</label>
                      <input 
                        type="password" 
                        value={p.aiConfig.apiKey}
                        onChange={e => {
                          const newPlayers = [...players];
                          newPlayers[i].aiConfig!.apiKey = e.target.value;
                          setPlayers(newPlayers);
                        }}
                        className="w-2/3 bg-neutral-950 border border-neutral-800 rounded p-1 text-xs focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-neutral-500">{t('setup.model', language)}</label>
                      <input 
                        type="text" 
                        value={p.aiConfig.model}
                        onChange={e => {
                          const newPlayers = [...players];
                          newPlayers[i].aiConfig!.model = e.target.value;
                          setPlayers(newPlayers);
                        }}
                        className="w-2/3 bg-neutral-950 border border-neutral-800 rounded p-1 text-xs focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
