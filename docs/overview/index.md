### Overview

The Clipper Library performs clipping, and offsetting of both lines and polygons.

A number of features set Clipper apart from other clipping libraries:

- it accepts all types of polygons including self-intersecting ones
- it supports multiple polygon filling rules (EvenOdd, NonZero, Positive, Negative)
- it's very fast relative to other libraries
- it's numerically robust
- it also performs line and polygon offsetting
- it's free to use in both freeware and commercial applications

#### Terminology

- **Clipping:** commonly refers to the process of cutting away from a set of 2-dimensional geometric shapes those parts that are outside a rectangular 'clipping' window. This can be achieved by intersecting subject paths (lines and polygons) with a clipping rectangle. In a more general sense, the clipping window need not be rectangular but can be any type of polygon, even multiple polygons. Also, while clipping typically refers to an intersection operation, in this documentation it will refer to any one of the four boolean operations (intersection, union, difference and exclusive-or).
- **Path:** is an ordered sequence of vertices defining a single geometric contour that's either a line (an open path) or a polygon (a closed path).
- **Line:** or polyline is an open path containing 2 or more vertices.
- **Polygon:** commonly refers to a two-dimensional region bounded by an outer non-intersecting closed contour. That region may also contain a number of 'holes'. In this documentation however, polygon will simply refer to a closed path.
- **Contour:** synonymous with path.
- **Hole:** is a closed region within a polygon that's not part of the polygon. A 'hole polygon' is a closed path that forms the outer boundaries of a hole.
- **Polygon Filling Rule:** the filling rule, together with a list of closed paths, defines those regions (bounded by paths) that are inside (ie regions 'brush filled' in a graphical display) and those which are outside (ie 'holes').

#### Rounding

By using an integer type for polygon coordinates, the Clipper Library has been able to avoid problems of numerical robustness that can cause havoc with geometric computations. Problems associated with integer rounding and their possible solutions are discussed below.

![image](https://user-images.githubusercontent.com/6306796/28289644-b46044f0-6b43-11e7-84f6-90c6b22a5bfe.png)

It's important to stress at the outset that rounding causes vertices to move fractions of a unit away from their 'true' positions. Nevertheless, the resulting imprecision can be very effectively managed by appropriate scaling.

The Clipper Library supports scaling to very high degrees of precision by accepting integer coordinate values in the range ±9007199254740991 (Number.MAX_SAFE_INTEGER).

Another complication of using a discrete numbers (as opposed to real numbers) is that very occasionally tiny self-intersection artefacts arise. In the unscaled image on the left (where one unit equals one pixel), the area of intersection of two polygons has been highlighted in bright green.

![image](https://user-images.githubusercontent.com/6306796/28289657-c2ba74d0-6b43-11e7-83cf-47ab4b82de3a.png)

A 30X 'close up' of the lower points of intersection of these same two polygons shows the presence of a tiny self-intersecting artefact. The three 'black dots' highlight the actual points of intersection (with their fractional coordinates displayed). The 'red dots' show where these points of intersection are located once rounding is applied. With a little care you can see that rounding reverses the orientation of these vertices and causes a tiny self-intersecting artefact.

Although these tiny self-intersections are uncommon, if it's deemed necessary, they are best removed with CleanPolygons. (Setting Clipper's StrictlySimple property to true would also address this self-intersection but the tiny (sub-unit) polygon 'artefact' with incorrect orientation would still appear in the solution.)

![image](https://user-images.githubusercontent.com/6306796/28289665-ca9deb64-6b43-11e7-823b-1bc02c3d5a58.png)

In this final example, the single polygon above also has a tiny self-intersection. However, the clipping algorithm sees this vertex (88,50) as simply 'touching' rather than intersecting the right edge of the polygon (though only by a fraction of a unit). Since this intersection won't normally be detected, the clipping solution (eg following a union operation) will still contain this tiny self-intersection. Setting Clipper's StrictlySimple property to true avoids this uncommon problem.
