#### class ClipperLibWrapper

A wrapper for the Native Clipper Library instance with all the operations available.

###### Properties

* **static readonly hiRange = 9007199254740991 (Number.MAX_SAFE_INTEGER)**

    Max coordinate value (both positive and negative).

* **readonly instance: NativeClipperLibInstance**
    
    Native library instance.

* **readonly format: [NativeClipperLibLoadedFormat](../libInit/NativeClipperLibLoadedFormat.md)**

    Native library format.
    
* **[clipToPaths](../clipping/clipTo.md)(params: [ClipParams](../clipping/ClipParams.md)): [Paths](../shared/Paths.md) | undefined**
* **[clipToPolyTree](../clipping/clipTo.md)(params: [ClipParams](../clipping/ClipParams.md)): [PolyTree](../shared/PolyTree.md) | undefined**

    Performs a polygon clipping (boolean) operation, returning the resulting Paths/PolyTree or throwing an error if failed.
    See the method detailed [documentation](../clipping/clipTo.md) for more details.

* **[offsetToPaths](../offsetting/offsetTo.md)(params: [OffsetParams](../offsetting/OffsetParams.md)): [Paths](../shared/Paths.md) | undefined**
* **[offsetToPolyTree](../offsetting/offsetTo.md)(params: [OffsetParams](../offsetting/OffsetParams.md)): [PolyTree](../shared/PolyTree.md) | undefined**

    Performs a polygon offset operation, returning the resulting Paths/PolyTree or undefined if failed.
    See the method detailed [documentation](../offsetting/offsetTo.md) for more details.

* **area(path: [Path](../shared/Path.md)): number**
    
    This function returns the area of the supplied polygon. It's assumed that the path is closed and does not self-intersect. Depending on orientation,
       * this value may be positive or negative. If Orientation is true, then the area will be positive and conversely, if Orientation is false, then the
       * area will be negative.
       
