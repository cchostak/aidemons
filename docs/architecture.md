# Aidemons Architecture

## Monorepo Shape

```text
aidemons/
  apps/
    api/   # Go + Gin backend, websocket/game services, migrations
    web/   # React + Phaser browser client
  docs/    # Architecture and design notes
```

## Frontend

The browser client uses React for shell UI and Phaser for the active game surface. This split works well for an MMORPG because:

- Phaser owns rendering, camera movement, and the frame loop.
- React owns menus, inventory panes, pet cards, chat shells, and matchmaking UI.
- Vite keeps iteration fast while the project is still discovering its core loops.

The current scene layout is a lightweight vertical slice:

- `BootScene`: generates placeholder textures and shared visual assets
- `WorldScene`: renders the shard floor, avatar, pet companion, and movement

## Backend

The Go backend is structured around domain-first packages:

- `account`: player identity and progression ownership
- `character`: avatar state, stats, and map position
- `item`: item templates and inventory effects
- `pet`: pet archetypes, affinities, and evolution hooks
- `pvp`: matchmaking queues and match summaries

Gin exposes both REST and websocket-friendly entry points so we can start with bootstrap/state endpoints and later grow into realtime shard sync, combat events, chat, and trading.

## Database

PostgreSQL stores durable game state. The initial schema covers:

- accounts
- characters
- pet templates
- owned pets
- item templates
- inventory items
- PvP matches

This is enough for a first gameplay slice while leaving room for guilds, chat logs, world events, and economy systems later.

## Near-Term Next Steps

1. Add authentication and account creation.
2. Move world bootstrap data out of static Go structs and into repositories.
3. Add websocket state replication for nearby entities.
4. Introduce combat formulas, pet skills, and loot drops.
