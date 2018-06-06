import { Path, ReadonlyPath } from "../Path";
import { freeTypedArray, mallocDoubleArray } from "./mem";
import { NativeClipperLibInstance } from "./NativeClipperLibInstance";
import { NativePath } from "./NativePath";

const coordsPerPoint = 2;

export function getNofItemsForPath(path: ReadonlyPath): number {
  return 1 + path.length * coordsPerPoint;
}

// js to c++

export function writePathToDoubleArray(
  path: ReadonlyPath,
  heapBytes: Float64Array,
  startPtr: number
): number {
  const len = path.length;

  heapBytes[startPtr] = len;

  let arrayI = 1 + startPtr;
  for (let i = 0; i < len; i++) {
    heapBytes[arrayI++] = path[i].x;
    heapBytes[arrayI++] = path[i].y;
  }

  return arrayI;
}

export function pathToDoubleArray(
  nativeClipperLib: NativeClipperLibInstance,
  path: ReadonlyPath
): Float64Array {
  const nofItems = getNofItemsForPath(path);
  const heapBytes = mallocDoubleArray(nativeClipperLib, nofItems);
  writePathToDoubleArray(path, heapBytes, 0);
  return heapBytes;
}

export function doubleArrayToNativePath(
  nativeClipperLib: NativeClipperLibInstance,
  array: Float64Array,
  freeArray: boolean
): NativePath {
  const p = new nativeClipperLib.Path();
  nativeClipperLib.toPath(p, array.byteOffset);
  if (freeArray) {
    freeTypedArray(nativeClipperLib, array);
  }
  return p;
}

export function pathToNativePath(
  nativeClipperLib: NativeClipperLibInstance,
  path: ReadonlyPath
): NativePath {
  const array = pathToDoubleArray(nativeClipperLib, path);
  return doubleArrayToNativePath(nativeClipperLib, array, true);
}

// c++ to js

export function nativePathToDoubleArray(
  nativeClipperLib: NativeClipperLibInstance,
  nativePath: NativePath,
  freeNativePath: boolean
): Float64Array {
  const array = nativeClipperLib.fromPath(nativePath);
  if (freeNativePath) {
    nativePath.delete();
  }
  return array;
}

export function doubleArrayToPath(
  nativeClipperLib: NativeClipperLibInstance,
  array: Float64Array,
  _freeDoubleArray: boolean,
  startPtr: number
): { path: Path; ptrEnd: number } {
  const len = array[startPtr];
  const path = [];
  path.length = len;

  let arrayI = 1 + startPtr;
  for (let i = 0; i < len; i++) {
    path[i] = {
      x: array[arrayI++],
      y: array[arrayI++]
    };
  }

  if (_freeDoubleArray) {
    freeTypedArray(nativeClipperLib, array);
  }

  return {
    path: path,
    ptrEnd: arrayI
  };
}

export function nativePathToPath(
  nativeClipperLib: NativeClipperLibInstance,
  nativePath: NativePath,
  freeNativePath: boolean
): Path {
  const array = nativePathToDoubleArray(nativeClipperLib, nativePath, freeNativePath);
  return doubleArrayToPath(nativeClipperLib, array, true, 0).path;
}
