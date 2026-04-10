export function segmentHitsCircle(p1, p2, circle, bladeRadius = 20) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const fx = p1.x - circle.x;
  const fy = p1.y - circle.y;

  const effectiveRadius = circle.radius + bladeRadius;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = (fx * fx + fy * fy) - effectiveRadius * effectiveRadius;

  let discriminant = b * b - 4 * a * c;

  // if discriminant < 0, it means the infinite line misses completely.
  if (discriminant < 0) return false;

  // Check if intersection point is within the line segment
  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  // If either intersection is within the segment (t in [0, 1]), then hit!
  if (t1 >= 0 && t1 <= 1) return true;
  if (t2 >= 0 && t2 <= 1) return true;

  // Check if points are inside the circle directly just in case it's a short segment fully inside
  if ((p1.x - circle.x)**2 + (p1.y - circle.y)**2 <= effectiveRadius * effectiveRadius) return true;
  if ((p2.x - circle.x)**2 + (p2.y - circle.y)**2 <= effectiveRadius * effectiveRadius) return true;

  return false;
}
