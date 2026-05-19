# CodeShare 2.0

A pixel-accurate, production-grade clone of CodeShare.io — a real-time collaborative code editor where users can write code, share it via a unique URL, and collaborate live.

## Stack
- **Frontend**: Next.js 14 (App Router)
- **Editor**: Monaco Editor (`@monaco-editor/react`)
- **Real-time**: Socket.IO
- **Backend**: Next.js API Routes + Custom Server (`server.js`)
- **DB**: MongoDB via Mongoose
- **Styling**: Tailwind CSS

## Features
- **Custom Room Names**: Type a custom name on the landing page (e.g. `codeshare/diganta`) to create your workspace.
- **Real-Time Keystroke Sync**: Collaborative editor syncs changes instantly via WebSockets.
- **Real-Time Selection & Cursor Sync**: See what your peers are selecting and where their cursor is in real-time, color-coded per user.
- **Language Mode Selector**: Change syntax modes (Javascript, Python, Go, Rust, etc.) on the fly.
- **Save Code & Download**: Persist your workspace to MongoDB (does not expire) and download the code file locally.
- **Read-Only Mode**: Append `?view=1` to the URL to view the workspace in a secure, non-editable code display.
- **Keyboard Shortcuts**: Open the helper modal with `Ctrl + /` to view keybindings.

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables in `.env.local`:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/codeshare
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
   ```
3. Start the application:
   ```bash
   node server.js
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.
