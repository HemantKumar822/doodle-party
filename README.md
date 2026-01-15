# 🎨 Doodle Party

A hand-drawn multiplayer drawing & guessing game built with Next.js, Supabase, and TypeScript.

## Features

- 🎨 **Classic Mode** - Standard drawing & guessing
- ⚡ **Speed Mode** - 50% draw time, 1.5x points, no hints
- 🔄 **Relay Mode** - Drawer rotates 3x during each turn
- 🎵 Background music & sound effects
- 📱 Mobile-responsive design
- 🎭 DiceBear avatar system

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Folder Structure

```
app/
├── _components/    # UI components
├── _contexts/      # React contexts (Audio)
├── _data/          # Word lists
├── _hooks/         # Custom hooks
├── _lib/           # Utilities & game logic
├── _types/         # TypeScript types
├── room/           # Game room route
├── design_system.ts
├── page.tsx        # Home page
└── layout.tsx
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Backend**: Supabase (Realtime + Postgres)
- **Styling**: Tailwind CSS
- **Avatars**: DiceBear
- **Language**: TypeScript

## Deploy

Deploy on [Vercel](https://vercel.com) with Supabase integration.
