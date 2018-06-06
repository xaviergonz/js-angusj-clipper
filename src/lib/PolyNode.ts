import { NativeClipperLibInstance } from "./native/NativeClipperLibInstance";
import { NativePolyNode } from "./native/NativePolyNode";
import { nativePathToPath } from "./native/PathToNativePath";
import { ReadonlyPath } from "./Path";

/**
 * PolyNodes are encapsulated within a PolyTree container, and together provide a data structure representing the parent-child relationships of polygon
 * contours returned by clipping/ofsetting methods.
 *
 * A PolyNode object represents a single polygon. It's isHole property indicates whether it's an outer or a hole. PolyNodes may own any number of PolyNode
 * children (childs), where children of outer polygons are holes, and children of holes are (nested) outer polygons.
 */
export class PolyNode {
  protected _parent?: PolyNode;

  /**
   * Returns the parent PolyNode.
   *
   * The PolyTree object (which is also a PolyNode) does not have a parent and will return undefined.
   */
  get parent(): PolyNode | undefined {
    return this._parent;
  }

  protected _childs: PolyNode[] = [];
  /**
   * A read-only list of PolyNode.
   * Outer PolyNode childs contain hole PolyNodes, and hole PolyNode childs contain nested outer PolyNodes.
   */
  get childs(): PolyNode[] {
    return this._childs;
  }

  protected _contour: ReadonlyPath = [];
  /**
   * Returns a path list which contains any number of vertices.
   */
  get contour(): ReadonlyPath {
    return this._contour;
  }

  protected _isOpen: boolean = false;
  /**
   * Returns true when the PolyNode's Contour results from a clipping operation on an open contour (path). Only top-level PolyNodes can contain open contours.
   */
  get isOpen(): boolean {
    return this._isOpen;
  }

  protected _index: number = 0;
  /**
   * Index in the parent's child list, or 0 if no parent.
   */
  get index(): number {
    return this._index;
  }

  protected _isHole?: boolean;
  /**
   * Returns true when the PolyNode's polygon (Contour) is a hole.
   *
   * Children of outer polygons are always holes, and children of holes are always (nested) outer polygons.
   * The isHole property of a PolyTree object is undefined but its children are always top-level outer polygons.
   *
   * @return {boolean}
   */
  get isHole(): boolean {
    if (this._isHole === undefined) {
      let result = true;
      let node: PolyNode | undefined = this._parent;
      while (node !== undefined) {
        result = !result;
        node = node._parent;
      }
      this._isHole = result;
    }

    return this._isHole;
  }

  /**
   * The returned PolyNode will be the first child if any, otherwise the next sibling, otherwise the next sibling of the Parent etc.
   *
   * A PolyTree can be traversed very easily by calling GetFirst() followed by GetNext() in a loop until the returned object is undefined.
   *
   * @return {PolyNode | undefined}
   */
  getNext(): PolyNode | undefined {
    if (this._childs.length > 0) {
      return this._childs[0];
    } else {
      return this.getNextSiblingUp();
    }
  }

  protected getNextSiblingUp(): PolyNode | undefined {
    if (this._parent === undefined) {
      return undefined;
    } else if (this._index === this._parent._childs.length - 1) {
      //noinspection TailRecursionJS
      return this._parent.getNextSiblingUp();
    } else {
      return this._parent._childs[this._index + 1];
    }
  }

  protected constructor() {}

  protected static fillFromNativePolyNode(
    pn: PolyNode,
    nativeLib: NativeClipperLibInstance,
    nativePolyNode: NativePolyNode,
    parent: PolyNode | undefined,
    childIndex: number,
    freeNativePolyNode: boolean
  ): void {
    pn._parent = parent;

    const childs = nativePolyNode.childs;
    for (let i = 0, max = childs.size(); i < max; i++) {
      const newChild = PolyNode.fromNativePolyNode(
        nativeLib,
        childs.get(i),
        pn,
        i,
        freeNativePolyNode
      );
      pn._childs.push(newChild);
    }

    // do we need to clear the object ourselves? for now let's assume so (seems to work)
    pn._contour = nativePathToPath(nativeLib, nativePolyNode.contour, true);
    pn._isOpen = nativePolyNode.isOpen();
    pn._index = childIndex;

    if (freeNativePolyNode) {
      nativePolyNode.delete();
    }
  }

  protected static fromNativePolyNode(
    nativeLib: NativeClipperLibInstance,
    nativePolyNode: NativePolyNode,
    parent: PolyNode | undefined,
    childIndex: number,
    freeNativePolyNode: boolean
  ): PolyNode {
    const pn = new PolyNode();
    PolyNode.fillFromNativePolyNode(
      pn,
      nativeLib,
      nativePolyNode,
      parent,
      childIndex,
      freeNativePolyNode
    );
    return pn;
  }
}
