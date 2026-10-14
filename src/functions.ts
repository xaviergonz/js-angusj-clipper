import { PointInPolygonResult, PolyFillType } from "./enums";
import { IntPoint } from "./IntPoint";
import {
  NativeBridge,
  nativePathOrPathsSize,
  nativePathSize,
  nativePathsSize,
  nativePolyFillType,
} from "./native/NativeBridge";
import { Path, ReadonlyPath } from "./Path";
import { Paths, ReadonlyPaths } from "./Paths";
import { PolyNode } from "./PolyNode";
import { PolyTree } from "./PolyTree";

function writePathOrPaths(bridge: NativeBridge, pathOrPaths: ReadonlyPath | ReadonlyPaths): number {
  const ptr = bridge.beginInput(nativePathOrPathsSize(pathOrPaths));
  bridge.writePathOrPaths(pathOrPaths);
  return ptr;
}

export function area(path: ReadonlyPath): number {
  // we use JS since copying structures is slower than actually doing it
  const cnt = path.length;
  if (cnt < 3) {
    return 0;
  }
  let a = 0;
  for (let i = 0, j = cnt - 1; i < cnt; ++i) {
    a += (path[j].x + path[i].x) * (path[j].y - path[i].y);
    j = i;
  }
  return -a * 0.5;
}

export function cleanPolygon(bridge: NativeBridge, path: ReadonlyPath, distance = 1.1415): Path {
  const inPtr = writePathOrPaths(bridge, path);
  return bridge.readPathsOrThrow(bridge.lib._cleanPolygons(inPtr, distance))[0];
}

export function cleanPolygons(
  bridge: NativeBridge,
  paths: ReadonlyPaths,
  distance = 1.1415
): Paths {
  const inPtr = writePathOrPaths(bridge, paths);
  return bridge.readPathsOrThrow(bridge.lib._cleanPolygons(inPtr, distance));
}

const enum NodeType {
  Any,
  Open,
  Closed,
}

function addPolyNodeToPaths(polynode: PolyNode, nt: NodeType, paths: ReadonlyPath[]): void {
  let match = true;
  switch (nt) {
    case NodeType.Open:
      return;
    case NodeType.Closed:
      match = !polynode.isOpen;
      break;
    default:
      break;
  }

  if (polynode.contour.length > 0 && match) {
    paths.push(polynode.contour);
  }
  for (let ii = 0, max = polynode.childs.length; ii < max; ii++) {
    const pn = polynode.childs[ii];
    addPolyNodeToPaths(pn, nt, paths);
  }
}

export function closedPathsFromPolyTree(polyTree: PolyTree): Paths {
  // we do this in JS since copying path is more expensive than just doing it

  const result: Paths = [];
  // result.Capacity = polytree.Total;
  addPolyNodeToPaths(polyTree, NodeType.Closed, result);
  return result;
}

export function minkowskiDiff(
  bridge: NativeBridge,
  poly1: ReadonlyPath,
  poly2: ReadonlyPath
): Paths {
  const inPtr = bridge.beginInput(nativePathSize(poly1) + nativePathSize(poly2));
  bridge.writePath(poly1);
  bridge.writePath(poly2);
  return bridge.readPathsOrThrow(bridge.lib._minkowskiDiff(inPtr));
}

export function minkowskiSumPath(
  bridge: NativeBridge,
  pattern: ReadonlyPath,
  path: ReadonlyPath,
  pathIsClosed: boolean
): Paths {
  const inPtr = bridge.beginInput(nativePathSize(pattern) + nativePathSize(path));
  bridge.writePath(pattern);
  bridge.writePath(path);
  return bridge.readPathsOrThrow(bridge.lib._minkowskiSumPath(inPtr, pathIsClosed ? 1 : 0));
}

export function minkowskiSumPaths(
  bridge: NativeBridge,
  pattern: ReadonlyPath,
  paths: ReadonlyPaths,
  pathIsClosed: boolean
): Paths {
  const inPtr = bridge.beginInput(nativePathSize(pattern) + nativePathsSize(paths));
  bridge.writePath(pattern);
  bridge.writePaths(paths);
  return bridge.readPathsOrThrow(bridge.lib._minkowskiSumPaths(inPtr, pathIsClosed ? 1 : 0));
}

