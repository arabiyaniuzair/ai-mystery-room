# 🕵️ AI Mystery Room — Forensic Investigation Platform

An interactive, AI-driven detective investigation web application built with the **MERN Stack** (MongoDB, Express, React, Node) and powered by **Google Gemini**.

Enter any small scenario, premise, or crime story (e.g. *"A billionaire dies at a snowy mountain chalet during a blizzard"* or *"A cybernetic scientist disappears from a neon Tokyo lab"*). The system uses Gemini to generate a fake investigation case with suspects, alibis, motives, and forensic evidence:
- 💬 **WhatsApp Simulated Messages**: Decrypted chat threads with timestamps and deleted message clues.
- 📹 **CCTV Surveillance Feeds**: Chronological security timecodes, camera angles, and action snapshots.
- 🔍 **Forensic Evidence Photos**: Crime scene exhibits, autopsy notes, and physical swabs.
- 👥 **Suspect Dossiers**: Motives, alibis, and direct accusation controls.
- 🛡️ **"Detective Sentinel" Chatbot**: Resident AI assistant for gameplay rules, prompt inspiration, and technical questions with a strict anti-spoiler shield.
- 👤 **User Authentication & Account Management**: Secure registration with auto-generated unique usernames, dual sign-in (email or username), salted bcrypt password hashing, session tokens, account security modal for passcode updates, and stats tracking (cases played, solved, and detective ranks from *Rookie Detective* to *Chief Inspector*).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **Google Gemini API Key** (Get one free at [Google AI Studio](https://aistudio.google.com/))
- **MongoDB** *(Optional — the backend includes a zero-config Hybrid In-Memory store so it works instantly even without MongoDB installed!)*

---

### 2. Configure Environment Variables

Open `backend/.env` and insert your Gemini API Key:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_mystery_room
JWT_SECRET=super_secret_noir_detective_key_2026
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Configure additional Gemini API keys for automatic key rotation & quota failover
GEMINI_API_KEY_1=your_second_gemini_key
GEMINI_API_KEY_2=your_third_gemini_key
GEMINI_API_KEY_3=your_fourth_gemini_key
GEMINI_API_KEY_4=your_fifth_gemini_key
# Alternatively: GEMINI_API_KEYS=key1,key2,key3,key4,key5

CLIENT_URL=http://localhost:5173
```

*(Note: The system supports multiple Gemini API keys with automatic key rotation upon encountering `429 RESOURCE_EXHAUSTED` rate limits. If you run without any Gemini API Keys, the system automatically falls back to its procedural mystery generation engine so you can test all screens immediately!)*

---

### 3. Install Dependencies

#### Backend:
```bash
cd backend
npm install
```

#### Frontend:
```bash
cd ../frontend
npm install
```

---

### 4. Run the Application

#### Start the Backend (Terminal 1):
```bash
cd backend
npm run dev
```
Backend will start on `http://localhost:5000` (Health check at `http://localhost:5000/api/health`).

#### Start the Frontend (Terminal 2):
```bash
cd frontend
npm run dev
```
Frontend will be accessible at: `http://localhost:5173`.

---

### 5. Running Automated Tests

Run backend tests for Gemini key manager and user authentication:
```bash
cd backend
npm test               # Runs all test suites (Gemini Rotation + Auth)
npm run test:auth      # Runs User Authentication & Account Management tests
npm run test:gemini    # Runs Gemini Key Manager & Key Rotation tests
```

---

## 📁 Project Architecture

```
AIMusytryFromMyprompt/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Resilient MongoDB connection + In-Memory fallback
│   │   ├── controllers/
│   │   │   ├── authController.js     # User registration, login, profile stats
│   │   │   ├── mysteryController.js  # Mystery generation, accusation verification
│   │   │   └── chatbotController.js  # Detective Sentinel chatbot handler
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT verification & optional guest handling
│   │   ├── models/
│   │   │   ├── User.js               # User credentials & detective ranks
│   │   │   ├── MysteryCase.js        # Case storage with anti-cheat spoiler stripping
│   │   │   └── GameSession.js        # Active game logs, scores, and outcomes
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── mysteryRoutes.js
│   │   │   └── chatbotRoutes.js
│   │   ├── services/
│   │   │   ├── geminiService.js      # Gemini Structured Output engine & procedural fallback
│   │   │   └── chatbotService.js     # Detective Sentinel with anti-spoiler prompt
│   │   └── server.js                 # Express app initialization
│   ├── .env                          # Backend environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── clues/
│   │   │   │   ├── BriefingViewer.jsx    # Crime scene briefing & facts
│   │   │   │   ├── WhatsAppViewer.jsx    # Simulated WhatsApp chat simulator
│   │   │   │   ├── CCTVViewer.jsx        # Surveillance monitor & camera switcher
│   │   │   │   ├── PhotosViewer.jsx      # Photographic evidence & zoom viewer
│   │   │   │   └── SuspectsViewer.jsx    # Suspect cards & alibis
│   │   │   ├── Navbar.jsx                # Header, rank badge, score, login triggers
│   │   │   ├── AuthModal.jsx             # Sign in & sign up modal
│   │   │   ├── CaseGenerator.jsx         # Prompt input, presets, difficulty selector
│   │   │   ├── InvestigationRoom.jsx     # Master investigation tabbed desk
│   │   │   ├── AccusationModal.jsx       # Culprit selection & deduction submission
│   │   │   ├── DebriefModal.jsx          # Victory/Defeat reveal, confession, solution
│   │   │   ├── ChatbotSentinel.jsx       # Floating AI helper assistant
│   │   │   └── CaseHistoryModal.jsx      # Past investigation records
│   │   ├── context/
│   │   │   └── AuthContext.jsx           # Global authentication state
│   │   ├── services/
│   │   │   └── api.js                    # Axios API client with JWT bearer tokens
│   │   ├── App.jsx                       # Main application state orchestration
│   │   ├── index.css                     # Tailwind styling + scanline CRT filters
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── package.json                          # Root convenience scripts
```

---

## 🔒 Security & Anti-Cheat Logic

The platform strictly safeguards the solution:
1. **Server-Side Masking**: During active gameplay, the true culprit indicator (`isCulprit`), culprit's confession, and full deduction text are stripped by the backend (`toClientSafePayload()`). Players cannot inspect Network or DevTools to find the killer.
2. **Server-Side Verification**: Accusation accuracy is evaluated strictly on the backend when `POST /api/mysteries/:id/accuse` is called.
3. **Chatbot Guardrail**: "Detective Sentinel" has built-in system prompt guardrails that prevent it from revealing the culprit or solving active cases for the user.
