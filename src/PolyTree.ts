import { NativeClipperLibInstance } from "./native/NativeClipperLibInstance";
import { NativePolyTree } from "./native/NativePolyTree";
import { PolyNode } from "./PolyNode";

/**
 * PolyTree is intended as a read-only data structure that should only be used to receive solutions from clipping and offsetting operations. It's an
 * alternative to the Paths data structure which also receives these solutions. PolyTree's two major advantages over the Paths structure are: it properly
 * represents the parent-child relationships of the returned polygons; it differentiates between open and closed paths. However, since PolyTree is a more
 * complex structure than the Paths structure, and since it's more computationally expensive to process (the Execute method being roughly 5-10% slower), it
 * should used only be when parent-child polygon relationships are needed, or when open paths are being 'clipped'.
 *
 * A PolyTree object is a container for any number of PolyNode children, with each contained PolyNode representing a single polygon contour (either an outer
 * or hole polygon). PolyTree itself is a specialized PolyNode whose immediate children represent the top-level outer polygons of the solution. (It's own
 * Contour property is always empty.) The contained top-level PolyNodes may contain their own PolyNode children representing hole polygons that may also
 * contain children representing nested outer polygons etc. Children of outers will always be holes, and children of holes will always be outers.
 *
 * PolyTrees can also contain open paths. Open paths will always be represented by top level PolyNodes. Two functions are provided to quickly separate out
 * open and closed paths from a polytree - openPathsFromPolyTree and closedPathsFromPolyTree.
 */
export class PolyTree extends PolyNode {
  protected _total: number = 0;

  /**
   * Returns the total number of PolyNodes (polygons) contained within the PolyTree. This value is not to be confused with childs.length which returns the
   * number of immediate children only (Childs) contained by PolyTree.
   */
  get total(): number {
    return this._total;
  }

  /**
   * This method returns the first outer polygon contour if any, otherwise undefined.
   *
   * This function is equivalent to calling childs[0].
   */
  public getFirst(): PolyNode | undefined {
    if (this.childs.length > 0) {
      return this.childs[0];
    } else {
      return undefined;
    }
  }

  protected constructor() {
    super();
  }

  /**
   * Internal use.
   * Constructs a PolyTree from a native PolyTree.
   */
  static fromNativePolyTree(
    nativeLib: NativeClipperLibInstance,
    nativePolyTree: NativePolyTree,
    freeNativePolyTree: boolean
  ): PolyTree {
    const pt = new PolyTree();
    PolyNode.fillFromNativePolyNode(pt, nativeLib, nativePolyTree, undefined, 0, false); // do NOT free them, they are freed on destruction of the polytree

    pt._total = nativePolyTree.total();

    if (freeNativePolyTree) {
      nativePolyTree.delete(); // this deletes all inner paths, contours etc
    }

    return pt;
  }
}
