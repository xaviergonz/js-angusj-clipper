import { OutPt } from './_OutPt';
import { TEdge } from './_TEdge';
import { double, long, NodeType } from './_types';
import { orientation } from './functions';
import { IntPoint, newIntPointXY, newIntPointXYZ } from './IntPoint';
import { PolyNode } from './PolyNode';
import { Path, Paths } from './types';

export function distanceFromLineSqrd(pt: IntPoint, ln1: IntPoint, ln2: IntPoint): double {
  //The equation of a line in general form (Ax + By + C = 0)
  //given 2 points (x¹,y¹) & (x²,y²) is ...
  //(y¹ - y²)x + (x² - x¹)y + (y² - y¹)x¹ - (x² - x¹)y¹ = 0
  //A = (y¹ - y²); B = (x² - x¹); C = (y² - y¹)x¹ - (x² - x¹)y¹
  //perpendicular distance of point (x³,y³) = (Ax³ + By³ + C)/Sqrt(A² + B²)
  //see http://en.wikipedia.org/wiki/Perpendicular_distance
  const A: double = ln1.y - ln2.y;
  const B: double = ln2.x - ln1.x;
  let C: double = A * ln1.x + B * ln1.y;
  C = A * pt.x + B * pt.y - C;
  return C * C / (A * A + B * B);
}

export function slopesNearCollinear(pt1: IntPoint, pt2: IntPoint, pt3: IntPoint, distSqrd: double): boolean {
  //this function is more accurate when the point that's GEOMETRICALLY
  //between the other 2 points is the one that's tested for distance.
  //nb: with 'spikes', either pt1 or pt3 is geometrically between the other pts
  if (Math.abs(pt1.x - pt2.x) > Math.abs(pt1.y - pt2.y)) {
    if (pt1.x > pt2.x === pt1.x < pt3.x) {
      return distanceFromLineSqrd(pt1, pt2, pt3) < distSqrd;
    }
    else if (pt2.x > pt1.x === pt2.x < pt3.x) {
      return distanceFromLineSqrd(pt2, pt1, pt3) < distSqrd;
    }
    else {
      return distanceFromLineSqrd(pt3, pt1, pt2) < distSqrd;
    }
  }
  else {
    if (pt1.y > pt2.y === pt1.y < pt3.y) {
      return distanceFromLineSqrd(pt1, pt2, pt3) < distSqrd;
    }
    else if (pt2.y > pt1.y === pt2.y < pt3.y) {
      return distanceFromLineSqrd(pt2, pt1, pt3) < distSqrd;
    }
    else {
      return distanceFromLineSqrd(pt3, pt1, pt2) < distSqrd;
    }
  }
}

export function pointsAreClose(pt1: IntPoint, pt2: IntPoint, distSqrd: double): boolean {
  const dx: double = pt1.x - pt2.x;
  const dy: double = pt1.y - pt2.y;
  return dx * dx + dy * dy <= distSqrd;
}

export function excludeOp(op: OutPt): OutPt {
  const result = op.Prev;
  result.Next = op.Next;
  op.Next.Prev = result;
  result.Idx = 0;
  return result;
}

export function addPolyNodeToPaths(polynode: PolyNode, nt: NodeType, paths: Paths): void {
  let match = true;
  switch (nt) {
    case NodeType.ntOpen: return;
    case NodeType.ntClosed:
      match = !polynode.isOpen;
      break;
    default:
      break;
  }

  if (polynode.m_polygon.length > 0 && match) {
    paths.push(polynode.m_polygon);
  }
  for (let ii = 0, max = polynode.childs.length; ii < max; ii++) {
    const pn = polynode.childs[ii];
    addPolyNodeToPaths(pn, nt, paths);
  }
}

export function minkowski(pattern: Path, path: Path, IsSum: boolean, IsClosed: boolean, useXyz: boolean): Paths {
  const delta = IsClosed ? 1 : 0;
  const polyCnt = pattern.length;
  const pathCnt = path.length;
  const result: Paths = [];
  result.length = pathCnt;

  if (IsSum) {
    for (let i = 0; i < pathCnt; i++) {
      const p: Path = [];
      p.length = polyCnt;
      let pLength = 0;
      if (useXyz) {
        for (let ii = 0, max = pattern.length; ii < max; ii++) {
          const ip = pattern[ii];
          p[pLength++] = newIntPointXYZ(path[i].x + ip.x, path[i].y + ip.y, path[i].z! + ip.z!);
        }
      }
      else {
        for (let ii = 0, max = pattern.length; ii < max; ii++) {
          const ip = pattern[ii];
          p[pLength++] = newIntPointXY(path[i].x + ip.x, path[i].y + ip.y);
        }
      }
      //p.length = pLength; // not needed
      result[i] = p;
    }
  }
  else {
    for (let i = 0; i < pathCnt; i++) {
      const p: Path = [];
      p.length = polyCnt;
      let pLength = 0;
      for (let ii = 0, max = pattern.length; ii < max; ii++) {
        const ip = pattern[ii];
        p[pLength++] = newIntPointXYZ(path[i].x - ip.x, path[i].y - ip.y, path[i].z);
      }
      //p.length = pLength; // not needed
      result[i] = p;
    }
  }

  const quads: Paths = [];
  quads.length = (pathCnt - 1 + delta) * (polyCnt); // TODO: originally it is (pathCnt + delta) * (polyCnt + 1) for some reason
  let quadsLength = 0;

  for (let i = 0; i < pathCnt - 1 + delta; i++) {
    for (let j = 0; j < polyCnt; j++) {
      const quad: Path = [
        result[i % pathCnt][j % polyCnt],
        result[(i + 1) % pathCnt][j % polyCnt],
        result[(i + 1) % pathCnt][(j + 1) % polyCnt],
        result[i % pathCnt][(j + 1) % polyCnt],
      ];
      if (!orientation(quad)) {
        quad.reverse();
      }
      quads[quadsLength++] = quad;
    }
  }

  quads.length = quadsLength;
  return quads;
}

export function translatePath(path: Path, delta: IntPoint, useXyz: boolean): Path {
  const outPath: Path = [];
  outPath.length = path.length;
  if (!useXyz) {
    for (let i = 0; i < path.length; i++) {
      outPath[i] = newIntPointXY(path[i].x + delta.x, path[i].y + delta.y);
    }
  }
  else {
    for (let i = 0; i < path.length; i++) {
      outPath[i] = newIntPointXYZ(path[i].x + delta.x, path[i].y + delta.y, path[i].z! + delta.z!);
    }
  }
  return outPath;
}

export const Round = (value: double): long => {
  // TODO: simply use Math.round? although Math.round(-0.5) = 0- and Math.round(0.5) = 1
  return value < 0 ? Math.trunc(value - 0.5) : Math.trunc(value + 0.5);
};

export const TopX = (edge: TEdge, currentY: long) => {
  if (currentY === edge.Top.y) {
    return edge.Top.x;
  }
  return edge.Bot.x + Round(edge.Dx * (currentY - edge.Bot.y));
};

const tolerance: double = 1.0E-20; // internal
export const near_zero = (val: double) => {
  return (val > -tolerance) && (val < tolerance);
};
