#### type Path = [IntPoint](./IntPoint.md)[]

This structure contains a sequence of IntPoint vertices defining a single contour (see also terminology). Paths may be open and represent a series of line segments bounded by 2 or more vertices, or they may be closed and represent polygons. Whether or not a path is open depends on context. Closed paths may be 'outer' contours or 'hole' contours. Which they are depends on orientation.

Multiple paths can be grouped into a Paths structure.
