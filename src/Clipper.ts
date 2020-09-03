import { ClipType, PolyFillType, PolyType } from "./enums";
import { IntRect } from "./IntRect";
import { NativeClipper } from "./native/NativeClipper";
import { NativeClipperLibInstance } from "./native/NativeClipperLibInstance";
import {
  clipTypeToNative,
  polyFillTypeToNative,
  polyTypeToNative
} from "./native/nativeEnumConversion";
import { nativePathsToPaths, pathsToNativePaths } from "./native/PathsToNativePaths";
import { pathToNativePath } from "./native/PathToNativePath";
import { Path, ReadonlyPath } from "./Path";
import { Paths, ReadonlyPaths } from "./Paths";
import { PolyTree } from "./PolyTree";
import { nativeFinalizationRegistry } from "./nativeFinalizationRegistry";

export interface ClipperInitOptions {
  /**
   * When this property is set to true, polygons returned in the solution parameter of the execute() method will have orientations opposite to their normal
   * orientations.
   */
  reverseSolution?: boolean;

  /**
   * When this property is set to true, polygons returned in the solution parameter of the execute() method will have orientations opposite to their normal
   * orientations.
   */
  strictlySimple?: boolean;

  /**
   * By default, when three or more vertices are collinear in input polygons (subject or clip), the Clipper object removes the 'inner' vertices before
   * clipping. When enabled the preserveCollinear property prevents this default behavior to allow these inner vertices to appear in the solution.
   */
  preserveCollinear?: boolean;
}

export class Clipper {
  private _clipper?: NativeClipper;

  /**
   * By default, when three or more vertices are collinear in input polygons (subject or clip), the Clipper object removes the 'inner' vertices before
   * clipping. When enabled the preserveCollinear property prevents this default behavior to allow these inner vertices to appear in the solution.
   *
   * @return {boolean} - true if set, false otherwise
   */
  get preserveCollinear(): boolean {
    return this._clipper!.preserveCollinear;
  }

  /**
   * By default, when three or more vertices are collinear in input polygons (subject or clip), the Clipper object removes the 'inner' vertices before
   * clipping. When enabled the preserveCollinear property prevents this default behavior to allow these inner vertices to appear in the solution.
   *
   * @param value - value to set
   */
  set preserveCollinear(value: boolean) {
    this._clipper!.preserveCollinear = value;
  }

  /**
   * When this property is set to true, polygons returned in the solution parameter of the execute() method will have orientations opposite to their normal
   * orientations.
   *
   * @return {boolean} - true if set, false otherwise
   */
  get reverseSolution(): boolean {
    return this._clipper!.reverseSolution;
  }

  /**
   * When this property is set to true, polygons returned in the solution parameter of the execute() method will have orientations opposite to their normal
   * orientations.
   *
   * @param value - value to set
   */
  set reverseSolution(value: boolean) {
    this._clipper!.reverseSolution = value;
  }

  /**
   * Terminology:
   * - A simple polygon is one that does not self-intersect.
   * - A weakly simple polygon is a simple polygon that contains 'touching' vertices, or 'touching' edges.
   * - A strictly simple polygon is a simple polygon that does not contain 'touching' vertices, or 'touching' edges.
   *
   * Vertices 'touch' if they share the same coordinates (and are not adjacent). An edge touches another if one of its end vertices touches another edge
   * excluding its adjacent edges, or if they are co-linear and overlapping (including adjacent edges).
   *
   * Polygons returned by clipping operations (see Clipper.execute()) should always be simple polygons. When the StrictlySimply property is enabled,
   * polygons returned will be strictly simple, otherwise they may be weakly simple. It's computationally expensive ensuring polygons are strictly simple
   * and so this property is disabled by default.
   *
   * Note: There's currently no guarantee that polygons will be strictly simple since 'simplifying' is still a work in progress.
   *
   * @return {boolean} - true if set, false otherwise
   */
  get strictlySimple(): boolean {
    return this._clipper!.strictlySimple;
  }

