import { NativeClipper } from "./NativeClipper";
import { NativeClipperOffset } from "./NativeClipperOffset";
import {
  NativeClipType,
  NativeEndType,
  NativeInitOptions,
  NativeJoinType,
  NativePolyFillType,
  NativePolyType
} from "./nativeEnums";
import { NativeIntPoint } from "./NativeIntPoint";
import { NativePath } from "./NativePath";
import { NativePaths } from "./NativePaths";
import { NativePolyTree } from "./NativePolyTree";

export interface NativeClipperLibInstance {
  // custom conversion functions
  toPath(dest: NativePath, coordsPtr: number): void;
  toPaths(dest: NativePaths, pathsPtr: number): void;
  fromPath(path: NativePath): Float64Array;
  fromPaths(paths: NativePaths): Float64Array;

  // memory
  _malloc(nofBytes: number): number;
  _free(ptr: number): void;
  HEAPF64: {
    buffer: ArrayBuffer;
  };

  // types
  Path: new () => NativePath;
  Paths: new () => NativePaths;
  PolyTree: new () => NativePolyTree;
  Clipper: new (initOptions: number) => NativeClipper;
  ClipperOffset: new (miterLimit: number, arcTolerance: number) => NativeClipperOffset;

  // functions
  newIntPoint(x: number, y: number): NativeIntPoint;

  orientation(path: NativePath): boolean;
  area(path: NativePath): number;
  pointInPolygon(pt: NativeIntPoint, path: NativePath): number;

  simplifyPolygon(path: NativePath, outPaths: NativePaths, fillType: NativePolyFillType): void;
  simplifyPolygonsInOut(
    paths: NativePaths,
    outPaths: NativePaths,
    fillType: NativePolyFillType
  ): void;
  simplifyPolygonsOverwrite(paths: NativePaths, fillType: NativePolyFillType): void;

  cleanPolygon(path: NativePath, outPath: NativePath, distance: number): void;
  cleanPolygon(inOutPath: NativePath, distance: number): void;
  cleanPolygons(paths: NativePaths, outPaths: NativePaths, distance: number): void;
  cleanPolygons(inOutPaths: NativePaths, distance: number): void;

  minkowskiSumPath(
    pattern: NativePath,
    path: NativePath,
    outPaths: NativePaths,
    pathIsClosed: boolean
  ): void;
  minkowskiSumPaths(
    pattern: NativePath,
    paths: NativePaths,
    outPaths: NativePaths,
    pathIsClosed: boolean
  ): void;
  minkowskiDiff(path1: NativePath, path2: NativePath, outPaths: NativePaths): void;

  polyTreeToPaths(polyTree: NativePolyTree, outPaths: NativePaths): void;
  closedPathsFromPolyTree(polyTree: NativePolyTree, outPaths: NativePaths): void;
  openPathsFromPolyTree(polyTree: NativePolyTree, outPaths: NativePaths): void;

  reversePath(inOutPath: NativePath): void;
  reversePaths(inOutPaths: NativePaths): void;

  ClipType: NativeClipType;
  PolyType: NativePolyType;
  PolyFillType: NativePolyFillType;
  InitOptions: NativeInitOptions;
  JoinType: NativeJoinType;
  EndType: NativeEndType;
}
