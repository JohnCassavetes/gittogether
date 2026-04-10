# 🍉 Better Fruit Ninja

A browser-based, full-stack arcade Fruit Ninja–style game where players slice falling fruit using real hand motion via their webcam. The project is built using a modern **React**, **Three.js** (`@react-three/fiber`), and **MediaPipe** frontend, backed by a **Node/Express** server handling persistent local leaderboard high scores via a raw CSV file!

## ✨ New Features & Upgrades

- **Escalating Arcade Difficulty**: Dynamically scaling difficulty ramps up the spawn rate as your survival time increases.
- **Bombs & Physics Engine**: A 15% chance to spawn an iron bomb. Slicing a bomb triggers an instant Game Over, a violent CSS screen shake, a loud audio-clipped explosion, and a 3D simulated particle physics fireball!
- **Realistic 3D Models**: Upgraded HD `.jsx` geometric constructions for the Red Apple (w/ stem and leaf), Oblong Watermelon (w/ mathematical black seed distribution), and Ripe Banana (w/ brown tips).
- **Persistent Leaderboard**: Enter your 3-character initials on the Start Menu. Top 5 High Scores are saved locally via the Node backend into an easily-editable `leaderboard.csv` file!

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

> **Fallback Mode**: If hand tracking encounters issues finding your hand, you can immediately fallback to using your **mouse**! Just click and drag across the screen to slice fruit.

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
│   └── GameScreen.jsx      # Core logic, game loop orchestrator, and Start/Death screens
│
├── components/
│   ├── WebcamFeed.jsx      # Renders the live webcam stream as a fullscreen background
│   ├── HandTracker.jsx     # Runs MediaPipe AI logic to detect your index finger tip
│   ├── Scene3D.jsx         # Three.js <Canvas> environment rendering the fruit/blade trail
│   ├── Fruit.jsx           # Detailed 3D geometric fruit & bomb constructions
│   ├── BladeTrail.jsx      # The glowing cyan blade line following your finger/mouse
│   ├── SliceBurst.jsx      # Particle physics explosion effects for slashed fruits/bombs
│   └── HUD.jsx             # Flat 2D interface showing score, remaining time, and lives
│
└── utils/
    ├── leaderboard.js      # Frontend fetch utility hooking into local Node API
    ├── collision.js        # Mathematical logic checking segment-circle intersections
    ├── audio.js            # Synthesizing Web Audio API "wooshes" and "explosions"
    ├── spawnFruit.js       # Instantiating fruit with random trajectories and colors
    ├── fruitMotion.js      # Applies gravity and velocity to calculate next-frame physical position
    └── mapLandmarks.js     # Helper converting MediaPipe coordinates to screen coordinates
```

---

## ⚙️ How it Works

1. **Webcam Layer (`WebcamFeed.jsx`)**: The physical entry point begins with requesting `getUserMedia()`. The video acts as a `fixed` background spanning the entire window.
2. **Hand Tracking AI (`HandTracker.jsx`)**: The invisible tracking component feeds the webcam `<video>` element into the `@mediapipe/tasks-vision` object. It detects the precise location of landmark index 8 (index finger).
3. **The Game Loop (`GameScreen.jsx`)**: We use a `requestAnimationFrame` loop isolated from React renders to continuously step forward time. In this loop:
   - Calculate falling arcs for fruits by applying gravity against their velocity (`fruitMotion.js`).
   - Spawn new HD fruits and bombs on an escalating timer (`spawnFruit.js`).
   - Manage game state like score, time, lives, and Game Over conditions.
4. **Three.js Layer (`Scene3D.jsx`)**: Based on the state arrays referenced from the Game Loop, React-Three-Fiber efficiently projects 3D geometries (Fruits, Blade trails, Physics particles) flawlessly synchronized over the 2D video feed using an `OrthographicCamera`.
5. **Backend Database (`server.js`)**: Once a timer runs out, a clean `useEffect` posts the player's 3-letter initials and score points to the Express Localhost server. The Node server opens, parses, appends, and queries `leaderboard.csv` leveraging the raw `fs` filesystem package, returning the newly validated Top 5 board to the React HUD overlay!
