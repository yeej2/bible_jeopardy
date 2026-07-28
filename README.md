# Bible Jeopardy

A Jackbox-style Bible Jeopardy game. Cast the board on a TV or shared screen, then use your phone as a buzzer and controller.

## Features

- TV-style game board with categories and point values
- Phone buzzers for up to ~11 players
- Team support (create/join teams, shared team score)
- Standard Jeopardy rules: selecting clues, first-to-buzz answering, Daily Doubles, Final Jeopardy wagering
- Host controls on phone (select clues, judge answers, start Final Jeopardy)
- Starter question set with an Ephesians category
- Single-command local dev and single-service Render deploy

## How to play

1. **Host**: Open the app, tap **Phone Controller**, create a room, and give the room code to everyone.
2. **TV**: Open the app, tap **Open TV Board**, and enter the room code to cast the board.
3. **Players**: Open the app, tap **Phone Controller**, enter the room code and your name, then join or create a team.
4. **Host** starts the game. Select a clue, read it aloud, then players buzz in on their phones.
5. The host judges answers and the board updates automatically.

## Local development

```bash
npm install
npm run dev
```

This runs the server and Vite dev server concurrently.

## Build for production

```bash
npm install
npm run build
npm start
```

The Express server serves the built React app from `dist/`.

## Deploy to Render

1. Create a new **Web Service** on Render.
2. Connect this repo.
3. Use these settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Deploy. The app will be hosted and friends can connect to the public URL.