export function openPathsFromPolyTree(polyTree: PolyTree): ReadonlyPath[] {
  // we do this in JS since copying path is more expensive than just doing it

  const result = [];
  const len = polyTree.childs.length;
  result.length = len;
  let resultLength = 0;
  for (let i = 0; i < len; i++) {
    if (polyTree.childs[i].isOpen) {
      result[resultLength++] = polyTree.childs[i].contour;
    }
  }
  result.length = resultLength;
  return result;
}

export function orientation(path: ReadonlyPath): boolean {
  return area(path) >= 0;
}

export function pointInPolygon(
  point: Readonly<IntPoint>,
  path: ReadonlyPath
): PointInPolygonResult {
  // we do this in JS since copying path is more expensive than just doing it

  // returns 0 if false, +1 if true, -1 if pt ON polygon boundary
  // See "The Point in Polygon Problem for Arbitrary Polygons" by Hormann & Agathos
  // http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.88.5498&rep=rep1&type=pdf
  let result = 0;
  const cnt = path.length;
  if (cnt < 3) {
    return 0;
  }
  let ip = path[0];
  for (let i = 1; i <= cnt; ++i) {
    const ipNext = i === cnt ? path[0] : path[i];
    if (ipNext.y === point.y) {
      if (ipNext.x === point.x || (ip.y === point.y && ipNext.x > point.x === ip.x < point.x)) {
        return -1;
      }
    }
    if (ip.y < point.y !== ipNext.y < point.y) {
      if (ip.x >= point.x) {
        if (ipNext.x > point.x) {
          result = 1 - result;
        } else {
          const d =
            (ip.x - point.x) * (ipNext.y - point.y) - (ipNext.x - point.x) * (ip.y - point.y);
          if (d === 0) {
            return -1;
          } else if (d > 0 === ipNext.y > ip.y) {
            result = 1 - result;
          }
        }
      } else {
        if (ipNext.x > point.x) {
          const d =
            (ip.x - point.x) * (ipNext.y - point.y) - (ipNext.x - point.x) * (ip.y - point.y);
          if (d === 0) {
            return -1;
          } else if (d > 0 === ipNext.y > ip.y) {
            result = 1 - result;
          }
        }
      }
    }
    ip = ipNext;
  }
  return result;
}

export function polyTreeToPaths(polyTree: PolyTree): Paths {
  // we do this in JS since copying path is more expensive than just doing it

  const result: Paths = [];
  // result.Capacity = polytree.total;
  addPolyNodeToPaths(polyTree, NodeType.Any, result);
  return result;
}

export function reversePath(path: Path): void {
  // we use JS since copying structures is slower than actually doing it
  path.reverse();
}

export function reversePaths(paths: Paths): void {
  // we use JS since copying structures is slower than actually doing it
  for (let i = 0, max = paths.length; i < max; i++) {
    reversePath(paths[i]);
  }
}

export function simplifyPolygon(
  bridge: NativeBridge,
  path: ReadonlyPath,
  fillType: PolyFillType = PolyFillType.EvenOdd
): Paths {
  const inPtr = writePathOrPaths(bridge, path);
  return bridge.readPathsOrThrow(bridge.lib._simplifyPolygons(inPtr, nativePolyFillType[fillType]));
}

export function simplifyPolygons(
  bridge: NativeBridge,
  paths: ReadonlyPaths,
  fillType: PolyFillType = PolyFillType.EvenOdd
): Paths {
  const inPtr = writePathOrPaths(bridge, paths);
  return bridge.readPathsOrThrow(bridge.lib._simplifyPolygons(inPtr, nativePolyFillType[fillType]));
}

export function scalePath(path: ReadonlyPath, scale: number): Path {
  const len = path.length;

  const sol: Path = [];
  sol.length = path.length;

  for (let i = 0; i < len; i++) {
    const p = path[i];
    sol[i] = {
      x: Math.round(p.x * scale),
      y: Math.round(p.y * scale),
    };
  }

  return sol;
}

/**
 * Scales all inner paths by multiplying all its coordinates by a number and then rounding them.
 *
 * @param paths - Paths to scale
 * @param scale - Scale multiplier
 * @return {Paths} - The scaled paths
 */
export function scalePaths(paths: ReadonlyPaths, scale: number): Paths {
  if (scale === 0) {
    return [];
  }

  const len = paths.length;

  const sol: Paths = [];
  sol.length = len;

  for (let i = 0; i < len; i++) {
    sol[i] = scalePath(paths[i], scale);
  }

  return sol;
}
