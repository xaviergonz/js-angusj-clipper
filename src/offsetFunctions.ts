import { ClipperError } from "./ClipperError";
import { ClipperOffset } from "./ClipperOffset";
import { EndType, JoinType } from "./enums";
import { NativeClipperLibInstance } from "./native/NativeClipperLibInstance";
import { Path, ReadonlyPath } from "./Path";
import { Paths, ReadonlyPaths } from "./Paths";
import { PolyTree } from "./PolyTree";

/**
 * A single input (of multiple possible inputs) for the offsetToPaths / offsetToPolyTree operation.
 */
export interface OffsetInput {
  /**
   * Join type.
   */
  joinType: JoinType;

  /**
   * End type.
   */
  endType: EndType;

  /**
   * Data of one of the Path or Paths to be used in preparation for offsetting.
   *
   * All 'outer' Paths must have the same orientation, and any 'hole' paths must have reverse orientation. Closed paths must have at least 3 vertices.
   * Open paths may have as few as one vertex. Open paths can only be offset with positive deltas.
   */
  data: ReadonlyPath | ReadonlyPaths;
}

/**
 * Params for the polygon offset operation.
 */
export interface OffsetParams {
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
   */
  arcTolerance?: number; // defaults to 0.25

  /**
   * This property sets the maximum distance in multiples of delta that vertices can be offset from their original positions before squaring is applied.
   * (Squaring truncates a miter by 'cutting it off' at 1 × delta distance from the original vertex.)
   *
   * The default value for MiterLimit is 2 (ie twice delta). This is also the smallest MiterLimit that's allowed. If mitering was unrestricted (ie without
   * any squaring), then offsets at very acute angles would generate unacceptably long 'spikes'.
   */
  miterLimit?: number; // defaults to 2 (twice delta)

  /**
   * Negative delta values shrink polygons and positive delta expand them.
   */
  delta: number;

  /**
   * One or more inputs to use for the offset operation.
   */
  offsetInputs: OffsetInput[];

  /**
   * If this is not undefined then cleaning of the result polygon will be performed.
   * This operation is only available when the output format is not a poly tree.
   */
  cleanDistance?: number;
}

const addPathOrPaths = (offset: ClipperOffset, inputDatas: OffsetInput[] | undefined) => {
  if (inputDatas === undefined) {
    return;
  }

  // add each input
  for (let i = 0, maxi = inputDatas.length; i < maxi; i++) {
    const inputData = inputDatas[i];

    // add the path/paths
    const pathOrPaths = inputData.data;
    if (!pathOrPaths || pathOrPaths.length <= 0) {
      continue;
    }

    // is it a path or paths?
    if (Array.isArray(pathOrPaths[0])) {
      // paths
      offset.addPaths(pathOrPaths as ReadonlyPaths, inputData.joinType, inputData.endType);
    } else {
      // path
      offset.addPath(pathOrPaths as ReadonlyPath, inputData.joinType, inputData.endType);
    }
  }
};

function offsetToPathsOrPolyTree(
  polyTreeMode: boolean,
  nativeClipperLib: NativeClipperLibInstance,
  params: OffsetParams
): Paths | PolyTree | undefined {
  const filledData = {
    arcTolerance: 0.25,
    miterLimit: 2,
    ...params
  };

  const offset = new ClipperOffset(
    nativeClipperLib,
    filledData.miterLimit,
    filledData.arcTolerance
  );

  //noinspection UnusedCatchParameterJS
  try {
    addPathOrPaths(offset, params.offsetInputs);
    if (!polyTreeMode) {
      return offset.executeToPaths(params.delta, params.cleanDistance);
    } else {
      if (params.cleanDistance !== undefined) {
        throw new ClipperError("cleaning is not available for poly tree results");
      }
      return offset.executeToPolyTree(params.delta);
    }
  } catch (err) {
    return undefined;
  } finally {
    offset.dispose();
  }
}

export function offsetToPaths(
  nativeClipperLib: NativeClipperLibInstance,
  params: OffsetParams
): Paths | undefined {
  return offsetToPathsOrPolyTree(false, nativeClipperLib, params) as Paths | undefined;
}

export function offsetToPolyTree(
  nativeClipperLib: NativeClipperLibInstance,
  params: OffsetParams
): PolyTree | undefined {
  return offsetToPathsOrPolyTree(true, nativeClipperLib, params) as PolyTree | undefined;
}
