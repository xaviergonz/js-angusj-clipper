import { ClipperError } from "../ClipperError";
import { ClipType, EndType, JoinType, PolyFillType, PolyType } from "../enums";
import { Path, ReadonlyPath } from "../Path";
import { Paths, ReadonlyPaths } from "../Paths";
import { NativeClipperLibInstance } from "./NativeClipperLibInstance";

// these must match the enums in src/wasm/clipper.hpp
export const nativeClipType: Record<ClipType, number> = {
  [ClipType.Intersection]: 0,
  [ClipType.Union]: 1,
  [ClipType.Difference]: 2,
  [ClipType.Xor]: 3,
};

export const nativePolyType: Record<PolyType, number> = {
  [PolyType.Subject]: 0,
  [PolyType.Clip]: 1,
};

export const nativePolyFillType: Record<PolyFillType, number> = {
  [PolyFillType.EvenOdd]: 0,
  [PolyFillType.NonZero]: 1,
  [PolyFillType.Positive]: 2,
  [PolyFillType.Negative]: 3,
};

export const nativeJoinType: Record<JoinType, number> = {
  [JoinType.Square]: 0,
  [JoinType.Round]: 1,
  [JoinType.Miter]: 2,
};

export const nativeEndType: Record<EndType, number> = {
  [EndType.ClosedPolygon]: 0,
  [EndType.ClosedLine]: 1,
  [EndType.OpenButt]: 2,
  [EndType.OpenSquare]: 3,
  [EndType.OpenRound]: 4,
};

export const enum NativeInitOptions {
  ReverseSolution = 1,
  StrictlySimple = 2,
  PreserveCollinear = 4,
}

// these must match the error codes in src/wasm/binding.hpp
export const enum NativeErrorCode {
  None = 0,
  InvalidPath = 1,
  InvalidPaths = 2,
  ExecuteFailed = 3,
  Exception = 4,
}

const coordsPerPoint = 2;
const minInputCapacity = 1024; // in doubles

// buffers up to this size (in doubles, 1 MiB) are kept between calls so they can be reused,
// bigger ones are released once the call is done
const maxRetainedCapacity = 128 * 1024;

/**
 * Number of doubles needed to encode a path.
 */
export function nativePathSize(path: ReadonlyPath): number {
  return 1 + path.length * coordsPerPoint;
}

/**
 * Number of doubles needed to encode some paths.
 */
export function nativePathsSize(paths: ReadonlyPaths): number {
  let size = 1;
  for (let i = 0, max = paths.length; i < max; i++) {
    size += nativePathSize(paths[i]);
  }
  return size;
}

export function isPaths(pathOrPaths: ReadonlyPath | ReadonlyPaths): pathOrPaths is ReadonlyPaths {
  return Array.isArray(pathOrPaths[0]);
}

/**
 * Number of doubles needed to encode a path or paths as paths.
 */
export function nativePathOrPathsSize(pathOrPaths: ReadonlyPath | ReadonlyPaths): number {
  return isPaths(pathOrPaths) ? nativePathsSize(pathOrPaths) : 1 + nativePathSize(pathOrPaths);
}

/**
 * Moves data between JS and the native module.
 *
 * Inputs are written straight into a scratch buffer inside the wasm heap, and outputs are read straight from a buffer
 * owned by the native side. Both are reused between calls, so no allocations are needed per call, unless they would
 * need to be bigger than maxRetainedCapacity, in which case they are released after the call.
 */
export class NativeBridge {
  private inputPtr = 0;
  private inputCapacity = 0; // in doubles

  private heap!: Float64Array;
  private pos = 0; // index into heap of the next double to read or write
  private outputStart = 0; // index into heap of the output being read

  constructor(readonly lib: NativeClipperLibInstance) {}

  /**
   * Prepares the input buffer to write the given number of doubles, returning its pointer.
   */
  beginInput(size: number): number {
    if (size > this.inputCapacity) {
      // double the capacity to avoid reallocating often, but do not go over the retained limit
      // unless needed, so a buffer only goes over it when it is going to be released
      const capacity = Math.max(
        size,
        Math.min(this.inputCapacity * 2, maxRetainedCapacity),
        minInputCapacity
      );
      if (this.inputPtr !== 0) {
        this.lib._free(this.inputPtr);
        this.inputPtr = 0;
        this.inputCapacity = 0;
      }
      const ptr = this.lib._malloc(capacity * Float64Array.BYTES_PER_ELEMENT);
      if (ptr === 0) {
        throw new ClipperError("could not allocate native memory");
      }
      this.inputPtr = ptr;
      this.inputCapacity = capacity;
    }
    // the heap view must be fetched after any allocation, since memory might have grown
    this.heap = this.lib.HEAPF64;
    this.pos = this.inputPtr / Float64Array.BYTES_PER_ELEMENT;
    return this.inputPtr;
  }

