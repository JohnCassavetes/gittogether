export function spawnFruit(id) {
  return {
    id,
    x: Math.random() * window.innerWidth,
    y: window.innerHeight + 50, // start below screen
    vx: (Math.random() - 0.5) * 10,
    vy: -20 - Math.random() * 10, // speed upwards
    radius: 40,
    sliced: false,
    type: ["apple", "lemon", "orange"][Math.floor(Math.random() * 3)]
  };
}
