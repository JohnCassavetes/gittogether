export function segmentHitsCircle(p1, p2, circle) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const fx = p1.x - circle.x;
  const fy = p1.y - circle.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = (fx * fx + fy * fy) - circle.radius * circle.radius;

  let discriminant = b * b - 4 * a * c;

  if (discriminant < 0) return false;

  // Check if intersection point is within the line segment
  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  // If either t is in [0, 1] then segment hits circle
  if (t1 >= 0 && t1 <= 1) return true;
  if (t2 >= 0 && t2 <= 1) return true;

  return false;
}
