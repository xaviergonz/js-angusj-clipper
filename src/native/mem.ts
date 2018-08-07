import { NativeClipperLibInstance } from "./NativeClipperLibInstance";

export function mallocDoubleArray(
  nativeClipperLib: NativeClipperLibInstance,
  len: number
): Float64Array {
  const nofBytes = len * Float64Array.BYTES_PER_ELEMENT;
  const ptr = nativeClipperLib._malloc(nofBytes);
  return new Float64Array(nativeClipperLib.HEAPF64.buffer, ptr, len);
}

export function freeTypedArray(
  nativeClipperLib: NativeClipperLibInstance,
  array: Float64Array | Uint32Array
): void {
  nativeClipperLib._free(array.byteOffset);
}
