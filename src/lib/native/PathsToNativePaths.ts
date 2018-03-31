import { Path } from "../Path";
import { Paths, ReadonlyPaths } from "../Paths";
import { freeTypedArray, mallocDoubleArray } from "./mem";
import { NativeClipperLibInstance } from "./NativeClipperLibInstance";
import { NativePaths } from "./NativePaths";
import { doubleArrayToPath, getNofItemsForPath, writePathToDoubleArray } from "./PathToNativePath";

// js to c++

export function pathsToDoubleArray(
  nativeClipperLib: NativeClipperLibInstance,
  myPaths: ReadonlyPaths
): Float64Array {
  const nofPaths = myPaths.length;

  // first calculate nof items required
  let nofItems = 1; // for path count
  for (let i = 0; i < nofPaths; i++) {
    nofItems += getNofItemsForPath(myPaths[i]);
  }
  const heapBytes = mallocDoubleArray(nativeClipperLib, nofItems);
  heapBytes[0] = nofPaths;

  let ptr = 1;
  for (let i = 0; i < nofPaths; i++) {
    const path = myPaths[i];
    ptr = writePathToDoubleArray(path, heapBytes, ptr);
  }

  return heapBytes;
}

export function doubleArrayToNativePaths(
  nativeClipperLib: NativeClipperLibInstance,
  array: Float64Array,
  freeArray: boolean
): NativePaths {
  const p = new nativeClipperLib.Paths();
  nativeClipperLib.toPaths(p, array.byteOffset);
  if (freeArray) {
    freeTypedArray(nativeClipperLib, array);
  }
  return p;
}

export function pathsToNativePaths(
  nativeClipperLib: NativeClipperLibInstance,
  paths: ReadonlyPaths
): NativePaths {
  const array = pathsToDoubleArray(nativeClipperLib, paths);
  return doubleArrayToNativePaths(nativeClipperLib, array, true);
}

// c++ to js

export function nativePathsToDoubleArray(
  nativeClipperLib: NativeClipperLibInstance,
  nativePaths: NativePaths,
  freeNativePaths: boolean
): Float64Array {
  const array = nativeClipperLib.fromPaths(nativePaths);
  if (freeNativePaths) {
    nativePaths.delete();
  }
  return array;
}

export function doubleArrayToPaths(
  nativeClipperLib: NativeClipperLibInstance,
  array: Float64Array,
  _freeDoubleArray: boolean
): Paths {
  const len = array[0];
  const paths: Path[] = [];
  paths.length = len;

  let arrayI = 1;
  for (let i = 0; i < len; i++) {
    const result = doubleArrayToPath(nativeClipperLib, array, false, arrayI);
    paths[i] = result.path;
    arrayI = result.ptrEnd;
  }

  if (_freeDoubleArray) {
    freeTypedArray(nativeClipperLib, array);
  }

  return paths;
}

export function nativePathsToPaths(
  nativeClipperLib: NativeClipperLibInstance,
  nativePaths: NativePaths,
  freeNativePaths: boolean
): Paths {
  const array = nativePathsToDoubleArray(nativeClipperLib, nativePaths, freeNativePaths);
  return doubleArrayToPaths(nativeClipperLib, array, true);
}
