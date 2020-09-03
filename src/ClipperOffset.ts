import { EndType, JoinType } from "./enums";
import { NativeClipperLibInstance } from "./native/NativeClipperLibInstance";
import { NativeClipperOffset } from "./native/NativeClipperOffset";
import { endTypeToNative, joinTypeToNative } from "./native/nativeEnumConversion";
import { nativePathsToPaths, pathsToNativePaths } from "./native/PathsToNativePaths";
import { pathToNativePath } from "./native/PathToNativePath";
import { ReadonlyPath } from "./Path";
import { Paths, ReadonlyPaths } from "./Paths";
import { PolyTree } from "./PolyTree";
import { nativeFinalizationRegistry } from "./nativeFinalizationRegistry";

/**
 * The ClipperOffset class encapsulates the process of offsetting (inflating/deflating) both open and closed paths using a number of different join types
 * and end types.
 *
 * Preconditions for offsetting:
 * 1. The orientations of closed paths must be consistent such that outer polygons share the same orientation, and any holes have the opposite orientation
 * (ie non-zero filling). Open paths must be oriented with closed outer polygons.
 * 2. Polygons must not self-intersect.
 *
 * Limitations:
 * When offsetting, small artefacts may appear where polygons overlap. To avoid these artefacts, offset overlapping polygons separately.
 */
export class ClipperOffset {
  private _clipperOffset?: NativeClipperOffset;

  /**
   * Firstly, this field/property is only relevant when JoinType = Round and/or EndType = Round.
   *
   * Since flattened paths can never perfectly represent arcs, this field/property specifies a maximum acceptable imprecision ('tolerance') when arcs are
   * approximated in an offsetting operation. Smaller values will increase 'smoothness' up to a point though at a cost of performance and in creating more
   * vertices to construct the arc.
   *
   * The default ArcTolerance is 0.25 units. This means that the maximum distance the flattened path will deviate from the 'true' arc will be no more
   * than 0.25 units (before rounding).
   *
   * Reducing tolerances below 0.25 will not improve smoothness since vertex coordinates will still be rounded to integer values. The only way to achieve
   * sub-integer precision is through coordinate scaling before and after offsetting (see example below).
   *
   * It's important to make ArcTolerance a sensible fraction of the offset delta (arc radius). Large tolerances relative to the offset delta will produce
   * poor arc approximations but, just as importantly, very small tolerances will substantially slow offsetting performance while providing unnecessary
   * degrees of precision. This is most likely to be an issue when offsetting polygons whose coordinates have been scaled to preserve floating point precision.
   *
   * Example: Imagine a set of polygons (defined in floating point coordinates) that is to be offset by 10 units using round joins, and the solution is to
   * retain floating point precision up to at least 6 decimal places.
   * To preserve this degree of floating point precision, and given that Clipper and ClipperOffset both operate on integer coordinates, the polygon
   * coordinates will be scaled up by 108 (and rounded to integers) prior to offsetting. Both offset delta and ArcTolerance will also need to be scaled
   * by this same factor. If ArcTolerance was left unscaled at the default 0.25 units, every arc in the solution would contain a fraction of 44 THOUSAND
   * vertices while the final arc imprecision would be 0.25 × 10-8 units (ie once scaling was reversed). However, if 0.1 units was an acceptable imprecision
   * in the final unscaled solution, then ArcTolerance should be set to 0.1 × scaling_factor (0.1 × 108 ). Now if scaling is applied equally to both
   * ArcTolerance and to Delta Offset, then in this example the number of vertices (steps) defining each arc would be a fraction of 23.
   *
   * The formula for the number of steps in a full circular arc is ... Pi / acos(1 - arc_tolerance / abs(delta))
   *
   * @return {number} - Current arc tolerance
   */
  get arcTolerance(): number {
    return this._clipperOffset!.arcTolerance;
  }

