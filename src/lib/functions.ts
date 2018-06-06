import { PointInPolygonResult, PolyFillType } from "./enums";
import { IntPoint } from "./IntPoint";
import { NativeClipperLibInstance } from "./native/NativeClipperLibInstance";
import { NativeDeletable } from "./native/NativeDeletable";
import { polyFillTypeToNative } from "./native/nativeEnumConversion";
import { nativePathsToPaths, pathsToNativePaths } from "./native/PathsToNativePaths";
import { nativePathToPath, pathToNativePath } from "./native/PathToNativePath";
import { Path, ReadonlyPath } from "./Path";
import { Paths, ReadonlyPaths } from "./Paths";
import { PolyNode } from "./PolyNode";
import { PolyTree } from "./PolyTree";

function tryDelete(...objs: NativeDeletable[]) {
  for (const obj of objs) {
    if (!obj.isDeleted()) {
      obj.delete();
    }
  }
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

export function cleanPolygon(
  nativeLib: NativeClipperLibInstance,
  path: ReadonlyPath,
  distance = 1.1415
): Path {
  const nativePath = pathToNativePath(nativeLib, path);
  try {
    nativeLib.cleanPolygon(nativePath, distance);
    return nativePathToPath(nativeLib, nativePath, true); // frees nativePath
  } finally {
    tryDelete(nativePath);
  }
}

export function cleanPolygons(
  nativeLib: NativeClipperLibInstance,
  paths: ReadonlyPaths,
  distance = 1.1415
): Paths {
  const nativePaths = pathsToNativePaths(nativeLib, paths);
  try {
    nativeLib.cleanPolygons(nativePaths, distance);
    return nativePathsToPaths(nativeLib, nativePaths, true); // frees nativePath
  } finally {
    tryDelete(nativePaths);
  }
}

const enum NodeType {
  Any,
  Open,
  Closed
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
  nativeLib: NativeClipperLibInstance,
  poly1: ReadonlyPath,
  poly2: ReadonlyPath
): Paths {
  const nativePath1 = pathToNativePath(nativeLib, poly1);
  const nativePath2 = pathToNativePath(nativeLib, poly2);
  const outNativePaths = new nativeLib.Paths();

  try {
    nativeLib.minkowskiDiff(nativePath1, nativePath2, outNativePaths);
    tryDelete(nativePath1, nativePath2);
    return nativePathsToPaths(nativeLib, outNativePaths, true); // frees outNativePaths
  } finally {
    tryDelete(nativePath1, nativePath2, outNativePaths);
  }
}

export function minkowskiSumPath(
  nativeLib: NativeClipperLibInstance,
  pattern: ReadonlyPath,
  path: ReadonlyPath,
  pathIsClosed: boolean
): Paths {
  const patternNativePath = pathToNativePath(nativeLib, pattern);
  const nativePath = pathToNativePath(nativeLib, path);
  const outNativePaths = new nativeLib.Paths();

  try {
    nativeLib.minkowskiSumPath(patternNativePath, nativePath, outNativePaths, pathIsClosed);
    tryDelete(patternNativePath, nativePath);
    return nativePathsToPaths(nativeLib, outNativePaths, true); // frees outNativePaths
  } finally {
    tryDelete(patternNativePath, nativePath, outNativePaths);
  }
}

export function minkowskiSumPaths(
  nativeLib: NativeClipperLibInstance,
  pattern: ReadonlyPath,
  paths: ReadonlyPaths,
  pathIsClosed: boolean
): Paths {
  // TODO: im not sure if for this method we can reuse the input/output path

  const patternNativePath = pathToNativePath(nativeLib, pattern);
  const nativePaths = pathsToNativePaths(nativeLib, paths);

  try {
    nativeLib.minkowskiSumPaths(patternNativePath, nativePaths, nativePaths, pathIsClosed);
    tryDelete(patternNativePath);
    return nativePathsToPaths(nativeLib, nativePaths, true); // frees nativePaths
  } finally {
    tryDelete(patternNativePath, nativePaths);
  }
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
  nativeLib: NativeClipperLibInstance,
  path: ReadonlyPath,
  fillType: PolyFillType = PolyFillType.EvenOdd
): Paths {
  const nativePath = pathToNativePath(nativeLib, path);
  const outNativePaths = new nativeLib.Paths();
  try {
    nativeLib.simplifyPolygon(
      nativePath,
      outNativePaths,
      polyFillTypeToNative(nativeLib, fillType)
    );
    tryDelete(nativePath);
    return nativePathsToPaths(nativeLib, outNativePaths, true); // frees outNativePaths
  } finally {
    tryDelete(nativePath, outNativePaths);
  }
}

export function simplifyPolygons(
  nativeLib: NativeClipperLibInstance,
  paths: ReadonlyPaths,
  fillType: PolyFillType = PolyFillType.EvenOdd
): Paths {
  const nativePaths = pathsToNativePaths(nativeLib, paths);
  try {
    nativeLib.simplifyPolygonsOverwrite(nativePaths, polyFillTypeToNative(nativeLib, fillType));
    return nativePathsToPaths(nativeLib, nativePaths, true); // frees nativePaths
  } finally {
    tryDelete(nativePaths);
  }
}

export function scalePath(path: ReadonlyPath, scale: number): Path {
  const sol: Path = [];
  let i = path.length;
  while (i--) {
    const p = path[i];
    sol.push({
      x: Math.round(p.x * scale),
      y: Math.round(p.y * scale)
    });
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

  const sol: Paths = [];
  let i = paths.length;
  while (i--) {
    const p = paths[i];
    sol.push(scalePath(p, scale));
  }
  return sol;
}
