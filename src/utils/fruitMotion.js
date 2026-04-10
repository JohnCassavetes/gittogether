export function updateFruit(fruit) {
  fruit.vy += 0.5; // gravity
  fruit.x += fruit.vx;
  fruit.y += fruit.vy;
}
