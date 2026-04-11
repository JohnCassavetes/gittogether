export function spawnFruit(id, side = 'any', difficulty = 'normal') {
  let minX = 50;
  let maxX = window.innerWidth - 50;
  
  if (side === 'left') {
    maxX = window.innerWidth / 2 - 50;
  } else if (side === 'right') {
    minX = window.innerWidth / 2 + 50;
  }
  
  const width = Math.max(0, maxX - minX);

  return {
    id,
    x: Math.random() * width + minX,
    y: window.innerHeight + 50, // start below screen
    vx: (Math.random() - 0.5) * 10, // Original horizontal drift
    vy: difficulty === 'hard' ? -45 - Math.random() * 15 : -22 - Math.random() * 8, 
    gravity: difficulty === 'hard' ? 2.5 : 0.5,
    radius: 70 + Math.random() * 20,
    sliced: false,
    type: Math.random() > 0.85 ? 'bomb' : ["apple", "melon", "banana"][Math.floor(Math.random() * 3)]
  };
}
