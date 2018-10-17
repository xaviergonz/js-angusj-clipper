#### interface ClipInput

A single clip input (of multiple possible inputs) for the clipToPaths / clipToPolyTree operations.

Clipping paths must always be closed. Clipper allows polygons to clip both lines and other polygons, but doesn't allow lines to clip either lines or polygons.
With closed paths, orientation should conform with the filling rule that will be passed via Clipper's execute method.

###### Required properties

* **data: [Path](../shared/Path.md) | [Paths](../shared/Paths.md)**

    Path / Paths data.
       
    Path Coordinate range:
       
    Path coordinates must be between ± 9007199254740991 (Number.MAX_SAFE_INTEGER), otherwise a range error will be thrown when attempting to add the path to the Clipper object.
    If coordinates can be kept between ± 0x3FFFFFFF (± 1.0e+9), a modest increase in performance (approx. 15-20%) over the larger range can be achieved by
    avoiding large integer math.
       
    The function operation will throw an error if the path is invalid for clipping. A path is invalid for clipping when:
    - it has less than 2 vertices
    - it has 2 vertices but is not an open path
    - the vertices are all co-linear and it is not an open path
