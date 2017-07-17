##### enum ClipType

There are four boolean operations - Intersection, Union, Difference & Xor.

Given that subject and clip polygon brush 'filling' is defined both by their vertices and their respective filling rules, the four boolean operations can be applied to polygons to define new filling regions: 

###### Values
* **Intersection**
    
    AND - create regions where both subject and clip polygons are filled 

* **Union**

    OR create regions where either subject or clip polygons (or both) are filled 

* **Difference**

    NOT - create regions where subject polygons are filled except where clip polygons are filled 

* **Xor**

    Exclusive or - create regions where either subject or clip polygons are filled but not where both are filled 

**TODO: insert image**

All polygon clipping is performed with a Clipper object with the specific boolean operation indicated by the ClipType parameter passed in its Execute method. 

With regard to open paths (polylines), clipping rules generally match those of closed paths (polygons).
However, when there are both polyline and polygon subjects, the following clipping rules apply: 

union operations - polylines will be clipped by any overlapping polygons so that non-overlapped portions will be returned in the solution together with the union-ed polygons 
intersection, difference and xor operations - polylines will be clipped only by 'clip' polygons and there will be not interaction between polylines and subject polygons. 

Example of clipping behaviour when mixing polyline and polygon subjects:

**TODO: insert image**
