#### interface SubjectInput

A single subject input (of multiple possible inputs) for the clipToPaths / clipToPolyTree operations

'Subject' paths may be either open (lines) or closed (polygons) or even a mixture of both.
With closed paths, orientation should conform with the filling rule that will be passed via Clipper's execute method.

###### Properties

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

* **closed: boolean**

    If the path/paths is closed or not.
