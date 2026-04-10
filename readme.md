# 🍉 Webcam Fruit Ninja

A browser-based Fruit Ninja–style game where players slice falling fruit using real hand motion via their webcam. The project is built using **React**, **Three.js** (`@react-three/fiber`), and **MediaPipe** for hand tracking.

## 🚀 How to Run

1. **Install dependencies** (if you haven't already):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open the game**:
   - Open the displayed `http://localhost:5173/` URL in your browser.
   - **Important**: Your browser will ask for webcam permissions. You **must** allow camera access for the hand tracking to work properly.
   - **Note**: Hand tracking works best in a well-lit environment with your webcam positioned clearly facing you.

> **Fallback Mode**: If hand tracking encounters issues finding your hand, you can immediately fallback to using your **mouse**! Just click and drag across the screen to slice fruit.

---

## 📁 Project Skeleton

```text
src/
├── App.jsx                 # Application wrapper
├── main.jsx                # React entry point
├── index.css               # Global reset & generic styling
│
├── screens/
│   └── GameScreen.jsx      # Core logic, game loop, and orchestrator 
│
├── components/
│   ├── WebcamFeed.jsx      # Renders the live webcam stream as a fullscreen background
│   ├── HandTracker.jsx     # Runs MediaPipe AI logic to detect your index finger tip
│   ├── Scene3D.jsx         # Three.js <Canvas> environment rendering the fruit/blade trail
│   ├── Fruit.jsx           # Represents an individual bouncing fruit object
│   ├── BladeTrail.jsx      # The glowing cyan blade line following your finger/mouse
│   ├── SliceBurst.jsx      # Particle explosion effects for when fruit is successfully slashed
│   └── HUD.jsx             # Flat 2D interface showing score, remaining time, and lives
│
└── utils/
    ├── collision.js        # Mathematical logic checking segment-circle intersections
    ├── spawnFruit.js       # Instantiating fruit with random trajectories and colors
    ├── fruitMotion.js      # Applies gravity and velocity to calculate next-frame physical position
    └── mapLandmarks.js     # Helper converting MediaPipe hand coordinates to screen coordinates
```

---

## ⚙️ How it Works

1. **Webcam Layer (`WebcamFeed.jsx`)**: The physical entry point begins with requesting `getUserMedia()`. The video acts as a `fixed` background spanning the entire window.
2. **Hand Tracking AI (`HandTracker.jsx`)**: The invisible tracking component feeds the webcam `<video>` element into the `@mediapipe/tasks-vision` object. It detects the precise location of landmark index 8 (index finger).
3. **The Game Loop (`GameScreen.jsx`)**: We use a `requestAnimationFrame` loop to continuously step forward time. In this loop, we:
   - Calculate falling arcs for fruits by applying gravity against their velocity (`fruitMotion.js`).
   - Spawn new objects on a timer (`spawnFruit.js`).
   - Check if the points creating your blade form a line segment that intersects any active fruit's circle radius (`collision.js`).
   - Manage game state like score, time, lives, and game over.
4. **Three.js Layer (`Scene3D.jsx`)**: Based on the state values sent down from the Game Loop, React-Three-Fiber efficiently projects 3D geometries (Fruits, Blade trails, Particle splashes) perfectly synchronized over the 2D video feed using an `OrthographicCamera`. Reflexively, reacting immediately to sliced attributes to hide fruit and trigger localized bursts. 
