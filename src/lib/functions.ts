import { addPolyNodeToPaths, excludeOp, minkowski, pointsAreClose, slopesNearCollinear, translatePath } from './_functions';
import { OutPt } from './_OutPt';
import { double, int, NodeType } from './_types';
import { Clipper } from './Clipper';
import { IntPoint, newIntPointXY, newIntPointXYZ } from './IntPoint';
import { PolyTree } from './PolyTree';
import { ClipType, Path, Paths, PointInPolygonResult, PolyFillType, PolyType } from './types';

export function area(poly: Path): number {
  const cnt = poly.length;
  if (cnt < 3) {
    return 0;
  }
  let a: double = 0;
  for (let i = 0, j = cnt - 1; i < cnt; ++i) {
    a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
    j = i;
  }
  return -a * 0.5;
}

export function cleanPolygon(path: Path, distance: number = 1.1415): Path {
  //distance = proximity in units/pixels below which vertices will be stripped.
  //Default ~= sqrt(2) so when adjacent vertices or semi-adjacent vertices have
  //both x & y coords within 1 unit, then the second vertex will be stripped.

  let cnt = path.length;

  if (cnt === 0) {
    return [];
  }

  const outPts: OutPt[] = [];
  outPts.length = cnt;
  for (let i = 0; i < cnt; ++i) {
    outPts[i] = new OutPt();
  }

  for (let i = 0; i < cnt; ++i) {
    outPts[i].Pt = path[i]; // no need to clone since we will clone it later anyway
    outPts[i].Next = outPts[(i + 1) % cnt];
    outPts[i].Next.Prev = outPts[i];
    outPts[i].Idx = 0;
  }

  const distSqrd: double = distance * distance;
  let op = outPts[0];
  while (op.Idx === 0 && op.Next !== op.Prev) {
    if (pointsAreClose(op.Pt, op.Prev.Pt, distSqrd)) {
      op = excludeOp(op);
      cnt--;
    }
    else if (pointsAreClose(op.Prev.Pt, op.Next.Pt, distSqrd)) {
      excludeOp(op.Next);
      op = excludeOp(op);
      cnt -= 2;
    }
    else if (slopesNearCollinear(op.Prev.Pt, op.Pt, op.Next.Pt, distSqrd)) {
      op = excludeOp(op);
      cnt--;
    }
    else {
      op.Idx = 1;
      op = op.Next;
    }
  }

  if (cnt < 3) {
    cnt = 0;
  }
  const result: Path = [];
  result.length = cnt;
  for (let i = 0; i < cnt; ++i) {
    result[i] = op.Pt;
    op = op.Next;
  }
  //outPts = undefined; // not needed
  return result;
}

export function cleanPolygons(polys: Paths, distance: number = 1.1415): Paths {
  const result: Paths = [];
  result.length = polys.length;
  for (let i = 0; i < polys.length; i++) {
    result[i] = cleanPolygon(polys[i], distance);
  }
  return result;
}

export function openPathsFromPolyTree(polytree: PolyTree): Paths {
  const result = [];
  result.length = polytree.childCount;
  let resultLength = 0;
  for (let i = 0; i < polytree.childCount; i++) {
    if (polytree.childs[i].isOpen) {
      result[resultLength++] = polytree.childs[i].m_polygon;
    }
  }
  result.length = resultLength;
  return result;
}

export function closedPathsFromPolyTree(polytree: PolyTree): Paths {
  const result: Paths = [];
  //result.Capacity = polytree.Total;
  addPolyNodeToPaths(polytree, NodeType.ntClosed, result);
  return result;
}

export function minkowskiSumPath(pattern: Path, path: Path, pathIsClosed: boolean, useXyz: boolean = false): Paths | undefined { // -> Paths | undefined
  const paths: Paths = minkowski(pattern, path, true, pathIsClosed, useXyz);
  const c = new Clipper();
  c.addPaths(paths, PolyType.Subject, true);
  return c.executePaths(ClipType.Union, PolyFillType.NonZero, PolyFillType.NonZero);
}

export function minkowskiSumPaths(pattern: Path, paths: Paths, pathIsClosed: boolean, useXyz: boolean = false): Paths | undefined { // -> Paths | undefined
  const c = new Clipper();
  for (let i = 0; i < paths.length; ++i) {
    const tmp = minkowski(pattern, paths[i], true, pathIsClosed, useXyz);
    c.addPaths(tmp, PolyType.Subject, true);
    if (pathIsClosed) {
      const path = translatePath(paths[i], pattern[0], useXyz);
      c.addPath(path, PolyType.Clip, true);
    }
  }
  return c.executePaths(ClipType.Union, PolyFillType.NonZero, PolyFillType.NonZero);
}

