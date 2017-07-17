#### offsetToPaths(params: [OffsetParams](./OffsetParams.md)): [Paths](../shared/Paths.md) | undefined
#### offsetToPolyTree(params: [OffsetParams](./OffsetParams.md)): [PolyTree](../shared/PolyTree.md) | undefined

Performs a polygon offset operation, returning the resulting PolyTree or undefined if failed.

This method encapsulates the process of offsetting (inflating/deflating) both open and closed paths using a number of different join types
and end types.

###### Preconditions for offsetting

1. The orientations of closed paths must be consistent such that outer polygons share the same orientation, and any holes have the opposite orientation
(ie non-zero filling). Open paths must be oriented with closed outer polygons.
2. Polygons must not self-intersect.

###### Limitations

When offsetting, small artefacts may appear where polygons overlap. To avoid these artefacts, offset overlapping polygons separately.

![image](https://user-images.githubusercontent.com/6306796/28290136-77a0f8a0-6b45-11e7-8fdd-a5a5570b96a7.png)