  /**
   * Terminology:
   * - A simple polygon is one that does not self-intersect.
   * - A weakly simple polygon is a simple polygon that contains 'touching' vertices, or 'touching' edges.
   * - A strictly simple polygon is a simple polygon that does not contain 'touching' vertices, or 'touching' edges.
   *
   * Vertices 'touch' if they share the same coordinates (and are not adjacent). An edge touches another if one of its end vertices touches another edge
   * excluding its adjacent edges, or if they are co-linear and overlapping (including adjacent edges).
   *
   * Polygons returned by clipping operations (see Clipper.execute()) should always be simple polygons. When the StrictlySimply property is enabled,
   * polygons returned will be strictly simple, otherwise they may be weakly simple. It's computationally expensive ensuring polygons are strictly simple
   * and so this property is disabled by default.
   *
   * Note: There's currently no guarantee that polygons will be strictly simple since 'simplifying' is still a work in progress.
   *
   * @param value - value to set
   */
  set strictlySimple(value: boolean) {
    this._clipper!.strictlySimple = value;
  }

  /**
   * The Clipper constructor creates an instance of the Clipper class. One or more InitOptions may be passed as a parameter to set the corresponding properties.
   * (These properties can still be set or reset after construction.)
   *
   * @param _nativeLib
   * @param initOptions
   */
  constructor(
    private readonly _nativeLib: NativeClipperLibInstance,
    initOptions: ClipperInitOptions = {}
  ) {
    const realInitOptions = {
      reverseSolutions: false,
      strictlySimple: false,
      preserveCollinear: false,
      ...initOptions
    };

    let nativeInitOptions = 0;
    if (realInitOptions.reverseSolutions) {
      nativeInitOptions += _nativeLib.InitOptions.ReverseSolution.value;
    }
    if (realInitOptions.strictlySimple) {
      nativeInitOptions += _nativeLib.InitOptions.StrictlySimple.value;
    }
    if (realInitOptions.preserveCollinear) {
      nativeInitOptions += _nativeLib.InitOptions.PreserveCollinear.value;
    }

    this._clipper = new _nativeLib.Clipper(nativeInitOptions);
    nativeFinalizationRegistry?.register(this, this._clipper, this);
  }

  /**
   * Any number of subject and clip paths can be added to a clipping task, either individually via the addPath() method, or as groups via the addPaths()
   * method, or even using both methods.
   *
   * 'Subject' paths may be either open (lines) or closed (polygons) or even a mixture of both, but 'clipping' paths must always be closed. Clipper allows
   * polygons to clip both lines and other polygons, but doesn't allow lines to clip either lines or polygons.
   *
   * With closed paths, orientation should conform with the filling rule that will be passed via Clipper's execute method.
   *
   * Path Coordinate range:
   * Path coordinates must be between ± 9007199254740991, otherwise a range error will be thrown when attempting to add the path to the Clipper object.
   * If coordinates can be kept between ± 0x3FFFFFFF (± 1.0e+9), a modest increase in performance (approx. 15-20%) over the larger range can be achieved by
   * avoiding large integer math.
   *
   * Return Value:
   * The function will return false if the path is invalid for clipping. A path is invalid for clipping when:
   * - it has less than 2 vertices
   * - it has 2 vertices but is not an open path
   * - the vertices are all co-linear and it is not an open path
   *
   * @param path - Path to add
   * @param polyType - Polygon type
   * @param closed - If the path is closed
   */
  addPath(path: ReadonlyPath, polyType: PolyType, closed: boolean): boolean {
    const nativePath = pathToNativePath(this._nativeLib, path);
    try {
      return this._clipper!.addPath(
        nativePath,
        polyTypeToNative(this._nativeLib, polyType),
        closed
      );
    } finally {
      nativePath.delete();
    }
  }

