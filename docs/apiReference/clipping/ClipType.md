#### enum ClipType

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

![image](https://user-images.githubusercontent.com/6306796/28289822-692abb18-6b44-11e7-9fa0-24382a7079fc.png)

![image](https://user-images.githubusercontent.com/6306796/28289832-7436ff08-6b44-11e7-98cd-cd1ac5d9c12a.png)
![image](https://user-images.githubusercontent.com/6306796/28289843-851c0fac-6b44-11e7-8442-f1a03b6aa170.png)
![image](https://user-images.githubusercontent.com/6306796/28289847-87ba1380-6b44-11e7-9919-108187d270f0.png)
![image](https://user-images.githubusercontent.com/6306796/28289851-8a15126a-6b44-11e7-865f-844fa3f491dd.png)

All polygon clipping is performed within the clip method with the specific boolean operation indicated by the ClipType parameter passed as an argument. 

With regard to open paths (polylines), clipping rules generally match those of closed paths (polygons).
However, when there are both polyline and polygon subjects, the following clipping rules apply: 

union operations - polylines will be clipped by any overlapping polygons so that non-overlapped portions will be returned in the solution together with the union-ed polygons 
intersection, difference and xor operations - polylines will be clipped only by 'clip' polygons and there will be not interaction between polylines and subject polygons. 

Example of clipping behaviour when mixing polyline and polygon subjects:

![image](https://user-images.githubusercontent.com/6306796/28289916-c0ebd4c2-6b44-11e7-8e47-15b78f9dd8c9.png)
