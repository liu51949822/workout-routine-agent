# Mobile App Guide

The mobile app is a **React Native** application built with **Expo** and **expo-router**.

> **Verification note**: developed and verified on **Expo web**. iOS/Android builds use only pure-JS components and should work, but were not tested on real devices (no Android SDK / macOS available).

---

## Navigation Map

```mermaid
graph TD
    H[Home] --> C[AI Coach]
    H --> P[My Plans]
    H --> E[Exercise Library]
    H --> W[Weekly Calendar]
    H --> G[Progress]
    H --> F[Profile]

    C -->|save reply| P
    E -->|favorite ⭐| E
    F -->|height / level / goals| G
    W -->|saved plans| W

    style H fill:#2563EB,color:#fff
    style C fill:#2563EB,color:#fff
    style P fill:#7C3AED,color:#fff
    style E fill:#F59E0B,color:#fff
    style W fill:#10B981,color:#fff
    style G fill:#EF4444,color:#fff
    style F fill:#06B6D4,color:#fff
```

## Screens

| Route | Screen | Features |
|---|---|---|
| `/` | Home | Feature menu / navigation hub, brand hero, disclaimer banner |
| `/chat` | AI Coach | Streamed chat with the agent; save the last reply as a plan |
| `/plan` | My Plans | List, view saved plans |
| `/exercises` | Exercise Library | Browse, search by muscle/name, favorite exercises |
| `/calendar` | Weekly Calendar | Pure-JS week view + suggested 5-day split |
| `/progress` | Progress | Workout check-ins, activity log, body metrics (weight/BMI) |
| `/profile` | Profile | Fitness level, goals, equipment, height (BMI), notes |

## Data Layer

All user data is persisted **on-device** with `@react-native-async-storage/async-storage`
(`src/store/storage.ts`):

- Profile
- Workout check-ins
- Favorite exercises
- Body metrics
- Saved plans

This means the app is fully functional even if the backend is temporarily offline
for the local features (Plans, Exercises, Calendar, Progress, Profile). Only the
AI Coach screen requires the backend.

```mermaid
graph LR
    subgraph Local["💾 AsyncStorage (on-device)"]
        PRO[Profile]
        CHK[Check-ins]
        FAV[Favorites]
        MET[Body metrics]
        PLN[Saved plans]
    end

    subgraph Pages["📱 Screens"]
        profile.tsx --> PRO
        progress.tsx --> CHK
        progress.tsx --> MET
        exercises.tsx --> FAV
        plan.tsx --> PLN
        calendar.tsx --> PLN
    end

    style Local fill:#ECFDF5,stroke:#10B981
```

## Networking

`src/api/client.ts` talks to the backend:

- Base URL: `EXPO_PUBLIC_API_URL` env var, default `http://localhost:8000/api`.
- Streaming chat uses `fetch` + `ReadableStream` to consume SSE (`POST` — `EventSource`
  only supports `GET`).

```mermaid
sequenceDiagram
    participant UI as Screen
    participant API as src/api/client.ts
    participant BE as FastAPI backend

    UI->>API: chatStream(message, onToken)
    API->>BE: POST /api/chat/stream
    loop tokens
        BE-->>API: data: {"token":"..."}
        API-->>UI: onToken(token)
    end
    BE-->>API: data: {"done": true}
    UI->>UI: streaming = false
```

## Running

```bash
cd app
npm install
EXPO_PUBLIC_API_URL=http://localhost:8000/api npm run web
```

For a physical phone with Expo Go, replace `localhost` with your computer's LAN IP.

## Adding a Screen

1. Add a route file under `app/` (e.g. `app/timer.tsx`).
2. Import shared UI from `../src/components/ui`.
3. Add a menu entry on the Home screen (`app/index.tsx`).

## Type Safety

Edit `src/types/index.ts` when backend schemas change — it mirrors
`backend/app/schemas.py`.
