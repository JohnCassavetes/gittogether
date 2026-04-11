export function updateFruit(fruit) {
  fruit.vy += fruit.gravity || 0.5; // Fetch dynamic gravity injected by difficulty level
  fruit.x += fruit.vx;
  fruit.y += fruit.vy;
}