* **cleanPolygon(path: [Path](../shared/Path.md), distance = 1.1415): [Path](../shared/Path.md)**
* **cleanPolygons(paths: [Paths](../shared/Paths.md), distance = 1.1415): [Paths](../shared/Paths.md)**

    Removes vertices: 
    
    * that join co-linear edges, or join edges that are almost co-linear (such that if the vertex was moved no more than the specified distance the edges would be co-linear) 
    * that are within the specified distance of an adjacent vertex 
    * that are within the specified distance of a semi-adjacent vertex together with their out-lying vertices 
    
    Vertices are semi-adjacent when they are separated by a single (out-lying) vertex.
    
    The distance parameter's default value is approximately √2 so that a vertex will be removed when adjacent or semi-adjacent vertices having their corresponding X and Y coordinates differing by no more than 1 unit. (If the egdes are semi-adjacent the out-lying vertex will be removed too.)

    ![image](https://user-images.githubusercontent.com/6306796/28290343-5dc75e46-6b46-11e7-83aa-4a387823d1a9.png)
    ![image](https://user-images.githubusercontent.com/6306796/28290361-69632726-6b46-11e7-880a-09b965dde079.png)    

* **closedPathsFromPolyTree(polyTree: [PolyTree](../shared/PolyTree.md)): [Paths](../shared/Paths.md)**

    This function filters out open paths from the PolyTree structure and returns only closed paths in a Paths structure.
    
* **minkowskiDiff(poly1: [Path](../shared/Path.md), poly2: [Path](../shared/Path.md)): [Paths](../shared/Paths.md)**

    Minkowski Difference is performed by subtracting each point in a polygon from the set of points in an open or closed path. A key feature of Minkowski Difference is that when it's applied to two polygons, the resulting polygon will contain the coordinate space origin whenever the two polygons touch or overlap. (This function is often used to determine when polygons collide.)

    ![image](https://user-images.githubusercontent.com/6306796/28290392-8cd0af94-6b46-11e7-9bad-fd2e245cddc8.png)
    
    In the image above left the blue polygon is the 'minkowski difference' of the two red boxes. The black dot represents the coordinate space origin

* **minkowskiSumPath(pattern: [Path](../shared/Path.md), path: [Path](../shared/Path.md), pathIsClosed: boolean): [Paths](../shared/Paths.md)**
* **minkowskiSumPaths(pattern: [Path](../shared/Path.md), paths: [Paths](../shared/Paths.md), pathIsClosed: boolean): [Paths](../shared/Paths.md)**

    Minkowski Addition is performed by adding each point in a polygon 'pattern' to the set of points in an open or closed path. The resulting polygon (or polygons) defines the region that the 'pattern' would pass over in moving from the beginning to the end of the 'path'.

    ![image](https://user-images.githubusercontent.com/6306796/28290405-9636f11a-6b46-11e7-95e6-2e5cddb20789.png)

* **openPathsFromPolyTree(polyTree: [PolyTree](../shared/PolyTree.md)): [Paths](../shared/Paths.md)**

    This function filters out closed paths from the PolyTree structure and returns only open paths in a Paths structure. 

* **orientation(path: [Path](../shared/Path.md)): boolean**
    Orientation is only important to closed paths. Given that vertices are declared in a specific order, orientation refers to the direction (clockwise or counter-clockwise) that these vertices progress around a closed path.
    
    Orientation is also dependent on axis direction:
    * On Y-axis positive upward displays, orientation will return true if the polygon's orientation is counter-clockwise. 
    * On Y-axis positive downward displays, orientation will return true if the polygon's orientation is clockwise. 
    
    ![image](https://user-images.githubusercontent.com/6306796/28290420-a1877378-6b46-11e7-9d29-37f6eebd7755.png)

    Notes:
    
    * Self-intersecting polygons have indeterminate orientations in which case this function won't return a meaningful value. 
    * The majority of 2D graphic display libraries (eg GDI, GDI+, XLib, Cairo, AGG, Graphics32) and even the SVG file format have their coordinate origins at the top-left corner of their respective viewports with their Y axes increasing downward. However, some display libraries (eg Quartz, OpenGL) have their coordinate origins undefined or in the classic bottom-left position with their Y axes increasing upward. 
    * For Non-Zero filled polygons, the orientation of holes must be opposite that of outer polygons. 
    * For closed paths (polygons) in the solution returned by the clip method, their orientations will always be true for outer polygons and false for hole polygons (unless the reverseSolution property has been enabled). 

* **pointInPolygon(point: [IntPoint](../shared/IntPoint.md), path: [Path](../shared/Path.md)): [PointInPolygonResult](../shared/PointInPolygonResult.md)**

    Returns *PointInPolygonResult.Outside* when false, *PointInPolygonResult.OnBoundary* when point is on poly and *PointInPolygonResult.Inside* when point is in poly.

    It's assumed that 'poly' is closed and does not self-intersect.
     
* **polyTreeToPaths(polyTree: [PolyTree](../shared/PolyTree.md)): [Paths](../shared/Paths.md)**

    This function converts a PolyTree structure into a Paths structure.
     
* **reversePath(path: [Path](../shared/Path.md)): void**

    Reverses the vertex order (and hence orientation) in the specified path.
    
* **reversePaths(paths: [Paths](../shared/Paths.md)): void**

    Reverses the vertex order (and hence orientation) in each contained path.
    
* **simplifyPolygon(path: [Path](../shared/Path.md), fillType: [PolyFillType](../shared/PolyFillType.md) = PolyFillType.EvenOdd): [Paths](../shared/Paths.md)**
* **simplifyPolygons(paths: [Paths](../shared/Paths.md), fillType: [PolyFillType](../shared/PolyFillType.md) = PolyFillType.EvenOdd): [Paths](../shared/Paths.md)**

    Removes self-intersections from the supplied polygon (by performing a boolean union operation using the nominated PolyFillType).
    Polygons with non-contiguous duplicate vertices (ie 'touching') will be split into two polygons.
    
    Note: There's currently no guarantee that polygons will be strictly simple since 'simplifying' is still a work in progress.
    
    ![image](https://user-images.githubusercontent.com/6306796/28290432-b2402dfe-6b46-11e7-8d1f-d9e7ad7c1770.png)

    ![image](https://user-images.githubusercontent.com/6306796/28290441-c55f97b2-6b46-11e7-8c14-ab667fb4003f.png)
    ![image](https://user-images.githubusercontent.com/6306796/28290451-cca90fee-6b46-11e7-90e8-a7a0b98e7ae5.png)

* **scalePath(path: [Path](../shared/Path.md), scale: number): [Path](../shared/Path.md)**

    Scales a path by multiplying all its points by a number and then rounding them.
    
* **scalePaths(paths: [Paths](../shared/Paths.md), scale: number): [Paths](../shared/Paths.md)**

    Scales all inner paths by multiplying all its points by a number and then rounding them.