  writeNumber(value: number): void {
    this.heap[this.pos++] = value;
  }

  writePath(path: ReadonlyPath): void {
    const heap = this.heap;
    let pos = this.pos;
    const len = path.length;
    heap[pos++] = len;
    for (let i = 0; i < len; i++) {
      const point = path[i];
      heap[pos++] = point.x;
      heap[pos++] = point.y;
    }
    this.pos = pos;
  }

  writePaths(paths: ReadonlyPaths): void {
    const len = paths.length;
    this.writeNumber(len);
    for (let i = 0; i < len; i++) {
      this.writePath(paths[i]);
    }
  }

  /**
   * Writes a path or paths, encoding a single path as paths with one path.
   */
  writePathOrPaths(pathOrPaths: ReadonlyPath | ReadonlyPaths): void {
    if (isPaths(pathOrPaths)) {
      this.writePaths(pathOrPaths);
    } else {
      this.writeNumber(1);
      this.writePath(pathOrPaths);
    }
  }

  /**
   * Starts reading an output returned by the native module, returning false if the call failed.
   */
  beginOutput(ptr: number): boolean {
    // the input has already been consumed by the native call
    this.releaseInputIfBig();

    if (ptr === 0) {
      return false;
    }
    // the heap view must be fetched after the native call, since memory might have grown
    this.heap = this.lib.HEAPF64;
    this.pos = this.outputStart = ptr / Float64Array.BYTES_PER_ELEMENT;
    return true;
  }

  /**
   * Finishes reading an output, releasing the native output buffer if it was big.
   */
  endOutput(): void {
    if (this.pos - this.outputStart > maxRetainedCapacity) {
      this.lib._releaseOutput();
    }
  }

  private releaseInputIfBig(): void {
    if (this.inputCapacity > maxRetainedCapacity) {
      this.lib._free(this.inputPtr);
      this.inputPtr = 0;
      this.inputCapacity = 0;
    }
  }

  readNumber(): number {
    return this.heap[this.pos++];
  }

  readPath(): Path {
    const heap = this.heap;
    let pos = this.pos;
    const len = heap[pos++];
    const path: Path = new Array(len);
    for (let i = 0; i < len; i++) {
      path[i] = { x: heap[pos++], y: heap[pos++] };
    }
    this.pos = pos;
    return path;
  }

  readPaths(): Paths {
    const len = this.readNumber();
    const paths: Paths = new Array(len);
    for (let i = 0; i < len; i++) {
      paths[i] = this.readPath();
    }
    return paths;
  }

  /**
   * Error code of the last failed native call.
   */
  get errorCode(): NativeErrorCode {
    return this.lib._getErrorCode();
  }

  /**
   * Error message of the last failed native call (only set for exceptions).
   */
  get errorMessage(): string {
    const heap = this.lib.HEAPU8;
    let ptr = this.lib._getErrorMessage();
    let message = "";
    while (heap[ptr] !== 0) {
      message += String.fromCharCode(heap[ptr++]);
    }
    return message;
  }

  /**
   * Reads the output paths of a native call, or throws if the call failed.
   */
  readPathsOrThrow(ptr: number): Paths {
    if (!this.beginOutput(ptr)) {
      throw this.lastError();
    }
    const paths = this.readPaths();
    this.endOutput();
    return paths;
  }

  /**
   * Error for the last failed native call.
   */
  lastError(): ClipperError {
    switch (this.errorCode) {
      case NativeErrorCode.InvalidPath:
        return new ClipperError("invalid path");
      case NativeErrorCode.InvalidPaths:
        return new ClipperError("invalid paths");
      case NativeErrorCode.ExecuteFailed:
        return new ClipperError("error while performing clipping task");
      default:
        return new ClipperError(this.errorMessage || "unknown native error");
    }
  }
}