  /**
   * Firstly, this field/property is only relevant when JoinType = Round and/or EndType = Round.
   *
   * Since flattened paths can never perfectly represent arcs, this field/property specifies a maximum acceptable imprecision ('tolerance') when arcs are
   * approximated in an offsetting operation. Smaller values will increase 'smoothness' up to a point though at a cost of performance and in creating more
   * vertices to construct the arc.
   *
   * The default ArcTolerance is 0.25 units. This means that the maximum distance the flattened path will deviate from the 'true' arc will be no more
   * than 0.25 units (before rounding).
   *
   * Reducing tolerances below 0.25 will not improve smoothness since vertex coordinates will still be rounded to integer values. The only way to achieve
   * sub-integer precision is through coordinate scaling before and after offsetting (see example below).
   *
   * It's important to make ArcTolerance a sensible fraction of the offset delta (arc radius). Large tolerances relative to the offset delta will produce
   * poor arc approximations but, just as importantly, very small tolerances will substantially slow offsetting performance while providing unnecessary
   * degrees of precision. This is most likely to be an issue when offsetting polygons whose coordinates have been scaled to preserve floating point precision.
   *
   * Example: Imagine a set of polygons (defined in floating point coordinates) that is to be offset by 10 units using round joins, and the solution is to
   * retain floating point precision up to at least 6 decimal places.
   * To preserve this degree of floating point precision, and given that Clipper and ClipperOffset both operate on integer coordinates, the polygon
   * coordinates will be scaled up by 108 (and rounded to integers) prior to offsetting. Both offset delta and ArcTolerance will also need to be scaled
   * by this same factor. If ArcTolerance was left unscaled at the default 0.25 units, every arc in the solution would contain a fraction of 44 THOUSAND
   * vertices while the final arc imprecision would be 0.25 × 10-8 units (ie once scaling was reversed). However, if 0.1 units was an acceptable imprecision
   * in the final unscaled solution, then ArcTolerance should be set to 0.1 × scaling_factor (0.1 × 108 ). Now if scaling is applied equally to both
   * ArcTolerance and to Delta Offset, then in this example the number of vertices (steps) defining each arc would be a fraction of 23.
   *
   * The formula for the number of steps in a full circular arc is ... Pi / acos(1 - arc_tolerance / abs(delta))
   *
   * @param value - Arc tolerance to set.
   */
  set arcTolerance(value: number) {
    this._clipperOffset!.arcTolerance = value;
  }

  /**
   * This property sets the maximum distance in multiples of delta that vertices can be offset from their original positions before squaring is applied.
   * (Squaring truncates a miter by 'cutting it off' at 1 × delta distance from the original vertex.)
   *
   * The default value for MiterLimit is 2 (ie twice delta). This is also the smallest MiterLimit that's allowed. If mitering was unrestricted (ie without
   * any squaring), then offsets at very acute angles would generate unacceptably long 'spikes'.
   *
   * @return {number} - Current miter limit
   */
  get miterLimit(): number {
    return this._clipperOffset!.miterLimit;
  }

  /**
   * Sets the current miter limit (see getter docs for more info).
   *
   * @param value - Mit limit to set.
   */
  set miterLimit(value: number) {
    this._clipperOffset!.miterLimit = value;
  }

  /**
   * The ClipperOffset constructor takes 2 optional parameters: MiterLimit and ArcTolerance. The two parameters corresponds to properties of the same name.
   * MiterLimit is only relevant when JoinType is Miter, and ArcTolerance is only relevant when JoinType is Round or when EndType is OpenRound.
   *
   * @param _nativeLib - Native clipper lib instance to use
   * @param miterLimit - Miter limit
   * @param arcTolerance - ArcTolerance (round precision)
   */
  constructor(
    private readonly _nativeLib: NativeClipperLibInstance,
    miterLimit = 2,
    arcTolerance = 0.25
  ) {
    this._clipperOffset = new _nativeLib.ClipperOffset(miterLimit, arcTolerance);
    nativeFinalizationRegistry?.register(this, this._clipperOffset, this);
  }

