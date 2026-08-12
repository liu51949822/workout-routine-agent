# Workout Routine Agent

An AI-powered personal training assistant that generates **tailored workout routines** from your fitness notes, exercise-science research, YouTube transcripts, and web articles.

This is an **optimized, full-stack** version of the original [EnkrateiaLucca/workout-routine-agent](https://github.com/EnkrateiaLucca/workout-routine-agent). It upgrades the single-file CLI into:

- A **FastAPI backend** exposing the RAG agent over REST + SSE
- A **React Native mobile app (Expo)** with a rich feature set
- **Persistent FAISS** retrieval (no rebuild on every start)
- **Full documentation** (English) and **offline-runnable tests**

> ⚠️ **Disclaimer**: This project is a technical demonstration and educational reference. Workout suggestions are general guidance and do **not** replace professional medical or fitness advice. Consult a qualified professional before starting any new exercise program, especially if you have pre-existing conditions.

---

## Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Repository Layout](#-repository-layout)
- [Quick Start — Backend](#-quick-start--backend)
- [Quick Start — Mobile App](#-quick-start--mobile-app)
- [API Overview](#-api-overview)
- [How It Works](#-how-it-works)
- [Tests](#-tests)
- [Configuration](#-configuration)
- [Customization](#-customization)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## ✨ Features

**Backend**

- RAG-powered agent (LangChain 1.x + LangGraph) with GPT-4o
- `POST /api/chat` (full response) and `POST /api/chat/stream` (SSE tokens)
- `GET /api/exercises` + `GET /api/exercises/search` — built-in exercise library
- FAISS index **persisted to disk** (`save_local` / `load_local`) — no rebuild on restart
- Inline system prompt (no `hub.pull` runtime network dependency)
- The original interactive CLI is preserved (`python -m app.scripts.cli`)
- 23 pytest tests, fully offline (mocked LLM)

**Mobile App (Expo / React Native)**

- **AI Coach** — chat with the agent, streaming responses
- **My Plans** — save, view, and manage generated plans
- **Exercise Library** — browse by muscle group, search, favorite exercises
- **Weekly Calendar** — pure-JS week view + suggested 5-day split
- **Progress** — workout check-ins, activity log, body metrics (weight / BMI)
- **Profile** — fitness level, goals, equipment, notes
- Local persistence via AsyncStorage (works offline once running)

---

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌────────────────────────┐
│  React Native   │ HTTP │   FastAPI        │ LangGraph │   LangChain RAG      │
│  App (Expo)     │─────▶│   /api/*         │─────────▶│   Agent + Retriever   │
│  7 screens      │◀─────│   SSE stream     │◀─────────│   FAISS (persisted)   │
└─────────────────┘      └──────────────────┘      └────────────────────────┘
                                   │
                                   └──▶ resources/*.txt (knowledge base)
```

- The **app** talks to the **backend** over HTTP; the backend holds the `OPENAI_API_KEY`.
- The **agent** uses a retriever tool backed by a **FAISS** vector store built from `backend/data/resources/*.txt`.
- The **CLI** (`python -m app.scripts.cli`) is a standalone entry point that uses the same agent without any HTTP layer.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

---

## 📁 Repository Layout

```
workout-routine-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI entry point
│   │   ├── config.py         # env / paths / constants
│   │   ├── agent.py          # RAG core: load → split → embed → FAISS → agent
│   │   ├── schemas.py        # Pydantic models (mirrored in the app)
│   │   ├── routes.py         # /api/chat, /api/chat/stream, /api/exercises
│   │   └── scripts/cli.py    # original interactive CLI
│   ├── data/
│   │   ├── resources/        # seed fitness documents (.txt)
│   │   └── index/            # persisted FAISS index (gitignored)
│   ├── tests/                # pytest suite (offline)
│   ├── requirements.txt
│   └── pytest.ini
├── app/                       # Expo React Native app
│   ├── app/                   # expo-router screens
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Home
│   │   ├── chat.tsx           # AI Coach
│   │   ├── plan.tsx           # My Plans
│   │   ├── exercises.tsx      # Exercise Library
│   │   ├── calendar.tsx       # Weekly Calendar
│   │   ├── progress.tsx       # Progress & check-ins
│   │   └── profile.tsx        # Profile
│   └── src/
│       ├── api/client.ts      # backend HTTP client (incl. SSE)
│       ├── store/storage.ts   # AsyncStorage persistence
│       ├── types/index.ts     # TS types (mirror of schemas.py)
│       └── components/ui.tsx  # shared UI primitives
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── APP.md
├── README.md
└── .gitignore
```

---

## 🚀 Quick Start — Backend

### Prerequisites

- Python 3.12+ (tested on 3.14; 3.12 also available)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Create a virtual environment and install

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    |    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Set your API key

```bash
# Windows (PowerShell)
$env:OPENAI_API_KEY="your-key-here"
# macOS / Linux
export OPENAI_API_KEY="your-key-here"
```

### 3. Run the API server

```bash
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

> On first start, the server builds the FAISS index from `data/resources/` and persists it to `data/index/`. Subsequent starts load it from disk (much faster).

### 4. (Alternative) Run the interactive CLI

```bash
cd backend
python -m app.scripts.cli
```

---

## 🚀 Quick Start — Mobile App

### Prerequisites

- Node.js 18+
- npm

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Point the app at your backend

Create a `.env` file in the `app/` directory (or export the variable):

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

> If unset, the app defaults to `http://localhost:8000/api`. For a physical device, use your computer's LAN IP instead of `localhost`.

### 3. Run

```bash
npm run web      # Expo web (works without Android SDK)
# or
npm start        # Expo Go on your phone / emulator
```

Open the printed URL (e.g. http://localhost:8081).

> **Web-only verification note**: This repository was developed and verified on **Expo web** (no Android SDK available). iOS/Android builds use only pure-JS components and should work, but were not tested on real devices.

---

## 🔌 API Overview

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/chat` | Non-streaming agent response `{ reply }` |
| `POST` | `/api/chat/stream` | SSE token stream |
| `GET` | `/api/exercises` | Full exercise library |
| `GET` | `/api/exercises/search?q=` | Filter exercises |

Request body for chat: `{ "message": "Give me a 10-minute core workout" }`.

See [docs/API.md](docs/API.md) for full examples.

---

## 🧠 How It Works

1. **Load** — `agent.py` loads PDF/TXT files from `data/resources/` (`DirectoryLoader`).
2. **Split** — `RecursiveCharacterTextSplitter` (chunk 1000, overlap 200).
3. **Embed & index** — `OpenAIEmbeddings(text-embedding-3-small)` → FAISS vector store.
4. **Persist** — the index is saved with `save_local` and reused via `load_local`.
5. **Agent** — `create_agent` (LangGraph) wires the retriever tool + an inline system prompt to a `gpt-4o` model.
6. **Serve** — FastAPI exposes `invoke` (full) and `astream` (SSE) to the app.

---

## 🧪 Tests

```bash
cd backend
.venv/Scripts/python -m pytest -q
# 23 passed — fully offline (LLM & embeddings are mocked)
```

The app type-checks with:

```bash
cd app
npx tsc --noEmit
```

---

## ⚙️ Configuration

| Variable | Scope | Description |
|---|---|---|
| `OPENAI_API_KEY` | backend | OpenAI API key (required) |
| `MODEL_NAME` | backend | Chat model, default `gpt-4o` |
| `EMBEDDING_MODEL` | backend | Embedding model, default `text-embedding-3-small` |
| `EXPO_PUBLIC_API_URL` | app | Backend base URL, default `http://localhost:8000/api` |

---

## 🛠️ Customization

- **Model**: set `MODEL_NAME` env var or edit `app/agent.py`.
- **Retrieval**: adjust `CHUNK_SIZE` / `CHUNK_OVERLAP` / `RETRIEVER_K` in `app/config.py`.
- **Knowledge base**: add your own `.txt` / `.pdf` files to `backend/data/resources/`, then **delete `backend/data/index/`** so it rebuilds.
- **Exercise library**: edit `EXERCISE_LIBRARY` in `app/routes.py`.
- **System prompt**: edit `SYSTEM_PROMPT` in `app/agent.py`.

---

## 🗺️ Roadmap

- [ ] Backend persistence for plans / check-ins (currently stored on-device)
- [ ] User authentication
- [ ] Voice input & workout timers
- [ ] Image-based form check (vision model)
- [ ] Real-device iOS / Android verification

---

## 📄 License

MIT

## 🙏 Acknowledgements

- Original project: [EnkrateiaLucca/workout-routine-agent](https://github.com/EnkrateiaLucca/workout-routine-agent)
- [LangChain](https://python.langchain.com/) · [LangGraph](https://langchain-ai.github.io/langgraph/) · [FastAPI](https://fastapi.tiangolo.com/) · [Expo](https://expo.dev/)