  /**
   * Any number of subject and clip paths can be added to a clipping task, either individually via the addPath() method, or as groups via the addPaths()
   * method, or even using both methods.
   *
   * 'Subject' paths may be either open (lines) or closed (polygons) or even a mixture of both, but 'clipping' paths must always be closed. Clipper allows
   * polygons to clip both lines and other polygons, but doesn't allow lines to clip either lines or polygons.
   *
   * With closed paths, orientation should conform with the filling rule that will be passed via Clipper's execute method.
   *
   * Path Coordinate range:
   * Path coordinates must be between ± 9007199254740991, otherwise a range error will be thrown when attempting to add the path to the Clipper object.
   * If coordinates can be kept between ± 0x3FFFFFFF (± 1.0e+9), a modest increase in performance (approx. 15-20%) over the larger range can be achieved
   * by avoiding large integer math.
   *
   * Return Value:
   * The function will return false if the path is invalid for clipping. A path is invalid for clipping when:
   * - it has less than 2 vertices
   * - it has 2 vertices but is not an open path
   * - the vertices are all co-linear and it is not an open path
   *
   * @param paths - Paths to add
   * @param polyType - Paths polygon type
   * @param closed - If all the inner paths are closed
   */
  addPaths(paths: ReadonlyPaths, polyType: PolyType, closed: boolean): boolean {
    const nativePaths = pathsToNativePaths(this._nativeLib, paths);
    try {
      return this._clipper!.addPaths(
        nativePaths,
        polyTypeToNative(this._nativeLib, polyType),
        closed
      );
    } finally {
      nativePaths.delete();
    }
  }

  /**
   * The Clear method removes any existing subject and clip polygons allowing the Clipper object to be reused for clipping operations on different polygon sets.
   */
  clear(): void {
    this._clipper!.clear();
  }

  /**
   * This method returns the axis-aligned bounding rectangle of all polygons that have been added to the Clipper object.
   *
   * @return {{left: number, right: number, top: number, bottom: number}} - Bounds
   */
  getBounds(): IntRect {
    const nativeBounds = this._clipper!.getBounds();
    const rect = {
      left: nativeBounds.left,
      right: nativeBounds.right,
      top: nativeBounds.top,
      bottom: nativeBounds.bottom
    };
    nativeBounds.delete();
    return rect;
  }

  /**
   * Once subject and clip paths have been assigned (via addPath and/or addPaths), execute can then perform the clipping operation (intersection, union,
   * difference or XOR) specified by the clipType parameter.
   *
   * The solution parameter in this case is a Paths or PolyTree structure. The Paths structure is simpler than the PolyTree structure. Because of this it is
   * quicker to populate and hence clipping performance is a little better (it's roughly 10% faster). However, the PolyTree data structure provides more
   * information about the returned paths which may be important to users. Firstly, the PolyTree structure preserves nested parent-child polygon relationships
   * (ie outer polygons owning/containing holes and holes owning/containing other outer polygons etc). Also, only the PolyTree structure can differentiate
   * between open and closed paths since each PolyNode has an IsOpen property. (The Path structure has no member indicating whether it's open or closed.)
   * For this reason, when open paths are passed to a Clipper object, the user must use a PolyTree object as the solution parameter, otherwise an exception
   * will be raised.
   *
   * When a PolyTree object is used in a clipping operation on open paths, two ancilliary functions have been provided to quickly separate out open and
   * closed paths from the solution - OpenPathsFromPolyTree and ClosedPathsFromPolyTree. PolyTreeToPaths is also available to convert path data to a Paths
   * structure (irrespective of whether they're open or closed).
   *
   * There are several things to note about the solution paths returned:
   * - they aren't in any specific order
   * - they should never overlap or be self-intersecting (but see notes on rounding)
   * - holes will be oriented opposite outer polygons
   * - the solution fill type can be considered either EvenOdd or NonZero since it will comply with either filling rule
   * - polygons may rarely share a common edge (though this is now very rare as of version 6)
   *
   * The subjFillType and clipFillType parameters define the polygon fill rule to be applied to the polygons (ie closed paths) in the subject and clip
   * paths respectively. (It's usual though obviously not essential that both sets of polygons use the same fill rule.)
   *
   * execute can be called multiple times without reassigning subject and clip polygons (ie when different clipping operations are required on the
   * same polygon sets).
   *
   * @param clipType - Clip operation type
   * @param subjFillType - Fill type of the subject polygons
   * @param clipFillType - Fill type of the clip polygons
   * @param cleanDistance - Clean distance over the output, or undefined for no cleaning.
   * @return {Paths | undefined} - The solution or undefined if there was an error
   */
  executeToPaths(
    clipType: ClipType,
    subjFillType: PolyFillType,
    clipFillType: PolyFillType,
    cleanDistance: number | undefined
  ): Paths | undefined {
    const outNativePaths = new this._nativeLib.Paths();
    try {
      const success = this._clipper!.executePathsWithFillTypes(
        clipTypeToNative(this._nativeLib, clipType),
        outNativePaths,
        polyFillTypeToNative(this._nativeLib, subjFillType),
        polyFillTypeToNative(this._nativeLib, clipFillType)
      );
      if (!success) {
        return undefined;
      } else {
        if (cleanDistance !== undefined) {
          this._nativeLib.cleanPolygons(outNativePaths, cleanDistance);
        }
        return nativePathsToPaths(this._nativeLib, outNativePaths, true); // frees outNativePaths
      }
    } finally {
      if (!outNativePaths.isDeleted()) {
        outNativePaths.delete();
      }
    }
  }

