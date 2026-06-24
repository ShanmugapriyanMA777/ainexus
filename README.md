# 🚀 AI Nexus — World-Class AI Chatbot SaaS Platform

AI Nexus is a production-ready, enterprise-grade AI assistant workspace that provides a unified interface to interact with flagship models from OpenAI, Google Gemini, Anthropic Claude, DeepSeek, Mistral, and more. 

---

## ✨ Key Features

- **🧠 Multi-Model AI Switching**: Switch models (GPT-4o, Claude Sonnet, Gemini Pro, DeepSeek Reasoner, etc.) in real-time during conversations.
- **📄 Advanced Client-Side RAG**: Dynamic, in-browser document parsing for PDF, CSV, TXT, and Markdown files. Chunks documents and executes cosine similarity searches locally.
- **🖼 Vision AI Integration**: Upload images (PNG, JPG, JPEG, WEBP) to perform OCR analysis, layout audit, and visual reasoning.
- **🎤 Voice Assistant (STT & TTS)**: Live speech-to-text voice input and custom vocal reading of responses with speed controls.
- **🌐 Web Search Agent**: Pull live search indexing and synthesize references with source citations.
- **📊 Interactive Analytics**: Custom vector-drawn SVG usage charts tracking tokens, messages, and model distribution.
- **👑 Admin Dashboard**: Forbidden gate structures, user registry lists, and Ban/Revoke security controls.
- **🎨 Glassmorphic Premium Design**: Custom responsive sidebar drawer, backdrop-blur components, dual dark/light styling, and skeleton loading structures.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend/Database**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage)

---

## 🚀 Local Development Setup

### 1. Prerequisite Installations
Ensure you have [Node.js](https://nodejs.org) installed on your system.

### 2. Project Directory Setup
Clone or navigate to the project directory:
```bash
cd ai-nexus-platform
```

### 3. Setup Environment Variables
Copy `.env.example` as `.env` and fill in your Supabase configurations and AI Provider keys:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Provider Keys (Connect keys to unlock live streaming)
VITE_OPENAI_API_KEY=
VITE_GEMINI_API_KEY=
VITE_OPENROUTER_API_KEY=
```
*Note: If no keys or database credentials are provided, AI Nexus automatically launches in **Local Sandbox Demo Mode**, storing files and histories inside `localStorage` and streaming mock model outputs.*

### 4. Supabase Database Migration
If you are linking a live Supabase instance:
1. Open the **SQL Editor** in your Supabase Console.
2. Open the file [supabase-schema.sql](file:///C:/Users/shaisty%20priya/.gemini/antigravity-ide/scratch/ai-nexus-platform/supabase-schema.sql) in your code editor, copy the queries, and run them in Supabase SQL editor.
3. In the Supabase Storage console, create a public bucket named `files`.

### 5. Install & Run Vite Dev Server
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠 Build Verification & Linting
Validate compilation and bundle sizes:
```bash
npm run build
npm run preview
```

---

## 🔐 Sandbox Demo Mode
For convenient developer audits, the application includes a **Sandbox Bypass** on the login page:
1. Click the **"Launch Demo Sandbox Session"** button.
2. This creates a virtual session for `alex@nexus.ai` and loads mock data from `localStorage`.
3. You can override API keys directly in the **System Settings** page to test live models without configuring files!
