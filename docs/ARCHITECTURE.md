# Architecture

## Overview

The Workout Routine Agent is a full-stack RAG (Retrieval-Augmented Generation) application with four layers: a React Native mobile client, a FastAPI API layer, a LangChain/LangGraph agent, and a persisted FAISS knowledge base.

## System Overview

```mermaid
flowchart TB
    subgraph Client["📱 Mobile Client (Expo / React Native)"]
        A1[Home] --> A2[AI Coach]
        A1 --> A3[My Plans]
        A1 --> A4[Exercise Library]
        A1 --> A5[Weekly Calendar]
        A1 --> A6[Progress]
        A1 --> A7[Profile]
    end

    subgraph API["🌐 FastAPI Backend"]
        B1["routes.py<br/>/api/chat · /api/chat/stream · /api/exercises"]
        B2["schemas.py<br/>Pydantic models"]
        B3["config.py<br/>env / paths / constants"]
    end

    subgraph Agent["🧠 LangChain / LangGraph Agent"]
        C1["create_agent<br/>GPT-4o + tools"]
        C2["search_exercise_docs<br/>retriever tool"]
        C3["SYSTEM_PROMPT<br/>inline fitness coach prompt"]
    end

    subgraph KB["📚 Knowledge Base"]
        D1["FAISS Vector Store<br/>(persisted to data/index/)"]
        D2["resources/*.txt<br/>seed fitness documents"]
    end

    Client -->|HTTP / SSE| B1
    B1 --> B2
    B1 --> B3
    B1 --> C1
    C1 --> C2
    C2 --> D1
    D1 -. built from .-> D2
    C3 -. injected into .-> C1

    style Client fill:#EFF6FF,stroke:#2563EB
    style API fill:#F5F3FF,stroke:#7C3AED
    style Agent fill:#ECFDF5,stroke:#10B981
    style KB fill:#FFFBEB,stroke:#F59E0B
```

## Components

### 1. Backend (`backend/app/`)

| Module | Responsibility |
|---|---|
| `main.py` | FastAPI app, CORS, router mounting |
| `config.py` | Centralized env vars, paths, and tuning constants |
| `agent.py` | The RAG pipeline and the LangGraph agent factory |
| `schemas.py` | Pydantic request/response models |
| `routes.py` | `/api/*` HTTP endpoints |
| `scripts/cli.py` | Standalone interactive CLI using the same agent |

### 2. Mobile app (`app/`)

| Area | Responsibility |
|---|---|
| `app/` (expo-router screens) | Home, Chat, Plans, Exercises, Calendar, Progress, Profile |
| `src/api/client.ts` | HTTP client with SSE streaming support |
| `src/store/storage.ts` | AsyncStorage persistence (profile, check-ins, favorites, metrics, plans) |
| `src/types/index.ts` | TypeScript types mirroring `schemas.py` |
| `src/components/ui.tsx` | Shared UI primitives (Screen, Card, Pill, Logo, theme) |

## Data Contract

`backend/app/schemas.py` and `app/src/types/index.ts` define the **same** types:

- `ChatRequest` / `ChatResponse`
- `Exercise` / `ExerciseLibrary`
- `WorkoutItem` / `WorkoutPlan`
- `Profile`
- `BodyMetric`
- `CheckIn`
- `WeeklyPlan`

```mermaid
graph LR
    PY["backend/app/schemas.py<br/>(Pydantic)"] -- mirror --> TS["app/src/types/index.ts<br/>(TypeScript)"]
    TS -- used by --> STORE["store/storage.ts"]
    TS -- used by --> PAGES["app screens"]
    PY -- serialized by --> ROUTES["routes.py"]
```

Keeping them in sync is the contract between backend and app.

## RAG Pipeline

```mermaid
flowchart LR
    SRC[resources/*.txt + *.pdf] -->|DirectoryLoader| DOC[Documents]
    DOC -->|RecursiveCharacterTextSplitter<br/>chunk 1000 / overlap 200| SPLIT[Chunks]
    SPLIT -->|OpenAIEmbeddings<br/>text-embedding-3-small| EMB[Embeddings]
    EMB -->|FAISS.from_documents| IDX[(FAISS Index)]
    IDX -->|save_local| DISK[(data/index/)]
    DISK -. load_local on startup .-> IDX
    IDX -->|as_retriever k=5| RET[Retriever Tool<br/>search_exercise_docs]
    RET -->|wired as tool| AGT[create_agent<br/>GPT-4o]
    AGT --> OUT[Personalized Workout Plan]
```