  /**
   * Once subject and clip paths have been assigned (via addPath and/or addPaths), execute can then perform the clipping operation (intersection, union,
   * difference or XOR) specified by the clipType parameter.
   *
   * The solution parameter can be either a Paths or PolyTree structure. The Paths structure is simpler than the PolyTree structure. Because of this it is
   * quicker to populate and hence clipping performance is a little better (it's roughly 10% faster). However, the PolyTree data structure provides more
   * information about the returned paths which may be important to users. Firstly, the PolyTree structure preserves nested parent-child polygon relationships
   * (ie outer polygons owning/containing holes and holes owning/containing other outer polygons etc). Also, only the PolyTree structure can differentiate
   * between open and closed paths since each PolyNode has an IsOpen property. (The Path structure has no member indicating whether it's open or closed.)
   * For this reason, when open paths are passed to a Clipper object, the user must use a PolyTree object as the solution parameter, otherwise an exception
   * will be raised.
   *
   * When a PolyTree object is used in a clipping operation on open paths, two ancilliary functions have been provided to quickly separate out open and
   * closed paths from the solution - OpenPathsFromPolyTree and ClosedPathsFromPolyTree. PolyTreeToPaths is also available to convert path data to a Paths
   * structure (irrespective of whether they're open or closed).
   *
   * There are several things to note about the solution paths returned:
   * - they aren't in any specific order
   * - they should never overlap or be self-intersecting (but see notes on rounding)
   * - holes will be oriented opposite outer polygons
   * - the solution fill type can be considered either EvenOdd or NonZero since it will comply with either filling rule
   * - polygons may rarely share a common edge (though this is now very rare as of version 6)
   *
   * The subjFillType and clipFillType parameters define the polygon fill rule to be applied to the polygons (ie closed paths) in the subject and clip
   * paths respectively. (It's usual though obviously not essential that both sets of polygons use the same fill rule.)
   *
   * execute can be called multiple times without reassigning subject and clip polygons (ie when different clipping operations are required on the
   * same polygon sets).
   *
   * @param clipType - Clip operation type
   * @param subjFillType - Fill type of the subject polygons
   * @param clipFillType - Fill type of the clip polygons
   * @return {PolyTree | undefined} - The solution or undefined if there was an error
   */
  executeToPolyTee(
    clipType: ClipType,
    subjFillType: PolyFillType,
    clipFillType: PolyFillType
  ): PolyTree | undefined {
    const outNativePolyTree = new this._nativeLib.PolyTree();
    try {
      const success = this._clipper!.executePolyTreeWithFillTypes(
        clipTypeToNative(this._nativeLib, clipType),
        outNativePolyTree,
        polyFillTypeToNative(this._nativeLib, subjFillType),
        polyFillTypeToNative(this._nativeLib, clipFillType)
      );
      if (!success) {
        return undefined;
      } else {
        return PolyTree.fromNativePolyTree(this._nativeLib, outNativePolyTree, true); // frees outNativePolyTree
      }
    } finally {
      if (!outNativePolyTree.isDeleted()) {
        outNativePolyTree.delete();
      }
    }
  }

  /**
   * Checks if the object has been disposed.
   *
   * @return {boolean} - true if disposed, false if not
   */
  isDisposed(): boolean {
    return this._clipper === undefined || this._clipper.isDeleted();
  }

  /**
   * Since this library uses WASM/ASM.JS internally for speed this means that you must dispose objects after you are done using them or mem leaks will occur.
   * (If the runtime supports FinalizationRegistry then this becomes non-mandatory, but still recommended).
   */
  dispose(): void {
    if (this._clipper) {
      this._clipper.delete();
      nativeFinalizationRegistry?.unregister(this);
      this._clipper = undefined;
    }
  }
}
