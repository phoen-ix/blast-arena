# BlastArena

A multiplayer online grid-based explosive arena game. Navigate a grid, place bombs to destroy walls and opponents, collect power-ups, and compete in Free-for-All, Teams, or Battle Royale modes.

## Quick Start

```bash
# Clone and configure
cp .env.example .env
# Edit .env with your settings

# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production
docker compose up --build -d
```

Open `http://localhost:8080` in your browser.

## Game Modes

- **Free-for-All**: Last player standing wins
- **Teams**: Two teams compete; last team standing wins
- **Battle Royale**: Shrinking zone forces players together

## Controls

- **Arrow Keys / WASD**: Move
- **Space**: Place bomb

## Architecture

```
┌─────────┐     ┌──────────┐     ┌─────────┐
│  Nginx   │────▶│ Backend  │────▶│ MariaDB │
│ (static  │     │ (Express │     └─────────┘
│  + proxy)│     │  +Socket │     ┌─────────┐
└─────────┘     │   .io)   │────▶│  Redis   │
                └──────────┘     └─────────┘
```

All game logic runs server-side. The client sends inputs and renders the authoritative state received from the server.

## License

MIT