export function minkowskiDiff(poly1: Path, poly2: Path, useXyz: boolean = false): Paths | undefined { // -> Paths | undefined
  const paths = minkowski(poly1, poly2, false, true, useXyz);
  const c = new Clipper();
  c.addPaths(paths, PolyType.Subject, true);
  return c.executePaths(ClipType.Union, PolyFillType.NonZero, PolyFillType.NonZero);
}

export function polyTreeToPaths(polytree: PolyTree): Paths {
  const result: Paths = [];
  //result.Capacity = polytree.Total;
  addPolyNodeToPaths(polytree, NodeType.ntAny, result);
  return result;
}

export function orientation(poly: Path): boolean {
  return area(poly) >= 0;
}

export function pointInPolygon(pt: IntPoint, path: Path): PointInPolygonResult {
  //returns 0 if false, +1 if true, -1 if pt ON polygon boundary
  //See "The Point in Polygon Problem for Arbitrary Polygons" by Hormann & Agathos
  //http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.88.5498&rep=rep1&type=pdf
  let result: int = 0;
  const cnt: int = path.length;
  if (cnt < 3) {
    return 0;
  }
  let ip = path[0];
  for (let i: int = 1; i <= cnt; ++i) {
    const ipNext = i === cnt ? path[0] : path[i];
    if (ipNext.y === pt.y) {
      if (ipNext.x === pt.x || ip.y === pt.y &&
        ipNext.x > pt.x === ip.x < pt.x) {
        return -1;
      }
    }
    if (ip.y < pt.y !== ipNext.y < pt.y) {
      if (ip.x >= pt.x) {
        if (ipNext.x > pt.x) {
          result = 1 - result;
        }
        else {
          const d: double = (ip.x - pt.x) * (ipNext.y - pt.y) -
            (ipNext.x - pt.x) * (ip.y - pt.y);
          if (d === 0) {
            return -1;
          }
          else if (d > 0 === ipNext.y > ip.y) {
            result = 1 - result;
          }
        }
      }
      else {
        if (ipNext.x > pt.x) {
          const d: double = (ip.x - pt.x) * (ipNext.y - pt.y) -
            (ipNext.x - pt.x) * (ip.y - pt.y);
          if (d === 0) {
            return -1;
          }
          else if (d > 0 === ipNext.y > ip.y) {
            result = 1 - result;
          }
        }
      }
    }
    ip = ipNext;
  }
  return result;
}

export function reversePath(poly: Path): void {
  poly.reverse();
}

export function reversePaths(polys: Paths): void {
  for (let ii = 0, max = polys.length; ii < max; ii++) {
    reversePath(polys[ii]);
  }
}

export function simplifyPolygon(poly: Path, fillType: PolyFillType = PolyFillType.EvenOdd): Paths | undefined { // -> Paths | undefined
  const c = new Clipper();
  c.strictlySimple = true;
  c.addPath(poly, PolyType.Subject, true);
  return c.executePaths(ClipType.Union, fillType, fillType);
}

export function simplifyPolygons(polys: Paths, fillType: PolyFillType = PolyFillType.EvenOdd): Paths | undefined {// -> Paths | undefined
  const c = new Clipper();
  c.strictlySimple = true;
  c.addPaths(polys, PolyType.Subject, true);
  return c.executePaths(ClipType.Union, fillType, fillType);
}

// extras

export function scalePath(path: Path, scale: number, useXyz: boolean = false): Path {
  const sol: Path = [];
  let i = path.length;
  if (useXyz) {
    while (i--) {
      const p = path[i];
      sol.push(newIntPointXYZ(Math.round(p.x * scale), Math.round(p.y * scale), Math.round(p.z! * scale)));
    }
  }
  else {
    while (i--) {
      const p = path[i];
      sol.push(newIntPointXY(Math.round(p.x * scale), Math.round(p.y * scale)));
    }
  }
  return sol;
}

export function scalePaths(paths: Paths, scale: number, useXyz: boolean = false): Paths {
  const sol: Paths = [];
  let i = paths.length;
  while (i--) {
    const p = paths[i];
    sol.push(scalePath(p, scale, useXyz));
  }
  return sol;
}
