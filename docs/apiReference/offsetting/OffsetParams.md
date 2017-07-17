#### interface OffsetParams

Params for the polygon offset operation.

###### Required properties

* **delta: number**

    Negative delta values shrink polygons and positive delta expand them.

* **offsetInputs: [OffsetInput](./OffsetInput.md)[]**

    One or more inputs to use for the offset operation.

###### Optional properties

* **arcTolerance?: number = 0.25**

    Firstly, this field/property is only relevant when JoinType = Round and/or EndType = Round.
    
    Since flattened paths can never perfectly represent arcs, this field/property specifies a maximum acceptable imprecision ('tolerance') when arcs are
    approximated in an offsetting operation. Smaller values will increase 'smoothness' up to a point though at a cost of performance and in creating more
    vertices to construct the arc.
    
    The default ArcTolerance is 0.25 units. This means that the maximum distance the flattened path will deviate from the 'true' arc will be no more
    than 0.25 units (before rounding).
    
    Reducing tolerances below 0.25 will not improve smoothness since vertex coordinates will still be rounded to integer values. The only way to achieve
    sub-integer precision is through coordinate scaling before and after offsetting (see example below).
    
    It's important to make ArcTolerance a sensible fraction of the offset delta (arc radius). Large tolerances relative to the offset delta will produce
    poor arc approximations but, just as importantly, very small tolerances will substantially slow offsetting performance while providing unnecessary
    degrees of precision. This is most likely to be an issue when offsetting polygons whose coordinates have been scaled to preserve floating point precision.
    
    Example: Imagine a set of polygons (defined in floating point coordinates) that is to be offset by 10 units using round joins, and the solution is to
    retain floating point precision up to at least 6 decimal places.
    To preserve this degree of floating point precision, and given that Clipper and ClipperOffset both operate on integer coordinates, the polygon
    coordinates will be scaled up by 108 (and rounded to integers) prior to offsetting. Both offset delta and ArcTolerance will also need to be scaled
    by this same factor. If ArcTolerance was left unscaled at the default 0.25 units, every arc in the solution would contain a fraction of 44 THOUSAND
    vertices while the final arc imprecision would be 0.25 × 10-8 units (ie once scaling was reversed). However, if 0.1 units was an acceptable imprecision
    in the final unscaled solution, then ArcTolerance should be set to 0.1 × scaling_factor (0.1 × 108 ). Now if scaling is applied equally to both
    ArcTolerance and to Delta Offset, then in this example the number of vertices (steps) defining each arc would be a fraction of 23.
    
    The formula for the number of steps in a full circular arc is ... ```Pi / acos(1 - arc_tolerance / abs(delta))```

* **miterLimit?: number = 2**

    This property sets the maximum distance in multiples of delta that vertices can be offset from their original positions before squaring is applied.
    (Squaring truncates a miter by 'cutting it off' at 1 × delta distance from the original vertex.)
    
    The default value for MiterLimit is 2 (ie twice delta). This is also the smallest MiterLimit that's allowed. If mitering was unrestricted (ie without
    any squaring), then offsets at very acute angles would generate unacceptably long 'spikes'.
    
    An example of an offsetting 'spike' at a narrow angle that's a consequence of using a large MiterLimit (25) ...
    
    ![image](https://user-images.githubusercontent.com/6306796/28290111-5b2f0afe-6b45-11e7-8607-af35ffc01cbf.png)
