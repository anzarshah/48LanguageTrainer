# Immerse48

**Have a Conversation in any Language in 48 Hours**

An open-source, AI-powered language learning app built on three scientifically-proven principles:

1. **Comprehensible Input** — Learn content just above your level
2. **Spaced Repetition** — Review consistently so nothing is forgotten
3. **Output Forcing** — Speak, write, and generate language to cement knowledge

Powered by Claude AI (Anthropic). Runs entirely on your machine.

---

## Features

| Screen / Tool | Description |
|---|---|
| **Language Onboarding** | Choose from 12 languages (or type any), select goals, enter API key |
| **Daily Dashboard** | Streak banner, metrics, progress bars, inline flashcards |
| **Speaking Practice** | Phrase cards, mic recording UI, pronunciation feedback, AI coach notes |
| **Roadmap** | AI-generated personalized learning plan (Day 1 → Month 2+) |
| **Flashcards** | Top 300 words + 20 sentence structures with spaced repetition |
| **Word List** | Searchable frequency word list with learn/export |
| **Script Trainer** | Learn non-Latin scripts with character cards + quiz mode |
| **AI Journal** | Write entries and get corrections from your AI tutor |
| **Conversation Simulator** | Practice scenarios (ordering food, introductions, etc.) |
| **Progress Dashboard** | Streaks, milestones, skills radar, weekly charts |

All content is generated specifically for your target language using Claude Sonnet 4.6 and persisted locally.

---

## Architecture

```
┌─────────────┐       ┌──────────────────┐       ┌───────────┐
│  React App  │──────▶│  Express Server  │──────▶│ Anthropic │
│  (Vite)     │       │  + LLM Wrapper   │       │   API     │
│  Port 5173  │       │  + SQLite Cache  │       └───────────┘
│             │◀──────│  Port 3001       │
└─────────────┘       └──────────────────┘
     localStorage           cache.db
     (user progress)        (LLM responses)
```

### Backend (server/)

- **`llm.js`** — Modular LLM wrapper with timeout, retry (exponential backoff), token tracking, and cost estimation. Provider-agnostic interface (swap Anthropic for another provider by changing one file).
- **`cache.js`** — Deterministic SHA-256 cache keys from normalized request input. SQLite-backed persistent cache with TTL support, hit counting, and `forceRefresh` bypass.
- **`db.js`** — SQLite setup (WAL mode for performance). Two tables: `llm_cache` (cached responses) and `llm_requests` (request log with hit/miss tracking).
- **`index.js`** — Express API with endpoints for chat, content generation, key validation, and cache stats.

### Frontend (src/)

- **React 19 + Vite** — Fast dev server with HMR
- **localStorage** — All user progress (flashcard state, learned words, journal entries, streaks) persists across sessions
- **No routing library** — Conditional rendering for instant navigation

### Caching Strategy

- Same effective input (model + system prompt + user prompt + params) → same cache key
- Cache persists in `cache.db` across app restarts
- Content generation (word lists, roadmap) cached permanently
- Conversation/journal responses cached but can be bypassed with `forceRefresh`
- Cache stats available via `/api/cache/stats`, `/api/cache/entries`, `/api/cache/requests`

### Design System — Atlas Green

- Primary: `#1A3D2B` (deep forest green)
- Accent: `#C8A26E` (warm copper)
- Background: `#F4EFE0` (aged parchment)
- Surface: `#EAE4D0` (light linen)
- Fonts: Playfair Display (headings) + DM Sans (body)
- No gradients, no shadows — flat surfaces only

---

## Project Scope

Immerse48 is a **solo-use, locally-run** language learning app that generates personalized content via Claude AI. It is currently designed for individual use on a single machine.

**What it does today:**
- Generates complete learning material (word lists, sentence structures, roadmap, script info) for any language on first setup
- Provides 9 interactive learning tools (flashcards, speaking practice, AI journal, conversation simulator, etc.)
- Caches all LLM responses in SQLite so repeated requests cost $0
- Stores all user progress in browser localStorage

**What it does NOT do yet:**
- No user authentication or multi-user support
- No cloud database — all data lives locally (SQLite + localStorage)
- No deployment pipeline — runs only on `localhost`
- No mobile-responsive layout optimization
- No offline mode (requires live Anthropic API access for new content)

---

## Requirements

### System Requirements

