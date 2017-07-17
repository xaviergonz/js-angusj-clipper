##### enum EndType

The EndType enumerator has 5 values: 

###### Values
* **ClosedPolygon**

    Ends are joined using the JoinType value and the path filled as a polygon 

* **ClosedLine**

    Ends are joined using the JoinType value and the path filled as a polyline 

* **EvenOdd**

    Ends are squared off and extended delta units 

* **OpenSquare**

    Ends are rounded off and extended delta units 

* **OpenButt**

    Ends are squared off with no extension. 

* **OpenSingle (future)**

    Offsets an open path in a single direction. Planned for a future update. 

*Note:* With ClosedPolygon and ClosedLine types, the path closure will be the same regardless of whether or not the first and last vertices in the path match.

**TODO: insert image**
