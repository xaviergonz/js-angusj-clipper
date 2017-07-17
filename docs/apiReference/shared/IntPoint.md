#### interface IntPoint
```{ x: number; y: number; }```

The IntPoint structure is used to represent all vertices in the Clipper Library. An integer storage type has been deliberately chosen to preserve numerical robustness. (Early versions of the library used floating point coordinates, but it became apparent that floating point imprecision would always cause occasional errors.)

A sequence of IntPoints are contained within a Path structure to represent a single contour.

Users wishing to clip or offset polygons containing floating point coordinates need to use appropriate scaling when converting these values to and from IntPoints, since they will be auto-converted to integers.

See also the notes on rounding. 
