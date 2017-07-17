#### class PolyTree
_extends [PolyNode](./PolyNode.md)_

PolyTree is intended as a read-only data structure that should only be used to receive solutions from clipping and offsetting operations. It's an
alternative to the Paths data structure which also receives these solutions. PolyTree's two major advantages over the Paths structure are: it properly
represents the parent-child relationships of the returned polygons; it differentiates between open and closed paths. However, since PolyTree is a more
complex structure than the Paths structure, and since it's more computationally expensive to process (the Execute method being roughly 5-10% slower), it
should used only be when parent-child polygon relationships are needed, or when open paths are being 'clipped'.

A PolyTree object is a container for any number of PolyNode children, with each contained PolyNode representing a single polygon contour (either an outer
or hole polygon). PolyTree itself is a specialized PolyNode whose immediate children represent the top-level outer polygons of the solution. (It's own
Contour property is always empty.) The contained top-level PolyNodes may contain their own PolyNode children representing hole polygons that may also
contain children representing nested outer polygons etc. Children of outers will always be holes, and children of holes will always be outers.

PolyTrees can also contain open paths. Open paths will always be represented by top level PolyNodes. Two functions are provided to quickly separate out
open and closed paths from a polytree - openPathsFromPolyTree and closedPathsFromPolyTree.

![polytree](https://user-images.githubusercontent.com/6306796/28290312-41613a88-6b46-11e7-8098-e6f1585af71f.png)

###### Properties

* **get total(): number**

    Returns the total number of PolyNodes (polygons) contained within the PolyTree. This value is not to be confused with childs.length which returns the
    number of immediate children only (Childs) contained by PolyTree.

* **getFirst(): [PolyNode](./PolyNode.md) | undefined**

    This method returns the first outer polygon contour if any, otherwise undefined.
    
    This function is equivalent to calling childs[0].

**Plus all properties from [PolyNode](./PolyNode.md)**
