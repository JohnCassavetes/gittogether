export function spawnFruit(id) {
  return {
    id,
    x: Math.random() * (window.innerWidth - 100) + 50,
    y: window.innerHeight + 50, // start below screen
    vx: (Math.random() - 0.5) * 10,
    vy: -22 - Math.random() * 8, // speed upwards slightly faster
    radius: 70 + Math.random() * 20, // Bigger radius
    sliced: false,
    type: Math.random() > 0.85 ? 'bomb' : ["apple", "melon", "banana"][Math.floor(Math.random() * 3)]
  };
}
