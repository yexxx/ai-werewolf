# AI Werewolf

A modern, AI-powered Werewolf (Mafia) game built with React, Tailwind CSS, and LLMs. Play with your friends or against intelligent AI agents that can think, discuss, and strategize.

![Main Screen](./imgs/main.png)

## Features

- **Multi-language Support**: Full support for English and Chinese.
- **Intelligent AI Agents**: AI players use LLMs to simulate human-like reasoning and social deduction.
- **Customizable AI**: Configure different API endpoints, models, and keys for each AI player.
- **God View**: Toggle God View to see all players' roles, thoughts, and private actions.
- **Persistent Configuration**: Your game settings and AI configurations are saved locally.
- **Responsive Design**: Beautiful, dark-themed UI that works on all screen sizes.

## How to Play

1. **Setup**: Configure the 12 players. You can choose which players are human and which are AI.
2. **AI Config**: Set up your LLM provider (OpenAI, DeepSeek, etc.) in the Global AI settings or per player.
3. **Roles**: Roles are shuffled and assigned automatically.
4. **Game Flow**:
   - **Night Phase**: Werewolves discuss and choose a target. Special roles (Seer, Witch, Guard) perform their actions.
   - **Day Phase**: Players discuss the events of the night and vote to exile a suspected werewolf.
5. **Winning**:
   - **Villagers**: Exile all werewolves to win.
   - **Werewolves**: Eliminate enough villagers or gods to win.

![Game Play](./imgs/game.png)

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Framer Motion (Motion)
- **AI**: Integration with various LLM providers via standard OpenAI-compatible APIs.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## License

MIT