  /**
   * Adds a Path to a ClipperOffset object in preparation for offsetting.
   *
   * Any number of paths can be added, and each has its own JoinType and EndType. All 'outer' Paths must have the same orientation, and any 'hole' paths must
   * have reverse orientation. Closed paths must have at least 3 vertices. Open paths may have as few as one vertex. Open paths can only be offset
   * with positive deltas.
   *
   * @param path - Path to add
   * @param joinType - Join type
   * @param endType - End type
   */
  addPath(path: ReadonlyPath, joinType: JoinType, endType: EndType) {
    const nativePath = pathToNativePath(this._nativeLib, path);
    try {
      this._clipperOffset!.addPath(
        nativePath,
        joinTypeToNative(this._nativeLib, joinType),
        endTypeToNative(this._nativeLib, endType)
      );
    } finally {
      nativePath.delete();
    }
  }

  /**
   * Adds Paths to a ClipperOffset object in preparation for offsetting.
   *
   * Any number of paths can be added, and each path has its own JoinType and EndType. All 'outer' Paths must have the same orientation, and any 'hole'
   * paths must have reverse orientation. Closed paths must have at least 3 vertices. Open paths may have as few as one vertex. Open paths can only be
   * offset with positive deltas.
   *
   * @param paths - Paths to add
   * @param joinType - Join type
   * @param endType - End type
   */
  addPaths(paths: ReadonlyPaths, joinType: JoinType, endType: EndType) {
    const nativePaths = pathsToNativePaths(this._nativeLib, paths);
    try {
      this._clipperOffset!.addPaths(
        nativePaths,
        joinTypeToNative(this._nativeLib, joinType),
        endTypeToNative(this._nativeLib, endType)
      );
    } finally {
      nativePaths.delete();
    }
  }

  /**
   * Negative delta values shrink polygons and positive delta expand them.
   *
   * This method can be called multiple times, offsetting the same paths by different amounts (ie using different deltas).
   *
   * @param delta - Delta
   * @param cleanDistance - Clean distance over the output, or undefined for no cleaning.
   * @return {Paths} - Solution paths
   */
  executeToPaths(delta: number, cleanDistance: number | undefined): Paths {
    const outNativePaths = new this._nativeLib.Paths();
    try {
      this._clipperOffset!.executePaths(outNativePaths, delta);
      if (cleanDistance !== undefined) {
        this._nativeLib.cleanPolygons(outNativePaths, cleanDistance);
      }
      return nativePathsToPaths(this._nativeLib, outNativePaths, true); // frees outNativePaths
    } finally {
      if (!outNativePaths.isDeleted()) {
        outNativePaths.delete();
      }
    }
  }

  /**
   * This method takes two parameters. The first is the structure that receives the result of the offset operation (a PolyTree structure). The second parameter
   * is the amount to which the supplied paths will be offset. Negative delta values shrink polygons and positive delta expand them.
   *
   * This method can be called multiple times, offsetting the same paths by different amounts (ie using different deltas).
   *
   * @param delta - Delta
   * @return {Paths} - Solution paths
   */
  executeToPolyTree(delta: number): PolyTree {
    const outNativePolyTree = new this._nativeLib.PolyTree();
    try {
      this._clipperOffset!.executePolyTree(outNativePolyTree, delta);
      return PolyTree.fromNativePolyTree(this._nativeLib, outNativePolyTree, true); // frees outNativePolyTree
    } finally {
      if (!outNativePolyTree.isDeleted()) {
        outNativePolyTree.delete();
      }
    }
  }

  /**
   * This method clears all paths from the ClipperOffset object, allowing new paths to be assigned.
   */
  clear(): void {
    this._clipperOffset!.clear();
  }

  /**
   * Checks if the object has been disposed.
   *
   * @return {boolean} - true if disposed, false if not
   */
  isDisposed(): boolean {
    return this._clipperOffset === undefined || this._clipperOffset.isDeleted();
  }

  /**
   * Since this library uses WASM/ASM.JS internally for speed this means that you must dispose objects after you are done using them or mem leaks will occur.
   * (If the runtime supports FinalizationRegistry then this becomes non-mandatory, but still recommended).
   */
  dispose(): void {
    if (this._clipperOffset) {
      this._clipperOffset.delete();
      nativeFinalizationRegistry?.unregister(this);
      this._clipperOffset = undefined;
    }
  }
}