1. **Load** — `load_documents()` reads all `.pdf` / `.txt` under `backend/data/resources/`.
2. **Split** — `RecursiveCharacterTextSplitter`, chunk size 1000 / overlap 200.
3. **Embed** — `OpenAIEmbeddings(text-embedding-3-small)`.
4. **Index** — `FAISS.from_documents(...)`.
5. **Persist** — `save_local()` to `backend/data/index/`; on startup `load_local()` reuses it, skipping the expensive rebuild.
6. **Agent** — `create_agent(model, tools=[retriever_tool], system_prompt=...)` returns a LangGraph `CompiledStateGraph` supporting `invoke` / `astream`.

## Request Flow (Non-Streaming)

```mermaid
sequenceDiagram
    autonumber
    participant App as 📱 Expo App
    participant API as 🌐 FastAPI (routes.py)
    participant Agent as 🧠 LangGraph Agent
    participant Retriever as 🔍 FAISS Retriever
    participant LLM as 💬 GPT-4o

    App->>API: POST /api/chat { message }
    API->>API: validate (1..2000 chars)
    API->>Agent: agent.ainvoke({ messages })
    Agent->>Retriever: search_exercise_docs(query)
    Retriever-->>Agent: top-k relevant chunks
    Agent->>LLM: prompt + retrieved context
    LLM-->>Agent: generated reply
    Agent-->>API: final AIMessage
    API-->>App: 200 { reply, sources }
```

## Streaming (SSE)

- Backend: `POST /api/chat/stream` → `StreamingResponse` yielding `data: {token}` frames from `agent.astream()`.
- App: `fetch` + `ReadableStream` (an `EventSource` cannot POST), buffering split lines and parsing `data:` frames.

```mermaid
sequenceDiagram
    autonumber
    participant App as 📱 Expo App
    participant API as 🌐 FastAPI
    participant Agent as 🧠 LangGraph Agent
    participant Retriever as 🔍 FAISS
    participant LLM as 💬 GPT-4o

    App->>API: POST /api/chat/stream { message }
    API->>Agent: astream({ messages }, stream_mode="messages")
    loop generation loop
        Agent->>Retriever: retrieve context
        Retriever-->>Agent: chunks (ToolMessage — skipped)
        Agent->>LLM: generate
        LLM-->>Agent: AIMessageChunk tokens
        Agent-->>API: (chunk, metadata)
        API-->>App: data: {"token": "..."}
    end
    API-->>App: data: {"done": true}
```

> **Security note**: `stream_mode="messages"` + an `AIMessageChunk` guard ensure that retrieved document text (ToolMessage content) is **never** forwarded to the client. The test `test_chat_stream_yields_tokens_only` verifies this.

## Persistence Strategy

- **Backend**: FAISS index persisted to disk; rebuild only when `data/index/` is missing.
- **App**: user data (profile, check-ins, favorites, metrics, saved plans) lives on-device in AsyncStorage. No backend database is required for the demo.

## Performance: Agent Singleton

The agent (FAISS load + graph compile) is built **once** and cached module-level in `routes.py`. Subsequent requests reuse the same compiled graph — LangGraph compiled graphs are stateless and safe to share across concurrent requests.

## Design Decisions

| Decision | Rationale |
|---|---|
| Inline system prompt (no `hub.pull`) | Removes a runtime network dependency; keeps the agent offline-capable and unit-testable |
| `create_agent` (LangGraph) instead of legacy `AgentExecutor` | LangChain 1.x API; returns a streamable compiled graph |
| FAISS persistence | Avoids re-embedding the knowledge base on every server start |
| `stream_mode="messages"` for SSE | Token-level increments; prevents leaking retrieved documents |
| Agent singleton cache | Avoids rebuilding the graph on every request |
| Expo web for verification | No Android SDK available; pure-JS components keep web and native compatible |
| Pydantic ↔ TS mirror | Single data contract, reduced drift between backend and app |
