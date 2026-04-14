# Aidemons

Aidemons is a monorepo for a browser-based pet-centric MMORPG inspired by classic creature-collection MMOs. The stack starts with:

- `apps/web`: React + Vite + Phaser for the browser client and game loop
- `apps/api`: Go + Gin for HTTP and realtime game services
- `PostgreSQL`: character, inventory, pet, and PvP persistence

## Quick Start

1. Copy `.env.example` to `.env` if you want custom ports or database settings.
2. Start Postgres:

   ```bash
   npm run db:up
   ```

3. Apply the initial schema:

   ```bash
   npm run db:migrate
   ```

4. Install frontend tooling:

   ```bash
   npm install
   ```

5. Install Go dependencies:

   ```bash
   cd apps/api && go mod tidy
   ```

6. Run the web app and API together:

   ```bash
   npm run dev
   ```

The frontend runs on `http://localhost:5173`, the API on `http://localhost:8080`, and the bundled Postgres container binds to `localhost:5433` to avoid clashing with an existing local database.

The web client now talks to the Gin API through Vite proxy settings by default. For custom environments, use `VITE_API_PROXY_TARGET` / `VITE_WS_PROXY_TARGET` in dev, or `VITE_API_BASE_URL` / `VITE_WS_BASE_URL` when the frontend needs to call a separate deployed backend directly.

## Docker Compose

If you want the whole stack brought up with containers:

```bash
make up
```

That starts Postgres, applies the SQL migration, then starts the API and Vite dev server. Use `make down` to stop everything and `make logs` to tail the stack.

## Supporting Docs

- Architecture notes: [docs/architecture.md](./docs/architecture.md)
- Asset sourcing shortlist: [docs/assets-shortlist.md](./docs/assets-shortlist.md)

## Product Direction

The current scaffold is aimed at an original MMORPG with:

- real-time traversal and combat in the browser
- item, inventory, and loot systems
- pet acquisition, training, and evolution
- shard-based PvP modes and ranked queues

We can safely borrow the genre shape from games like Eudemons while keeping the world, names, art, and combat identity original.
