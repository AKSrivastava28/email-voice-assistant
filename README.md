# VoiceMail AI - Voice-Activated Email Assistant

VoiceMail AI is a minimalist, voice-first web application that allows you to draft and send professional emails completely hands-free. Powered by a React frontend and a FastAPI backend, the assistant transcribes your speech, extracts the recipient, subject, and body using a high-performance LLM (Groq or Google Gemini), and sends the email securely using the official Gmail API via a temporary OAuth access token.

---

## 🌟 Key Features

- 🎙️ **Hands-Free Auto-Send**: Simply click the microphone, dictate your instructions, and conclude with **"...and send it"** or **"...send the email"**. The application will automatically stop the microphone, parse the text, and dispatch the email.
- 👥 **Contact Book (Aliases)**: Configure a personalized list of nicknames (e.g. `gk` ➔ `gksrivastava12@gmail.com`) inside the frontend Contacts manager. Spoken names are automatically resolved to correct email addresses.
- 🤖 **Structured AI Parsing**: Integrates **Groq (Llama 3.3)** or **Google Gemini (2.5-Flash)** to parse raw speech transcripts into structured email payloads (To, Subject, Body) using JSON schemas.
- 🔒 **Privacy First & Stateless**: No database is required. OAuth access tokens are held temporarily in browser memory and passed directly via secure requests. No credential files are stored on the server.
- 🎨 **Premium Dark Mode UI**: Built with React, Vite, and Tailwind CSS v4, featuring glassmorphism cards and bouncing visual soundwave feedback animations.

---

## 📁 Repository Structure

```
voice-email-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app setup, CORS, and POST endpoints
│   │   ├── config.py            # Pydantic BaseSettings loading environmental variables
│   │   ├── services/
│   │   │   ├── ai_service.py    # Structured JSON extraction via Groq & Gemini
│   │   │   └── gmail_service.py # Gmail API MIME email packaging & sending
│   │   └── schemas/
│   │       └── email.py         # Request/Response validation schemas
│   ├── .env                     # Settings keys (ignored from git)
│   ├── .env.example             # Configuration settings template
│   └── requirements.txt         # Python libraries
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── GoogleAuth.jsx   # Google OAuth implicit login wrapper
    │   │   └── VoiceController.jsx # Audio Wave controller and voice trigger listener
    │   ├── App.jsx              # Orchestrator & LocalStorage contacts storage
    │   ├── index.css            # Tailwind CSS v4 import & custom base styles
    │   └── main.jsx             # React entrypoint
    ├── package.json             # NPM package scripts & configuration
    └── vite.config.js           # Vite configuration with Tailwind CSS plugin
```

---

## 🛠️ Local Installation & Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ (tested on Node v20.15.1)

### 2. Backend Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows (CMD/PowerShell)
   python -m venv venv
   .\venv\Scripts\activate

   # Linux/macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the `.env.example` file to `.env` and fill in your keys:
   ```env
   LLM_PROVIDER=groq # "gemini" or "groq"
   GEMINI_API_KEY=your_gemini_api_key
   GROQ_API_KEY=your_groq_api_key
   ```
5. Run the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   The backend API will be available at `http://127.0.0.1:8000`.

### 3. Frontend Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Create a `.env` file in the `frontend` folder to lock in configuration:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   VITE_API_URL=http://localhost:8000
   ```
4. Run the Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🔑 Google Cloud OAuth Setup

To send emails using the Gmail API, generate a Google Client ID:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Gmail API** under **APIs & Services**.
3. Under the **Google Auth Platform** left menu:
   - Configure **Branding**: Enter App Name (`VoiceMail AI`) and user support/developer emails.
   - Configure **Data Access**: Add the sensitive scope **`https://www.googleapis.com/auth/gmail.send`**.
   - Configure **Audience**: Keep user type **External** and add your login email under **Test Users** (so you can authorize while the app is in testing).
   - Configure **Clients**: Create a **Web application** OAuth Client ID. Add **`http://localhost:5173`** under **Authorized JavaScript origins**. Copy the Client ID.

---

## 🚀 Production Deployment

### Backend (Render or Railway)
1. Set the **Build Command** to: `pip install -r backend/requirements.txt`
2. Set the **Start Command** to: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
3. Configure the **Environment Variables** securely in your provider's dashboard:
   - `LLM_PROVIDER`: `groq` or `gemini`
   - `GROQ_API_KEY` or `GEMINI_API_KEY`: your respective LLM keys.

### Frontend (Vercel)
1. Point your Vercel project to the `frontend` subdirectory of your repository.
2. In the Vercel variables dashboard, set:
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `VITE_API_URL`: Your live backend URL from Render/Railway (e.g. `https://your-backend.onrender.com`).
3. **Important**: Go back to your Google Cloud Console **Clients** tab and add your deployed Vercel URL (e.g., `https://your-app.vercel.app`) to the **Authorized JavaScript origins**.
