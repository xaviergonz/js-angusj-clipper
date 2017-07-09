import { PolyFillType } from './enums';
import { IntPoint } from './IntPoint';
import { NativeClipperLibInstance } from './native/NativeClipperLibInstance';
import { NativeDeletable } from './native/NativeDeletable';
import { polyFillTypeToNative } from './native/nativeEnumConversion';
import { nativePathsToPaths, pathsToNativePaths } from './native/PathsToNativePaths';
import { nativePathToPath, pathToNativePath } from './native/PathToNativePath';
import { Path } from './Path';
import { Paths } from './Paths';
import { PolyNode } from './PolyNode';
import { PolyTree } from './PolyTree';

function tryDelete(...objs: NativeDeletable[]) {
  for (const obj of objs) {
    if (!obj.isDeleted()) {
      obj.delete();
    }
  }
}

/**
 * This function returns the area of the supplied polygon. It's assumed that the path is closed and does not self-intersect. Depending on orientation,
 * this value may be positive or negative. If Orientation is true, then the area will be positive and conversely, if Orientation is false, then the
 * area will be negative.
 *
 * @param path - The path
 * @return {number} - Area
 */
export function area(path: Path): number {
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

/**
 * Removes vertices:
 * - that join co-linear edges, or join edges that are almost co-linear (such that if the vertex was moved no more than the specified distance the edges
 * would be co-linear)
 * - that are within the specified distance of an adjacent vertex
 * - that are within the specified distance of a semi-adjacent vertex together with their out-lying vertices
 *
 * Vertices are semi-adjacent when they are separated by a single (out-lying) vertex.
 *
 * The distance parameter's default value is approximately √2 so that a vertex will be removed when adjacent or semi-adjacent vertices having their
 * corresponding X and Y coordinates differing by no more than 1 unit. (If the egdes are semi-adjacent the out-lying vertex will be removed too.)
 *
 * @param nativeLib
 * @param path - The path to clean
 * @param distance - How close points need to be before they are cleaned
 * @return {Path} - The cleaned path
 */
export function cleanPolygon(nativeLib: NativeClipperLibInstance, path: Path, distance = 1.1415): Path {
  const nativePath = pathToNativePath(nativeLib, path);
  try {
    nativeLib.cleanPolygon(nativePath, distance);
    return nativePathToPath(nativeLib, nativePath); // frees nativePath
  }
  finally {
    tryDelete(nativePath);
  }
}

/**
 * Removes vertices:
 * - that join co-linear edges, or join edges that are almost co-linear (such that if the vertex was moved no more than the specified distance the edges
 * would be co-linear)
 * - that are within the specified distance of an adjacent vertex
 * - that are within the specified distance of a semi-adjacent vertex together with their out-lying vertices
 *
 * Vertices are semi-adjacent when they are separated by a single (out-lying) vertex.
 *
 * The distance parameter's default value is approximately √2 so that a vertex will be removed when adjacent or semi-adjacent vertices having their
 * corresponding X and Y coordinates differing by no more than 1 unit. (If the egdes are semi-adjacent the out-lying vertex will be removed too.)
 *
 * @param nativeLib
 * @param paths - The paths to clean
 * @param distance - How close points need to be before they are cleaned
 * @return {Paths} - The cleaned paths
 */
export function cleanPolygons(nativeLib: NativeClipperLibInstance, paths: Paths, distance = 1.1415): Paths {
  const nativePaths = pathsToNativePaths(nativeLib, paths);
  try {
    nativeLib.cleanPolygons(nativePaths, distance);
    return nativePathsToPaths(nativeLib, nativePaths); // frees nativePath
  }
  finally {
    tryDelete(nativePaths);
  }
}

const enum NodeType { Any, Open, Closed }

function addPolyNodeToPaths(polynode: PolyNode, nt: NodeType, paths: Paths): void {
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


/**
 * This function filters out open paths from the PolyTree structure and returns only closed paths in a Paths structure.
 *
 * @param polyTree
 * @return {Paths}
 */
export function closedPathsFromPolyTree(polyTree: PolyTree): Paths {
  // we do this in JS since copying path is more expensive than just doing it

  const result: Paths = [];
  //result.Capacity = polytree.Total;
  addPolyNodeToPaths(polyTree, NodeType.Closed, result);
  return result;
}


/**
 *  Minkowski Difference is performed by subtracting each point in a polygon from the set of points in an open or closed path. A key feature of Minkowski
 *  Difference is that when it's applied to two polygons, the resulting polygon will contain the coordinate space origin whenever the two polygons touch or
 *  overlap. (This function is often used to determine when polygons collide.)
 *
 * @param nativeLib
 * @param poly1
 * @param poly2
 * @return {Paths}
 */
export function minkowskiDiff(nativeLib: NativeClipperLibInstance, poly1: Path, poly2: Path): Paths {
  const nativePath1 = pathToNativePath(nativeLib, poly1);
  const nativePath2 = pathToNativePath(nativeLib, poly2);
  const outNativePaths = new nativeLib.Paths();

  try {
    nativeLib.minkowskiDiff(nativePath1, nativePath2, outNativePaths);
    tryDelete(nativePath1, nativePath2);
    return nativePathsToPaths(nativeLib, outNativePaths); // frees outNativePaths
  }
  finally {
    tryDelete(nativePath1, nativePath2, outNativePaths);
  }
}

/**
 * Minkowski Addition is performed by adding each point in a polygon 'pattern' to the set of points in an open or closed path. The resulting polygon
 * (or polygons) defines the region that the 'pattern' would pass over in moving from the beginning to the end of the 'path'.
 *
 * @param nativeLib
 * @param pattern
 * @param path
 * @param pathIsClosed
 * @return {Paths}
 */
export function minkowskiSumPath(nativeLib: NativeClipperLibInstance, pattern: Path, path: Path, pathIsClosed: boolean): Paths {
  const patternNativePath = pathToNativePath(nativeLib, pattern);
  const nativePath = pathToNativePath(nativeLib, path);
  const outNativePaths = new nativeLib.Paths();

  try {
    nativeLib.minkowskiSumPath(patternNativePath, nativePath, outNativePaths, pathIsClosed);
    tryDelete(patternNativePath, nativePath);
    return nativePathsToPaths(nativeLib, outNativePaths); // frees outNativePaths
  }
  finally {
    tryDelete(patternNativePath, nativePath, outNativePaths);
  }
}

/**
 * Minkowski Addition is performed by adding each point in a polygon 'pattern' to the set of points in an open or closed path. The resulting polygon
 * (or polygons) defines the region that the 'pattern' would pass over in moving from the beginning to the end of the 'path'.
 *
 * @param nativeLib
 * @param pattern
 * @param paths
 * @param pathIsClosed
 * @return {Paths}
 */
export function minkowskiSumPaths(nativeLib: NativeClipperLibInstance, pattern: Path, paths: Paths, pathIsClosed: boolean): Paths {
  // TODO: im not sure if for this method we can reuse the input/output path

  const patternNativePath = pathToNativePath(nativeLib, pattern);
  const nativePaths = pathsToNativePaths(nativeLib, paths);

  try {
    nativeLib.minkowskiSumPaths(patternNativePath, nativePaths, nativePaths, pathIsClosed);
    tryDelete(patternNativePath);
    return nativePathsToPaths(nativeLib, nativePaths); // frees nativePaths
  }
  finally {
    tryDelete(patternNativePath, nativePaths);
  }
}

/**
 * This function filters out closed paths from the PolyTree structure and returns only open paths in a Paths structure.
 *
 * @param polyTree
 * @return {Paths}
 */
export function openPathsFromPolyTree(polyTree: PolyTree): Paths {
  // we do this in JS since copying path is more expensive than just doing it

  const result = [];
  const len = polyTree.childs.length;
  result.length = len ;
  let resultLength = 0;
  for (let i = 0; i < len ; i++) {
    if (polyTree.childs[i].isOpen) {
      result[resultLength++] = polyTree.childs[i].contour;
    }
  }
  result.length = resultLength;
  return result;
}

/**
 * Orientation is only important to closed paths. Given that vertices are declared in a specific order, orientation refers to the direction (clockwise or
 * counter-clockwise) that these vertices progress around a closed path.
 *
 * Orientation is also dependent on axis direction:
 * - On Y-axis positive upward displays, Orientation will return true if the polygon's orientation is counter-clockwise.
 * - On Y-axis positive downward displays, Orientation will return true if the polygon's orientation is clockwise.
 *
 * Notes:
 * - Self-intersecting polygons have indeterminate orientations in which case this function won't return a meaningful value.
 * - The majority of 2D graphic display libraries (eg GDI, GDI+, XLib, Cairo, AGG, Graphics32) and even the SVG file format have their coordinate origins
 * at the top-left corner of their respective viewports with their Y axes increasing downward. However, some display libraries (eg Quartz, OpenGL) have their
 * coordinate origins undefined or in the classic bottom-left position with their Y axes increasing upward.
 * - For Non-Zero filled polygons, the orientation of holes must be opposite that of outer polygons.
 * - For closed paths (polygons) in the solution returned by Clipper's Execute method, their orientations will always be true for outer polygons and false
 * for hole polygons (unless the ReverseSolution property has been enabled).
 *
 * @param path - Path
 * @return {boolean}
 */
export function orientation(path: Path): boolean {
  return area(path) >= 0;
}

export const enum PointInPolygonResult {
  Outside = 0,
  Inside = 1,
  OnBoundary = -1
}

/**
 * Returns PointInPolygonResult.Outside when false, PointInPolygonResult.OnBoundary when pt is on poly and PointInPolygonResult.Inside when pt is in poly.
 *
 * It's assumed that 'poly' is closed and does not self-intersect.
 *
 * @param point
 * @param path
 * @return {PointInPolygonResult}
 */
export function pointInPolygon(point: IntPoint, path: Path): PointInPolygonResult {
  // we do this in JS since copying path is more expensive than just doing it

  //returns 0 if false, +1 if true, -1 if pt ON polygon boundary
  //See "The Point in Polygon Problem for Arbitrary Polygons" by Hormann & Agathos
  //http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.88.5498&rep=rep1&type=pdf
  let result = 0;
  const cnt = path.length;
  if (cnt < 3) {
    return 0;
  }
  let ip = path[0];
  for (let i = 1; i <= cnt; ++i) {
    const ipNext = i === cnt ? path[0] : path[i];
    if (ipNext.y === point.y) {
      if (ipNext.x === point.x || ip.y === point.y &&
        ipNext.x > point.x === ip.x < point.x) {
        return -1;
      }
    }
    if (ip.y < point.y !== ipNext.y < point.y) {
      if (ip.x >= point.x) {
        if (ipNext.x > point.x) {
          result = 1 - result;
        }
        else {
          const d = (ip.x - point.x) * (ipNext.y - point.y) -
            (ipNext.x - point.x) * (ip.y - point.y);
          if (d === 0) {
            return -1;
          }
          else if (d > 0 === ipNext.y > ip.y) {
            result = 1 - result;
          }
        }
      }
      else {
        if (ipNext.x > point.x) {
          const d = (ip.x - point.x) * (ipNext.y - point.y) -
            (ipNext.x - point.x) * (ip.y - point.y);
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

/**
 * This function converts a PolyTree structure into a Paths structure.
 *
 * @param polyTree
 * @return {Paths}
 */
export function polyTreeToPaths(polyTree: PolyTree): Paths {
  // we do this in JS since copying path is more expensive than just doing it

  const result: Paths = [];
  //result.Capacity = polytree.total;
  addPolyNodeToPaths(polyTree, NodeType.Any, result);
  return result;
}

/**
 * Reverses the vertex order (and hence orientation) in the specified path.
 *
 * @param path - Path to reverse, which gets overwritten rather than copied
 */
export function reversePath(path: Path): void {
  // we use JS since copying structures is slower than actually doing it
  path.reverse();
}

/**
 * Reverses the vertex order (and hence orientation) in each contained path.
 *
 * @param paths - Paths to reverse, which get overwritten rather than copied
 */
export function reversePaths(paths: Paths): void {
  // we use JS since copying structures is slower than actually doing it
  for (let i = 0, max = paths.length; i < max; i++) {
    reversePath(paths[i]);
  }
}

/**
 * Removes self-intersections from the supplied polygon (by performing a boolean union operation using the nominated PolyFillType).
 * Polygons with non-contiguous duplicate vertices (ie 'touching') will be split into two polygons.
 *
 * Note: There's currently no guarantee that polygons will be strictly simple since 'simplifying' is still a work in progress.
 *
 * @param nativeLib
 * @param path
 * @param fillType
 * @return {Paths} - The solution
 */
export function simplifyPolygon(nativeLib: NativeClipperLibInstance, path: Path, fillType: PolyFillType = PolyFillType.EvenOdd): Paths {
  const nativePath = pathToNativePath(nativeLib, path);
  const outNativePaths = new nativeLib.Paths();
  try {
    nativeLib.simplifyPolygon(nativePath, outNativePaths, polyFillTypeToNative(nativeLib, fillType));
    tryDelete(nativePath);
    return nativePathsToPaths(nativeLib, outNativePaths); // frees outNativePaths
  }
  finally {
    tryDelete(nativePath, outNativePaths);
  }
}

/**
 * Removes self-intersections from the supplied polygons (by performing a boolean union operation using the nominated PolyFillType).
 * Polygons with non-contiguous duplicate vertices (ie 'vertices are touching') will be split into two polygons.
 *
 * Note: There's currently no guarantee that polygons will be strictly simple since 'simplifying' is still a work in progress.
 *
 * @param nativeLib
 * @param paths
 * @param fillType
 * @return {Paths} - The solution
 */
export function simplifyPolygons(nativeLib: NativeClipperLibInstance, paths: Paths, fillType: PolyFillType = PolyFillType.EvenOdd): Paths {
  const nativePaths = pathsToNativePaths(nativeLib, paths);
  try {
    nativeLib.simplifyPolygonsOverwrite(nativePaths, polyFillTypeToNative(nativeLib, fillType));
    return nativePathsToPaths(nativeLib, nativePaths); // frees nativePaths
  }
  finally {
    tryDelete(nativePaths);
  }
}

/**
 * Scales a path by multiplying all its coordinates by a number and then rounding them.
 *
 * @param path - Path to scale
 * @param scale - Scale multiplier
 * @return {Path} - The scaled path
 */
export function scalePath(path: Path, scale: number): Path {
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
export function scalePaths(paths: Paths, scale: number): Paths {
  if (scale === 0) return [];

  const sol: Paths = [];
  let i = paths.length;
  while (i--) {
    const p = paths[i];
    sol.push(scalePath(p, scale));
  }
  return sol;
}
