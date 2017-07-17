#### type Paths = [Path](./Path.md)[]

This structure is fundamental to the Clipper Library. It's a list or array of one or more Path structures. (The Path structure contains an ordered list of vertices that make a single contour.)

Paths may open (a series of line segments), or they may closed (polygons). Whether or not a path is open depends on context. Closed paths may be 'outer' contours or 'hole' contours. Which they are depends on orientation.
