#### enum PolyFillType

Filling indicates those regions that are inside a closed path (ie 'filled' with a brush color or pattern in a graphical display) and those regions that are outside. The Clipper Library supports 4 filling rules: Even-Odd, Non-Zero, Positive and Negative.

The simplest filling rule is Even-Odd filling (sometimes called alternate filling). Given a group of closed paths start from a point outside the paths and progress along an imaginary line through the paths. When the first path is crossed the encountered region is filled. When the next path is crossed the encountered region is not filled. Likewise, each time a path is crossed, filling starts if it had stopped and stops if it had started.

With the exception of Even-Odd filling, all other filling rules rely on edge direction and winding numbers to determine filling. Edge direction is determined by the order in which vertices are declared when constructing a path. Edge direction is used to determine the winding number of each polygon subregion.

The winding number for each polygon sub-region can be derived by: 

1. starting with a winding number of zero and 
2. from a point (P1) that's outside all polygons, draw an imaginary line to a point that's inside a given sub-region (P2) 
3. while traversing the line from P1 to P2, for each path that crosses the imaginary line from right to left increment the winding number, and for each path that crosses the line from left to right decrement the winding number. 
4. Once you arrive at the given sub-region you have its winding number. 

![image](https://user-images.githubusercontent.com/6306796/28290194-ba109ac4-6b45-11e7-963e-fc80681cfa00.png)

###### Values
* **EvenOdd**

    Alternate: Odd numbered sub-regions are filled, while even numbered sub-regions are not.

* **NonZero**

    Winding: All non-zero sub-regions are filled.

* **Positive**

    All sub-regions with winding counts > 0 are filled.

* **Negative**

    All sub-regions with winding counts < 0 are filled.

Polygon regions are defined by one or more closed paths which may or may not intersect. A single polygon region can be defined by a single non-intersecting path or by multiple non-intersecting paths where there's typically an 'outer' path and one or more inner 'hole' paths. Looking at the three shapes in the image above, the middle shape consists of two concentric rectangles sharing the same clockwise orientation. With even-odd filling, where orientation can be disregarded, the inner rectangle would create a hole in the outer rectangular polygon. There would be no hole with non-zero filling. In the concentric rectangles on the right, where the inner rectangle is orientated opposite to the outer, a hole will be rendered with either even-odd or non-zero filling. A single path can also define multiple subregions if it self-intersects as in the example of the 5 pointed star shape below.

![image](https://user-images.githubusercontent.com/6306796/28290200-c49146ec-6b45-11e7-947a-59248b510388.png)
![image](https://user-images.githubusercontent.com/6306796/28290209-d1cefc82-6b45-11e7-8ca0-6ce51a24e884.png)
![image](https://user-images.githubusercontent.com/6306796/28290211-d34cca12-6b45-11e7-80e6-5ea5f1d7ccc6.png)
![image](https://user-images.githubusercontent.com/6306796/28290213-d51a5602-6b45-11e7-8c26-0925e2fb1f42.png)
![image](https://user-images.githubusercontent.com/6306796/28290216-d6966084-6b45-11e7-82ff-aeb032de7c0c.png)

By far the most widely used fill rules are Even-Odd (aka Alternate) and Non-Zero (aka Winding). Most graphics rendering libraries (AGG, Android Graphics, Cairo, GDI+, OpenGL, Quartz 2D etc) and vector graphics storage formats (SVG, Postscript, Photoshop etc) support both these rules. However some libraries (eg Java's Graphics2D) only support one fill rule. Android Graphics and OpenGL are the only libraries (that I'm aware of) that support multiple filling rules.

It's useful to note that edge direction has no affect on a winding number's odd-ness or even-ness. (This is why orientation is ignored when the Even-Odd rule is employed.)

The direction of the Y-axis does affect polygon orientation and edge direction. However, changing Y-axis orientation will only change the sign of winding numbers, not their magnitudes, and has no effect on either Even-Odd or Non-Zero filling.
