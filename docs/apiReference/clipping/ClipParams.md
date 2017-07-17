#### interface ClipParams

Params for the clipToPaths / clipToPolyTree operations.

Any number of subject and clip paths can be added to a clipping task.

Boolean (clipping) operations are mostly applied to two sets of Polygons, represented in this library as subject and clip polygons. Whenever Polygons
are added to the Clipper object, they must be assigned to either subject or clip polygons.

UNION operations can be performed on one set or both sets of polygons, but all other boolean operations require both sets of polygons to derive
meaningful solutions.

###### Required properties

* **clipType: [ClipType](./ClipType.md)**
   
    Clipping operation type (Intersection, Union, Difference or Xor).
   
* **subjectFillType: [PolyFillType](../shared/PolyFillType.md)**
   
    Winding (fill) rule for subject polygons.

* **subjectInputs: [SubjectInput](./SubjectInput.md)[]**
   
    Subject inputs.

###### Optional properties

* **clipFillType?: [PolyFillType](../shared/PolyFillType.md) = subjectFillType**

    Winding (fill) rule for clipping polygons. If missing it will use the same one as subjectFillType.

* **clipInputs?: [ClipInput](./ClipInput.md)[] = []**

    Clipping inputs. Not required for union operations, required for others.

* **reverseSolution?: boolean = false**

    When this property is set to true, polygons returned in the solution parameter of the clip method will have orientations opposite to their normal
    orientations.
   
* **strictlySimple?: boolean = false**

    Terminology:   
        
    * A simple polygon is one that does not self-intersect. 
    * A weakly simple polygon is a simple polygon that contains 'touching' vertices, or 'touching' edges. 
    * A strictly simple polygon is a simple polygon that does not contain 'touching' vertices, or 'touching' edges. 
        
    Vertices 'touch' if they share the same coordinates (and are not adjacent). An edge touches another if one of its end vertices touches another edge excluding its adjacent edges, or if they are co-linear and overlapping (including adjacent edges).
       
    Polygons returned by clipping operations should always be simple polygons. When the StrictlySimply property is enabled, polygons returned will be strictly simple, otherwise they may be weakly simple. It's computationally expensive ensuring polygons are strictly simple and so this property is disabled by default.
        
    *Note: There's currently no guarantee that polygons will be strictly simple since 'simplifying' is still a work in progress.*
       
       
    ![image](https://user-images.githubusercontent.com/6306796/28289784-4875cc82-6b44-11e7-9be7-20d5eb30f597.png)
        
    In the image above, the two examples show weakly simple polygons being broken into two strictly simple polygons. (The outlines with arrows are intended to aid visualizing vertex order.)

* **preserveCollinear?: boolean = false**
       
    By default, when three or more vertices are collinear in input polygons (subject or clip), the Clipper object removes the 'inner' vertices before
    clipping. When enabled the preserveCollinear property prevents this default behavior to allow these inner vertices to appear in the solution.
