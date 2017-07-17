#### clipToPaths(params: [ClipParams](./ClipParams.md)): [Paths](../shared/Paths.md) | undefined
#### clipToPolyTree(params: [ClipParams](./ClipParams.md)): [PolyTree](../shared/PolyTree.md) | undefined

Performs a polygon clipping (boolean) operation, returning the resulting Paths / PolyTree or throwing an error if failed.

The solution parameter in this case is a Paths or PolyTree structure. The Paths structure is simpler than the PolyTree structure. Because of this it is
quicker to populate and hence clipping performance is a little better (it's roughly 10% faster). However, the PolyTree data structure provides more
information about the returned paths which may be important to users. Firstly, the PolyTree structure preserves nested parent-child polygon relationships
(ie outer polygons owning/containing holes and holes owning/containing other outer polygons etc). Also, only the PolyTree structure can differentiate
between open and closed paths since each PolyNode has an IsOpen property. (The Path structure has no member indicating whether it's open or closed.)
For this reason, when open paths are passed to a Clipper object, the user must use a PolyTree object as the solution parameter, otherwise an exception
will be raised.

When a PolyTree object is used in a clipping operation on open paths, two ancilliary functions have been provided to quickly separate out open and
closed paths from the solution - OpenPathsFromPolyTree and ClosedPathsFromPolyTree. PolyTreeToPaths is also available to convert path data to a Paths
structure (irrespective of whether they're open or closed).

There are several things to note about the solution paths returned:
- they aren't in any specific order
- they should never overlap or be self-intersecting (but see notes on rounding)
- holes will be oriented opposite outer polygons
- the solution fill type can be considered either EvenOdd or NonZero since it will comply with either filling rule
- polygons may rarely share a common edge (though this is now very rare as of version 6)

![image](https://user-images.githubusercontent.com/6306796/28289968-efa9dfac-6b44-11e7-85b4-826a29c6015f.png)
