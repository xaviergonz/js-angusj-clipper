/**
 * Raw exports of the native (wasm) module. See src/wasm/binding.hpp for the details of each function.
 *
 * All pointers are byte offsets into the wasm heap. Functions returning a pointer return 0 on error.
 */
export interface NativeClipperLibInstance {
  // memory
  HEAPF64: Float64Array;
  HEAPU8: Uint8Array;
  _malloc(nofBytes: number): number;
  _free(ptr: number): void;
  _releaseOutput(): void;

  // errors
  _getErrorCode(): number;
  _getErrorMessage(): number;

  // operations
  _clip(
    inPtr: number,
    clipType: number,
    subjFillType: number,
    clipFillType: number,
    initOptions: number,
    polyTreeMode: number,
    cleanDistance: number
  ): number;
  _offset(
    inPtr: number,
    miterLimit: number,
    arcTolerance: number,
    delta: number,
    polyTreeMode: number,
    cleanDistance: number
  ): number;
  _cleanPolygons(inPtr: number, distance: number): number;
  _simplifyPolygons(inPtr: number, fillType: number): number;
  _minkowskiSumPath(inPtr: number, pathIsClosed: number): number;
  _minkowskiSumPaths(inPtr: number, pathIsClosed: number): number;
  _minkowskiDiff(inPtr: number): number;
}
