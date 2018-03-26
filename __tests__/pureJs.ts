import * as clipperLib from '../src/lib';

// another port of clipper in pure js
export const pureJsClipperLib = require('./external-libs/clipper');

export interface PureJsPoint {
  X: number;
  Y: number;
}

export type PureJsPath = PureJsPoint[];
export type PureJsPaths = PureJsPath[];

export function pureJsTestPolyOperation(
  clipType: clipperLib.ClipType,
  subjectFillType: clipperLib.PolyFillType,
  mode: 'path' | 'paths',
  subjectInput: PureJsPath | PureJsPaths,
  clipInput: PureJsPath | PureJsPaths,
) {
  const pureJsClipper = new pureJsClipperLib.Clipper();
  if (mode === 'path') {
    pureJsClipper.AddPath(subjectInput, pureJsClipperLib.PolyType.ptSubject, true);
    pureJsClipper.AddPath(clipInput, pureJsClipperLib.PolyType.ptClip, true);
  }
  else {
    pureJsClipper.AddPaths(subjectInput, pureJsClipperLib.PolyType.ptSubject, true);
    pureJsClipper.AddPaths(clipInput, pureJsClipperLib.PolyType.ptClip, true);
  }

  const solutionPaths = new pureJsClipperLib.Paths();
  const succeeded = pureJsClipper.Execute(
    clipTypeToPureJs(clipType),
    solutionPaths,
    polyFillTypeToPureJs(subjectFillType),
    polyFillTypeToPureJs(subjectFillType),
  );

  return solutionPaths;
}

export function pathToPureJs(path: clipperLib.Path): PureJsPath {
  return path.map((p) => ({
    X: p.x,
    Y: p.y,
  }));
}

export function pathsToPureJs(paths: clipperLib.Paths): PureJsPaths {
  return paths.map((p) => (pathToPureJs(p)));
}

export function clipTypeToPureJs(clipType: clipperLib.ClipType): number {
  switch (clipType) {
    case clipperLib.ClipType.Difference:
      return pureJsClipperLib.ClipType.ctDifference;
    case clipperLib.ClipType.Intersection:
      return pureJsClipperLib.ClipType.ctIntersection;
    case clipperLib.ClipType.Union:
      return pureJsClipperLib.ClipType.ctUnion;
    case clipperLib.ClipType.Xor:
      return pureJsClipperLib.ClipType.ctXor;
    default:
      return -1;
  }
}

export function polyFillTypeToPureJs(polyFillType: clipperLib.PolyFillType): number {
  switch (polyFillType) {
    case clipperLib.PolyFillType.EvenOdd:
      return pureJsClipperLib.PolyFillType.pftEvenOdd;
    case clipperLib.PolyFillType.Negative:
      return pureJsClipperLib.PolyFillType.pftNonZero;
    case clipperLib.PolyFillType.NonZero:
      return pureJsClipperLib.PolyFillType.pftEvenOdd;
    case clipperLib.PolyFillType.Positive:
      return pureJsClipperLib.PolyFillType.pftPositive;
    default:
      return -1;
  }
}
