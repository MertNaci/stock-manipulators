# 🎰 Market Manipulators (Borsa Manipülatörleri)

![Cyberpunk UI](https://img.shields.io/badge/UI-Cyberpunk-00d4ff?style=flat-square)
![React](https://img.shields.io/badge/Frontend-React-61dafb?style=flat-square&logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)
![WebSockets](https://img.shields.io/badge/Communication-WebSockets-f39f37?style=flat-square)

**Market Manipulators** is a real-time multiplayer social deduction and simulation game. Set in a fast-paced, cyberpunk-themed stock market, players compete to achieve their hidden agendas by manipulating stock prices using action cards, generating fake news, and executing strategic trades.

---

## 🎮 Gameplay Features

### 🕵️ Hidden Agendas
Every player is given a secret agenda at the beginning of the match (e.g., "Crash the ROBO Corp stock" or "Make KUANT the most valuable stock"). The first rule of the market? Trust no one.

### 🃏 Manipulation Cards
Players constantly receive action cards throughout the match to manipulate the market anonymously:
- **Hype Train:** Boosts the selected stock by 15%.
- **Fake News:** Crashes the selected stock by 10%.
- **Inside Info:** Locks a stock from being traded for a few seconds.
- **Pump & Dump:** Temporarily skyrockets a stock, only to cause a massive crash shortly after.

### 📈 Real-Time Trading
- Live simulated stock ticks (every two seconds).
- Buy/sell stocks to build your portfolio.
- Demand-based pressure mechanics: Heavy buying increases the stock price naturally, while heavy selling tanks it.

### ⏱️ Fast-Paced Matches
A standard match handles 2-6 players and lasts exactly 4 minutes. Quick thinking, reading the event log, and deducing who is manipulating which stock is the key to victory.

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite + TypeScript, styled with TailwindCSS (Cyberpunk aesthetic with Glassmorphism).
- **Backend:** Python + FastAPI for the REST API and strict WebSocket management.
- **State Management:** In-memory asynchronous game loop on the server-side ensuring ultra-low latency.
- **Hosting:** Configured for Vercel (Client) and Render/Koyeb (Server).

---

## 🚀 How to Run Locally

To run the game on your local machine, you will need two separate terminal windows for the frontend and backend.

### 1. Backend (Python Server)
Requires Python 3.9+
```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate   # specific to Windows

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py
```
*The WebSocket server will start running on `http://localhost:8000`.*

### 2. Frontend (React Client)
Requires Node.js 18+
```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open your browser and navigate to `http://localhost:5173`. Open multiple tabs (or incognito windows) to join the same room and test multiplayer features!

---

## 📜 License
This project is open-source and available under the MIT License.

---

## 👨‍💻 Author
**Mert Naci Akalın**
* Full-Stack Web & Game Developer
* *If you have any questions or want to reach out for collaborations, feel free to contact me!*
