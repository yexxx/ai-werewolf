import { Player, GameState, Role, AIConfig } from '../types';
import { t, Language } from '../i18n';

const roleDescriptions: Record<Role, string> = {
  Villager: "You are a Villager. You have no special abilities. Find the werewolves and vote them out.",
  Werewolf: "You are a Werewolf. You wake up at night to kill a player. Try to blend in during the day. Your fellow werewolves are: {wolfList}",
  Seer: "You are the Seer. Every night you can check one player to see if they are a Werewolf or Good.",
  Witch: "You are the Witch. You have one poison and one antidote. You will be told who was killed at night and can choose to save them, or you can poison someone.",
  Hunter: "You are the Hunter. If you are killed or exiled, you can shoot one player to take them down with you.",
  Guard: "You are the Guard. Every night you can protect one player from being killed. You cannot protect the same player two nights in a row."
};

function buildAIPrompt(player: Player, state: GameState, actionPrompt: string, validTargets: number[], isSpeech: boolean, language: string) {
  const visibleHistory = state.history.filter(h => 
    !h.privateFor || 
    h.privateFor === player.role || 
    h.privateFor === player.id
  );

  const historyText = visibleHistory.map(h => `[Day ${h.day}] ${h.type}: ${h.message}`).join('\n');
  const alivePlayers = state.players.filter(p => p.isAlive).map(p => `${p.id}(${p.name})`).join(', ');

  let roleDesc = roleDescriptions[player.role];
  if (player.role === 'Werewolf') {
    const wolves = state.players.filter(p => p.role === 'Werewolf').map(p => `${p.id}(${p.name})`).join(', ');
    roleDesc = roleDesc.replace('{wolfList}', wolves);
    roleDesc += `\n[SECRET] Your Werewolf teammates are: ${wolves}. Do not attack them!`;
  }

  const langInstruction = language === 'zh' ? 'Chinese (简体中文)' : 'English';

  return `You are playing a 12-player game of Werewolf.
Your Player ID: ${player.id}
Your Name: ${player.name}
Your Role: ${player.role}

Role Description:
${roleDesc}

Game State:
Phase: ${state.phase} - ${state.subPhase} (Day ${state.day})
Alive Players: ${alivePlayers}

History (What you know):
${historyText}

Instruction:
${actionPrompt}
Valid targets (Player IDs): ${validTargets.length > 0 ? validTargets.join(', ') : 'None'} (Use 0 to skip/abstain/no target).

CRITICAL INSTRUCTION:
1. You MUST respond with ONLY a valid JSON object. Do not include markdown formatting like \`\`\`json.
2. You MUST use ${langInstruction} for your "thought" and "speech".
The JSON object must have exactly these keys:
{
  "thought": "Your internal reasoning for your action (in ${langInstruction})",
  "speech": "${isSpeech ? `What you say aloud to the group (in ${langInstruction})` : ""}",
  "action": ${validTargets.length > 0 ? "An integer from the valid targets list" : "0"}
}`;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export class GameEngine {
  state: GameState;
  updateUI: (state: GameState) => void;
  humanResolver: ((value: any) => void) | null = null;
  language: Language;

  constructor(players: Player[], updateUI: (state: GameState) => void, language: Language = 'en') {
    this.state = {
      phase: 'Night',
      day: 1,
      players,
      history: [],
      nightActions: {},
      diedTonight: [],
      waitingForHuman: false,
      actionPrompt: "",
      validTargets: [],
      isSpeech: false,
      godView: false
    };
    this.updateUI = updateUI;
    this.language = language;
  }

  log(message: string, type: 'System' | 'Speech' | 'Action' | 'Thought' = 'System', privateFor?: Role | number) {
    this.state.history.push({ day: this.state.day, type, message, privateFor });
    this.updateUI({ ...this.state });
  }

  async start() {
    this.log(t('log.gameStarted', this.language));
    await this.runLoop();
  }

  async runLoop() {
    while (this.state.phase !== 'GameOver') {
      if (this.state.phase === 'Night') {
        await this.handleNight();
      } else if (this.state.phase === 'Day') {
        await this.handleDay();
      }
    }
  }

  async getPlayerAction(player: Player, prompt: string, validTargets: number[], isSpeech: boolean = false) {
    if (!player.isAlive) return null;

    this.state.currentPlayerId = player.id;
    this.state.actionPrompt = prompt;
    this.state.validTargets = validTargets;
    this.state.isSpeech = isSpeech;
    this.updateUI({ ...this.state });
    await delay(500);

    if (player.type === 'Human') {
      this.state.waitingForHuman = true;
      this.updateUI({ ...this.state });
      return new Promise<any>((resolve) => {
        this.humanResolver = (val) => {
          this.state.waitingForHuman = false;
          this.updateUI({ ...this.state });
          resolve(val);
        };
      });
    } else {
      return await this.callAIPlayer(player, prompt, validTargets, isSpeech);
    }
  }

  async callAIPlayer(player: Player, prompt: string, validTargets: number[], isSpeech: boolean) {
    if (!player.aiConfig || !player.aiConfig.apiKey) {
      return { action: validTargets[0] || 0, speech: t('log.unconfiguredAI', this.language) };
    }
    
    const systemPrompt = buildAIPrompt(player, this.state, prompt, validTargets, isSpeech, this.language);
    
    try {
      const res = await fetch(`${player.aiConfig.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${player.aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: player.aiConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: "Make your decision now. Output ONLY JSON." }
          ],
          temperature: 0.7
        })
      });
      
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      const content = data.choices[0].message.content;
      
      const match = content.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : content;
      const parsed = JSON.parse(jsonStr);
      
      let action = parseInt(parsed.action);
      if (isNaN(action) || (validTargets.length > 0 && !validTargets.includes(action) && action !== 0)) {
         action = validTargets.length > 0 ? validTargets[0] : 0;
      }
      
      if (parsed.thought) {
        this.log(t('log.thought', this.language, { id: player.id, thought: parsed.thought }), 'Thought', player.id);
      }

      return {
        thought: parsed.thought || "",
        speech: parsed.speech || "",
        action: action
      };
    } catch (e) {
      console.error("AI Error for player", player.id, e);
      return { action: validTargets[0] || 0, speech: "I encountered an error." };
    }
  }

  getMajority(votes: number[], tieBreaker: 'random' | 'none' = 'none') {
    const counts: Record<number, number> = {};
    for (const v of votes) {
      counts[v] = (counts[v] || 0) + 1;
    }
    let max = 0;
    let candidates: number[] = [];
    for (const [v, c] of Object.entries(counts)) {
      if (c > max) {
        max = c;
        candidates = [parseInt(v)];
      } else if (c === max) {
        candidates.push(parseInt(v));
      }
    }
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1 && tieBreaker === 'random') return candidates[Math.floor(Math.random() * candidates.length)];
    return 0;
  }

  async handleNight() {
    this.state.phase = 'Night';
    this.state.subPhase = 'Guard';
    this.state.nightActions = { lastProtected: this.state.nightActions.guardProtect };
    this.updateUI({ ...this.state });

    const guard = this.state.players.find(p => p.role === 'Guard' && p.isAlive);
    if (guard) {
      const validTargets = this.state.players.filter(p => p.isAlive && p.id !== this.state.nightActions.lastProtected).map(p => p.id);
      const action = await this.getPlayerAction(guard, t('prompts.guard', this.language), [0, ...validTargets]);
      if (action) {
        this.state.nightActions.guardProtect = action.action;
        this.log(t('log.guardProtected', this.language, { target: action.action }), 'Action', 'Guard');
      }
    }

    this.state.subPhase = 'WerewolfDiscuss';
    this.updateUI({ ...this.state });
    const wolves = this.state.players.filter(p => p.role === 'Werewolf' && p.isAlive);
    
    const aiWolves = wolves.filter(w => w.type === 'AI');
    const humanWolves = wolves.filter(w => w.type === 'Human');

    const aiPromises = aiWolves.map(wolf => 
      this.callAIPlayer(wolf, t('prompts.wolfDiscuss', this.language), [0], true)
    );

    for (const wolf of humanWolves) {
      const action = await this.getPlayerAction(wolf, t('prompts.wolfDiscuss', this.language), [0], true);
      if (action && action.speech) {
        this.log(t('log.werewolfSpeech', this.language, { id: wolf.id, speech: action.speech }), 'Speech', 'Werewolf');
      }
    }

    if (aiPromises.length > 0) {
      this.state.currentPlayerId = undefined;
      this.state.actionPrompt = t('prompts.wolfDiscussing', this.language);
      this.state.validTargets = [];
      this.state.isSpeech = false;
      this.updateUI({ ...this.state });
      
      const aiResults = await Promise.all(aiPromises);
      aiResults.forEach((action, index) => {
        if (action && action.speech) {
          this.log(t('log.werewolfSpeech', this.language, { id: aiWolves[index].id, speech: action.speech }), 'Speech', 'Werewolf');
        }
      });
    }

    this.state.subPhase = 'Werewolf';
    this.updateUI({ ...this.state });
    const wolfTargets: number[] = [];
    
    const aiVotePromises = aiWolves.map(wolf => {
      const validTargets = this.state.players.filter(p => p.isAlive && p.role !== 'Werewolf').map(p => p.id);
      return this.callAIPlayer(wolf, t('prompts.wolfKill', this.language), [0, ...validTargets], false);
    });

    for (const wolf of humanWolves) {
      const validTargets = this.state.players.filter(p => p.isAlive && p.role !== 'Werewolf').map(p => p.id);
      const action = await this.getPlayerAction(wolf, t('prompts.wolfKill', this.language), [0, ...validTargets]);
      if (action && action.action > 0) {
        wolfTargets.push(action.action);
        this.log(t('log.werewolfKillIntent', this.language, { id: wolf.id, target: action.action }), 'Action', 'Werewolf');
      }
    }

    if (aiVotePromises.length > 0) {
      this.state.currentPlayerId = undefined;
      this.state.actionPrompt = t('prompts.wolfVoting', this.language);
      this.state.validTargets = [];
      this.state.isSpeech = false;
      this.updateUI({ ...this.state });

      const aiVoteResults = await Promise.all(aiVotePromises);
      aiVoteResults.forEach((action, index) => {
        if (action && action.action > 0) {
          wolfTargets.push(action.action);
          this.log(t('log.werewolfKillIntent', this.language, { id: aiWolves[index].id, target: action.action }), 'Action', 'Werewolf');
        }
      });
    }

    let killTarget = 0;
    if (wolfTargets.length > 0) {
      killTarget = this.getMajority(wolfTargets, 'random');
      this.state.nightActions.werewolfKillTarget = killTarget;
      this.log(t('log.werewolvesKill', this.language, { target: killTarget }), 'Action', 'Werewolf');
    }

    this.state.subPhase = 'Witch';
    this.updateUI({ ...this.state });
    const witch = this.state.players.find(p => p.role === 'Witch' && p.isAlive);
    if (witch) {
      if (!witch.potionUsed?.heal && killTarget !== 0) {
        const action = await this.getPlayerAction(witch, t('prompts.witchSave', this.language, { target: killTarget }), [0, killTarget]);
        if (action && action.action === killTarget) {
          this.state.nightActions.witchSave = true;
          witch.potionUsed = { ...witch.potionUsed, heal: true };
          this.log(t('log.witchSaved', this.language, { target: killTarget }), 'Action', 'Witch');
        }
      }
      if (!witch.potionUsed?.poison) {
        const validTargets = this.state.players.filter(p => p.isAlive && p.id !== killTarget).map(p => p.id);
        const action = await this.getPlayerAction(witch, t('prompts.witchPoison', this.language), [0, ...validTargets]);
        if (action && action.action > 0) {
          this.state.nightActions.witchPoison = action.action;
          witch.potionUsed = { ...witch.potionUsed, poison: true };
          this.log(t('log.witchPoisoned', this.language, { target: action.action }), 'Action', 'Witch');
        }
      }
    }

    this.state.subPhase = 'Seer';
    this.updateUI({ ...this.state });
    const seer = this.state.players.find(p => p.role === 'Seer' && p.isAlive);
    if (seer) {
      const validTargets = this.state.players.filter(p => p.isAlive && p.id !== seer.id).map(p => p.id);
      const action = await this.getPlayerAction(seer, t('prompts.seerCheck', this.language), [0, ...validTargets]);
      if (action && action.action > 0) {
        const target = this.state.players.find(p => p.id === action.action);
        const isWolf = target?.role === 'Werewolf';
        const resultText = isWolf ? t('log.seerResultWolf', this.language) : t('log.seerResultGood', this.language);
        this.log(t('log.seerChecked', this.language, { target: action.action, result: resultText }), 'Action', 'Seer');
      }
    }

    let diedTonight: number[] = [];
    if (killTarget > 0) {
      if (this.state.nightActions.guardProtect !== killTarget && !this.state.nightActions.witchSave) {
        diedTonight.push(killTarget);
      }
      if (this.state.nightActions.guardProtect === killTarget && this.state.nightActions.witchSave) {
         diedTonight.push(killTarget);
      }
    }
    if (this.state.nightActions.witchPoison) {
      diedTonight.push(this.state.nightActions.witchPoison);
    }

    this.state.diedTonight = diedTonight;
    for (const id of diedTonight) {
      const p = this.state.players.find(p => p.id === id);
      if (p) {
        p.isAlive = false;
        p.deathReason = 'Killed';
        p.deathDay = this.state.day;
      }
    }

    this.state.phase = 'Day';
    this.updateUI({ ...this.state });
  }

  async handleDay() {
    this.state.subPhase = 'Announce';
    this.updateUI({ ...this.state });

    if (this.state.diedTonight.length === 0) {
      this.log(t('log.peacefulNight', this.language));
    } else {
      this.log(t('log.diedTonight', this.language, { targets: this.state.diedTonight.join(', ') }));
    }
    await delay(2000);

    if (this.checkWin()) return;

    for (const id of this.state.diedTonight) {
      const p = this.state.players.find(p => p.id === id);
      if (p?.role === 'Hunter' && p.deathReason !== 'Poisoned') {
        await this.handleHunter(p);
        if (this.checkWin()) return;
      }
    }

    if (this.state.day === 1) {
      await this.handleSheriffElection();
    }

    this.state.subPhase = 'Speech';
    this.updateUI({ ...this.state });
    const alivePlayers = this.state.players.filter(p => p.isAlive);
    for (const p of alivePlayers) {
      const action = await this.getPlayerAction(p, t('prompts.daySpeech', this.language), [], true);
      if (action?.speech) {
        this.log(t('log.speech', this.language, { id: p.id, speech: action.speech }), 'Speech');
        await delay(1000);
      }
    }

    this.state.subPhase = 'Vote';
    this.updateUI({ ...this.state });
    const votes: number[] = [];
    
    const aiVoters = alivePlayers.filter(p => p.type === 'AI');
    const humanVoters = alivePlayers.filter(p => p.type === 'Human');

    const aiVotePromises = aiVoters.map(p => {
      const validTargets = alivePlayers.map(a => a.id);
      return this.callAIPlayer(p, t('prompts.voteExile', this.language), [0, ...validTargets], false);
    });

    const voteResults: { playerId: number, targetId: number }[] = [];

    for (const p of humanVoters) {
      const validTargets = alivePlayers.map(a => a.id);
      const action = await this.getPlayerAction(p, t('prompts.voteExile', this.language), [0, ...validTargets]);
      voteResults.push({ playerId: p.id, targetId: action?.action || 0 });
    }

    if (aiVotePromises.length > 0) {
      this.state.currentPlayerId = undefined;
      this.state.actionPrompt = t('prompts.playersVoting', this.language);
      this.state.validTargets = [];
      this.state.isSpeech = false;
      this.updateUI({ ...this.state });

      const aiVoteResults = await Promise.all(aiVotePromises);
      aiVoteResults.forEach((action, index) => {
        voteResults.push({ playerId: aiVoters[index].id, targetId: action?.action || 0 });
      });
    }

    voteResults.forEach(res => {
      if (res.targetId > 0) {
        votes.push(res.targetId);
        this.log(t('log.votedFor', this.language, { id: res.playerId, target: res.targetId }), 'System');
      } else {
        this.log(t('log.abstained', this.language, { id: res.playerId }), 'System');
      }
    });

    if (votes.length > 0) {
      const exiledId = this.getMajority(votes, 'none');
      if (exiledId > 0) {
        this.log(t('log.exiled', this.language, { id: exiledId }));
        const exiled = this.state.players.find(p => p.id === exiledId);
        if (exiled) {
          exiled.isAlive = false;
          exiled.deathReason = 'Exiled';
          exiled.deathDay = this.state.day;

          if (this.checkWin()) return;

          this.state.subPhase = 'LastWords';
          this.updateUI({ ...this.state });
          const action = await this.getPlayerAction(exiled, t('prompts.lastWords', this.language), [], true);
          if (action?.speech) {
             this.log(t('log.lastWords', this.language, { id: exiled.id, speech: action.speech }), 'Speech');
             await delay(1000);
          }

          if (exiled.role === 'Hunter') {
            await this.handleHunter(exiled);
            if (this.checkWin()) return;
          }
        }
      } else {
        this.log(t('log.votingTiedExile', this.language));
      }
    } else {
      this.log(t('log.noOneExiled', this.language));
    }

    this.state.day++;
    this.state.phase = 'Night';
    this.updateUI({ ...this.state });
  }

  async handleHunter(hunter: Player) {
    this.state.subPhase = 'HunterShoot';
    this.updateUI({ ...this.state });
    const validTargets = this.state.players.filter(p => p.isAlive).map(p => p.id);
    const action = await this.getPlayerAction(hunter, t('prompts.hunterShoot', this.language), [0, ...validTargets]);
    if (action && action.action > 0) {
      this.log(t('log.hunterShot', this.language, { id: hunter.id, target: action.action }));
      const target = this.state.players.find(p => p.id === action.action);
      if (target) {
        target.isAlive = false;
        target.deathReason = 'Shot';
        target.deathDay = this.state.day;
      }
    } else {
      this.log(t('log.hunterNoShoot', this.language, { id: hunter.id }));
    }
  }

  async handleSheriffElection() {
    this.state.subPhase = 'SheriffRun';
    this.updateUI({ ...this.state });
    const candidates: number[] = [];
    for (const p of this.state.players) {
      const action = await this.getPlayerAction(p, t('prompts.runSheriff', this.language), [0, p.id]);
      if (action && action.action === p.id) {
        candidates.push(p.id);
        p.sheriffCandidate = true;
        this.log(t('log.runningForSheriff', this.language, { id: p.id }));
      }
    }

    if (candidates.length > 0) {
      this.state.subPhase = 'SheriffSpeech';
      this.updateUI({ ...this.state });
      for (const cid of candidates) {
        const p = this.state.players.find(p => p.id === cid)!;
        const action = await this.getPlayerAction(p, t('prompts.sheriffSpeech', this.language), [], true);
        if (action?.speech) {
          this.log(t('log.sheriffSpeech', this.language, { id: p.id, speech: action.speech }), 'Speech');
          await delay(1000);
        }
      }

      this.state.subPhase = 'SheriffVote';
      this.updateUI({ ...this.state });
      const voters = this.state.players.filter(p => !candidates.includes(p.id) && p.isAlive);
      const votes: number[] = [];
      
      const aiVoters = voters.filter(p => p.type === 'AI');
      const humanVoters = voters.filter(p => p.type === 'Human');

      const aiVotePromises = aiVoters.map(p => 
        this.callAIPlayer(p, t('prompts.voteSheriff', this.language), [0, ...candidates], false)
      );

      const voteResults: { playerId: number, targetId: number }[] = [];

      for (const p of humanVoters) {
        const action = await this.getPlayerAction(p, t('prompts.voteSheriff', this.language), [0, ...candidates]);
        voteResults.push({ playerId: p.id, targetId: action?.action || 0 });
      }

      if (aiVotePromises.length > 0) {
        this.state.currentPlayerId = undefined;
        this.state.actionPrompt = t('prompts.sheriffVoting', this.language);
        this.state.validTargets = [];
        this.state.isSpeech = false;
        this.updateUI({ ...this.state });

        const aiVoteResults = await Promise.all(aiVotePromises);
        aiVoteResults.forEach((action, index) => {
          voteResults.push({ playerId: aiVoters[index].id, targetId: action?.action || 0 });
        });
      }

      voteResults.forEach(res => {
        if (res.targetId > 0) {
          votes.push(res.targetId);
          this.log(t('log.votedForSheriff', this.language, { id: res.playerId, target: res.targetId }), 'System');
        }
      });

      if (votes.length > 0) {
        const sheriffId = this.getMajority(votes, 'none');
        if (sheriffId > 0) {
          this.log(t('log.electedSheriff', this.language, { id: sheriffId }));
          const sheriff = this.state.players.find(p => p.id === sheriffId);
          if (sheriff) sheriff.isSheriff = true;
        } else {
          this.log(t('log.votingTiedSheriff', this.language));
        }
      } else {
        this.log(t('log.noSheriffElected', this.language));
      }
    } else {
      this.log(t('log.noOneRanForSheriff', this.language));
    }
  }

  checkWin() {
    const alive = this.state.players.filter(p => p.isAlive);
    const wolves = alive.filter(p => p.role === 'Werewolf');
    const villagers = alive.filter(p => p.role === 'Villager');
    const gods = alive.filter(p => ['Seer', 'Witch', 'Hunter', 'Guard'].includes(p.role));

    if (wolves.length === 0) {
      this.state.winner = 'Villagers';
      this.state.phase = 'GameOver';
      this.log(t('log.villagersWin', this.language));
      this.updateUI({ ...this.state });
      return true;
    }

    if (villagers.length === 0 || gods.length === 0) {
      this.state.winner = 'Werewolves';
      this.state.phase = 'GameOver';
      this.log(t('log.werewolvesWin', this.language));
      this.updateUI({ ...this.state });
      return true;
    }

    return false;
  }
}
