# 🍉 Better Fruit Ninja

A browser-based, full-stack arcade Fruit Ninja–style game where players slice falling fruit using real hand motion via their webcam. The project is built using a modern **React**, **Three.js** (`@react-three/fiber`), and **MediaPipe** frontend, backed by a **Node/Express** server handling persistent local leaderboard high scores via a raw CSV file!

## ✨ New Features & Arcade Upgrades

- **⚔️ 1v1 Local Multiplayer (2P Split-Screen)**: Grab a friend! The AI engine now tracks `numHands: 2` dynamically. Player 1 governs the left half with a bright **Cyan** blade, while Player 2 governs the right half with a **Hot Pink** blade. Fruits exclusively spawn and arc on their respective sides for competitive fairness! Bombs deduct 50 points from the slicer without ending the round!
- **🔥 Difficulty Modes (NORM / HARD)**: 
  - **NORM**: Exact replication of authentic mobile physics (0.5 gravity) with floaty arcs and satisfying hang times.
  - **HARD**: A grueling challenge increasing gravity 500% to 2.5x, rocketing fruits upward violently, and globally multiplying the spawn generator speed by 40%.
- **⏱️ 30-Second Blitz**: Rebuilt physics and UI loop restricting matches to intense, highly-optimized 30-second bursts to fight for leaderboard placement! 
- **💥 Bombs & Physics Engine**: A 15% chance to spawn an iron bomb. Slicing a bomb triggers a violent CSS screen shake, a loud explosion, and a 3D simulated particle physics fireball! Memory leaks have been aggressively patched to immediately garbage-collect any un-sliced bombs.
- **🏆 Persistent Leaderboard**: Enter your 3-character initials on the Start Menu. Top 5 High Scores are saved locally via the Node backend into an easily-editable `leaderboard.csv` file!

---

## 🚀 How to Run

1. **Install dependencies** (if you haven't already):
   ```bash
   npm install
   ```

2. **Start the localized Full-Stack environment**:
   ```bash
   # Utilizing concurrently to launch both Node and Vite!
   npm run dev
   ```

3. **Open the game**:
   - Open the displayed `http://localhost:5173/` URL in your browser.
   - **Important**: Your browser will ask for webcam permissions. You **must** allow camera access for the MediaPipe hand tracking to work properly.
   - **Note**: Hand tracking works best in a well-lit environment with your webcam positioned clearly facing you.

> **Fallback Mode**: If hand tracking encounters issues finding your hand, or you are playing solo without a camera, you can immediately fallback to using your **mouse**! Mouse input will natively map to Player 1's Cyan blade.

---

## 📁 Project Skeleton

```text
/
├── server.js               # Node/Express backend serving the Leaderboard API
├── leaderboard.csv         # Raw text file persisting the top arcade scores
├── package.json            # Configured with "concurrently" for smooth booting
│
src/
├── App.jsx                 # Application wrapper
├── main.jsx                # React entry point
├── index.css               # Global styling, containing CSS screen-shake keyframes
│
├── screens/
│   └── GameScreen.jsx      # Core logic, modes, dual-blade loop orchestrator, and menus
│
├── components/
│   ├── WebcamFeed.jsx      # Renders the live webcam stream as a fullscreen background
│   ├── HandTracker.jsx     # AI logic partitioning hands into Player 1 & Player 2 coordinates
│   ├── Scene3D.jsx         # 3D Render engine mapping geometries, dual point lights, and visuals
│   ├── Fruit.jsx           # Detailed 3D geometric fruit & spinning 3D fire animations
│   ├── BladeTrail.jsx      # Multi-colored glowing laser geometries
│   ├── SliceBurst.jsx      # Particle physics explosion effects for slashed fruits/bombs
│   └── HUD.jsx             # Dual-sided Interface showing P1/P2 scores and central match timer
│
└── utils/
    ├── leaderboard.js      # Frontend fetch utility hooking into local Node API
    ├── collision.js        # Mathematical logic checking multi-blade segment-circle intersections
    ├── audio.js            # Synthesizing Web Audio API "wooshes" and "explosions"
    ├── spawnFruit.js       # Segmented 'left' vs 'right' splitscreen trajectory mathematics
    ├── fruitMotion.js      # Modulating gravity velocity drops dynamically through Difficulty parameters
    └── mapLandmarks.js     # Helper converting MediaPipe coordinates to screen coordinates
```

---

## ⚙️ How it Works

1. **Webcam Layer (`WebcamFeed.jsx`)**: The physical entry point begins with requesting `getUserMedia()`. The video acts as a `fixed` background spanning the entire window.
2. **Hand Tracking AI (`HandTracker.jsx`)**: The invisible tracking component feeds the webcam `<video>` element into the `@mediapipe/tasks-vision` object. It maps `numHands: 2`, calculates absolute X coordinates, and assigns the left-most detected hand to P1 (Cyan) and the right-most to P2 (Hot Pink).
3. **The Game Loop (`GameScreen.jsx`)**: A `performance.now()` loop completely detached from React's renderer syncs physics states directly to time vectors (`dt`) for millisecond accuracy. It governs:
   - Dynamic `NORM`/`HARD` dual-spawn mathematics.
   - Separate independent hitbox checks for `blade1` and `blade2`. 
4. **Three.js Layer (`Scene3D.jsx`)**: React-Three-Fiber perfectly cascades the raw X/Y point arrays from the loop into absolute `OrthographicCamera` spatial coordinates, emitting 200,000 intensity dual-colored neon PointLights tracing over the real-world hands. 
5. **Backend Database (`server.js`)**: Matches securely wrap up and perform automatic `fetch()` protocols containing `initials` and terminating points. Express filters `leaderboard.csv` appending new records and rejecting invalid states before broadcasting updated DOM high scores!
