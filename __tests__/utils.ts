import * as clipperLib from "../src";

export function circlePath(
  center: clipperLib.IntPoint,
  radius: number,
  points: number
): clipperLib.Path {
  const path = [];

  for (let i = 0; i < points; i++) {
    const radAngle = (i / points) * (Math.PI * 2);
    const p = {
      x: Math.round(center.x + Math.cos(radAngle) * radius),
      y: Math.round(center.y + Math.sin(radAngle) * radius)
    };
    path.push(p);
  }

  return path;
}