| Requirement | Details |
|---|---|
| **Node.js** | v18 or higher ([download](https://nodejs.org/)) |
| **npm** | v9+ (ships with Node.js) |
| **OS** | macOS, Linux, or Windows |
| **RAM** | 512 MB+ (SQLite + Express are lightweight) |
| **Disk** | ~200 MB (node_modules + cache database) |
| **Browser** | Any modern browser (Chrome, Firefox, Safari, Edge) |
| **Internet** | Required for Anthropic API calls |

### Accounts & Keys

- **Anthropic API key** — get one at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys). You need a funded account (see [API Costs](#api-costs) below).

### Dependencies

**Production:**

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.4 | UI framework |
| `react-dom` | ^19.2.4 | React DOM renderer |
| `react-router-dom` | ^7.13.2 | Routing (imported, conditional rendering used) |
| `express` | ^5.2.1 | Backend API server |
| `@anthropic-ai/sdk` | ^0.80.0 | Claude API client |
| `better-sqlite3` | ^12.8.0 | SQLite database (LLM response cache) |
| `cors` | ^2.8.6 | Cross-origin request handling |
| `dotenv` | ^17.3.1 | Environment variable loading |
| `concurrently` | ^9.2.1 | Run frontend + backend in parallel |
| `lucide-react` | ^1.7.0 | Icon library |
| `recharts` | ^3.8.1 | Charts for progress dashboard |
| `uuid` | ^13.0.0 | Unique ID generation |

**Dev:**

| Package | Version | Purpose |
|---|---|---|
| `vite` | ^8.0.1 | Build tool + dev server |
| `@vitejs/plugin-react` | ^6.0.1 | React Fast Refresh for Vite |
| `eslint` | ^9.39.4 | Code linting |
| `eslint-plugin-react-hooks` | ^7.0.1 | React hooks lint rules |
| `eslint-plugin-react-refresh` | ^0.5.2 | Fast refresh lint rules |
| `globals` | ^17.4.0 | Global variable definitions for ESLint |
| `@types/react` | ^19.2.14 | React type definitions |
| `@types/react-dom` | ^19.2.3 | React DOM type definitions |

> **Note:** `better-sqlite3` is a native module — it compiles C++ during `npm install`. If you hit build errors, ensure you have a C/C++ toolchain installed (Xcode CLI tools on macOS, `build-essential` on Ubuntu, Visual Studio Build Tools on Windows).

---

## Quick Start — Replicating the Project

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Immerse48.git
cd Immerse48

# Install all dependencies (this compiles better-sqlite3 natively)
npm install
```

### 2. (Optional) Configure Environment

Create a `.env` file in the project root:

```env
PORT=3001          # Backend server port (default: 3001)
```

The Anthropic API key is entered in the browser UI at runtime and sent per-request — it is **never stored on disk or in environment variables**.

### 3. Run the App

```bash
# Start both frontend (Vite) and backend (Express) concurrently
npm run dev
```

This runs:
- **Frontend:** Vite dev server at `http://localhost:5173` (with HMR)
- **Backend:** Express API at `http://localhost:3001`

### 4. Use the App

1. Open **http://localhost:5173** in your browser
2. Enter your Anthropic API key
3. Select a target language (or type any language)
4. Wait for initial content generation (~30s, cached after first run)
5. Start learning

### Other Commands

```bash
npm run server    # Backend only
npm run client    # Frontend only (needs backend running separately)
npm run build     # Production build (frontend → dist/)
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/chat` | POST | General LLM chat (with caching) |
| `/api/generate-content` | POST | Generate word lists, roadmap, etc. |
| `/api/validate-key` | POST | Validate Anthropic API key |
| `/api/cache/stats` | GET | Cache hit/miss stats, total cost |
| `/api/cache/entries` | GET | All cached responses |
| `/api/cache/requests` | GET | Recent request log |

---

## Supported Languages

Works with **any language**. The AI generates all content dynamically and adapts for:

- Non-Latin scripts (Cyrillic, Arabic, Devanagari, CJK, Hangul, etc.)
- Tonal languages (Mandarin, Cantonese, Vietnamese, Thai)
- RTL languages (Arabic, Hebrew, Persian, Urdu)
- Grammatical gender (French, Spanish, German, Arabic)
- Honorific systems (Japanese, Korean)

---

## API Costs

Uses Claude Sonnet 4.6. Typical costs:

| Action | Cost |
|---|---|
| Initial content generation (word list, roadmap, script) | ~$0.10–0.20 |
| Each conversation/journal session | ~$0.01–0.05 |
| Full 48-hour sprint | ~$0.50–1.00 |
| **Cached repeat requests** | **$0.00** |

---

## Project Structure

```
Immerse48/
├── server/
│   ├── index.js        # Express API server
│   ├── llm.js          # LLM wrapper (retry, timeout, cost tracking)
│   ├── cache.js        # SQLite cache layer
│   └── db.js           # Database setup
├── src/
│   ├── pages/
│   │   ├── Onboarding.jsx   # Language selection + API key
│   │   ├── Dashboard.jsx    # Daily dashboard + inline flashcards
│   │   ├── Speaking.jsx     # Speaking practice
│   │   ├── Roadmap.jsx      # Learning roadmap
│   │   ├── Flashcards.jsx   # Standalone flashcard view
│   │   ├── WordList.jsx     # Frequency word list
│   │   ├── ScriptTrainer.jsx # Script/pronunciation trainer
│   │   ├── Journal.jsx      # AI journal with feedback
│   │   ├── Conversation.jsx # AI conversation simulator
│   │   └── Progress.jsx     # Progress dashboard
│   ├── utils/
│   │   ├── api.js      # Frontend API client
│   │   └── storage.js  # localStorage persistence
│   ├── App.jsx          # Top nav + screen routing
│   ├── main.jsx         # Entry point
│   └── index.css        # Atlas Green design system
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## TODO — Production Roadmap

This app currently runs locally. Here's what's needed to move it to production:

### Phase 1: Production-Ready Backend
- [ ] **Environment-based config** — Move API base URL out of hardcoded `localhost:3001` in `src/utils/api.js`; use `VITE_API_URL` env var
- [ ] **Server-side API key management** — Store Anthropic key in `.env` server-side instead of passing from browser per-request (security risk in production)
- [ ] **Rate limiting** — Add express-rate-limit to prevent API abuse
- [ ] **Input validation & sanitization** — Validate all request bodies server-side
- [ ] **Error handling** — Add global Express error handler, structured error responses
- [ ] **Logging** — Add structured logging (winston/pino) instead of `console.log`
- [ ] **Health check endpoint** — Add `/api/health` for monitoring

### Phase 2: Authentication & Multi-User
- [ ] **User authentication** — Add auth (e.g., Clerk, Auth0, or Supabase Auth)
- [ ] **Database migration** — Move user progress from localStorage to a server-side database (PostgreSQL/Supabase)
- [ ] **Per-user data isolation** — Associate cached content and progress with user accounts
- [ ] **Session management** — JWT or session-based auth tokens

### Phase 3: Deployment
- [ ] **Dockerize** — Create `Dockerfile` + `docker-compose.yml` for consistent deployment
- [ ] **CI/CD pipeline** — GitHub Actions for lint, build, test, deploy
- [ ] **Frontend hosting** — Deploy `vite build` output to Vercel/Netlify/Cloudflare Pages
- [ ] **Backend hosting** — Deploy Express server to Railway/Render/Fly.io/AWS
- [ ] **Database hosting** — Migrate from SQLite to hosted PostgreSQL (SQLite doesn't scale for concurrent users)
- [ ] **HTTPS** — Ensure TLS everywhere (handled by most hosting platforms)
- [ ] **CORS lockdown** — Restrict CORS to production domain only (currently allows all origins)
- [ ] **Environment separation** — Separate dev/staging/production configs

### Phase 4: Polish & Scale
- [ ] **Mobile responsive design** — Optimize layouts for phone/tablet
- [ ] **PWA support** — Service worker for offline access to cached content
- [ ] **Tests** — Unit tests (Vitest), integration tests, E2E tests (Playwright)
- [ ] **CDN for static assets** — Serve fonts/icons from CDN instead of Google Fonts preconnect
- [ ] **API cost controls** — Per-user spending limits, usage dashboard
- [ ] **Content pre-generation** — Pre-cache popular languages so new users don't wait
- [ ] **WebSocket for conversation** — Replace polling with real-time streaming for chat features

---

## Contributing

Contributions welcome! Open issues or PRs for bug fixes, new tools, UI improvements, or language-specific enhancements.

## License

MIT — see [LICENSE](LICENSE)

---

*Built with Claude AI. Scholarly travel journal aesthetic. No gamification — just science.*
