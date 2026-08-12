# API Reference

Base URL: `http://localhost:8000` (configurable via `EXPO_PUBLIC_API_URL` in the app).

Interactive docs: http://localhost:8000/docs (Swagger UI).

---

## GET `/api/health`

Health check.

**Response**

```json
{ "status": "healthy" }
```

---

## POST `/api/chat`

Send a message to the workout agent and receive a full (non-streaming) reply.

**Request body**

```json
{ "message": "Give me a 10-minute core workout" }
```

**Responses**

- `200`:

```json
{
  "reply": "Here is a 10-minute core workout...",
  "sources": []
}
```

- `422` — empty message or message > 2000 chars.
- `502` — missing `OPENAI_API_KEY` or agent error.

---

## POST `/api/chat/stream`

Stream the agent's reply as Server-Sent Events. The mobile app consumes this
with `fetch` + `ReadableStream` (SSE via POST).

**Request body** — same as `/api/chat`.

**Response** — `text/event-stream`:

```
data: {"token": "Here"}

data: {"token": " is"}

data: {"token": " your plan"}

data: {"done": true}

```

| Frame | Meaning |
|---|---|
| `{"token": "..."}` | A piece of generated text |
| `{"error": "..."}` | Streaming error |
| `{"done": true}` | Stream complete |

---

## GET `/api/exercises`

Return the full built-in exercise library.

**Response**

```json
{
  "total": 8,
  "exercises": [
    {
      "name": "Plank",
      "muscle_group": "Core",
      "equipment": "None",
      "difficulty": "beginner",
      "instructions": ["Forearms on floor, body straight.", "Brace core and hold."]
    }
  ]
}
```

---

## GET `/api/exercises/search?q=<query>`

Filter the exercise library by name or muscle group.

**Example**

```
GET /api/exercises/search?q=core
```

**Response** — same shape as `/api/exercises`, with only matching items. Empty
query returns the full library.
