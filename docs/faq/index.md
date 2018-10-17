### FAQ

#### Why does Clipper use integer coordinates, not floats?

This has been done to preserve numerical robustness. Early versions of the library did use floating point coordinates, but it became apparent that floating point imprecision was always going to cause occasional errors.

#### How do I use floating point coordinates with Clipper?

It's a simple task to multiply your floating point coordinates by a scaling factor (that's typically a power of 10 depending on the desired precision). Then with the solution paths, divide the returned coordinates by this same scaling factor. Clipper accepts integer coordinates as large as ±9007199254740991 (Number.MAX_SAFE_INTEGER), so it can accommodate very large scaling.

#### Does Clipper handle polygons with holes?

'Holes' are defined by the specified polygon filling rule.

#### Some polygons in the solution share a common edge. Is this a bug?

No, though this should happen rarely as of version 6.

#### I have lots of polygons that I want to 'union'. Can I do this in one operation?

Yes. Just add all the polygons as subject polygons to the Clipper object. (You don't have to assign both subject and clip polygons.)

#### The polygons produced by ClipperOffset have tiny artefacts? Could this be a bug?

Make sure the input polygons don't self-intersect. Tiny self-intersections can sometimes be produced by previous clipping operations. These can be cleaned up using the CleanPolygon and CleanPolygons functions. Also, make sure the supplied polygons don't overlap. If they do, offset these separately. Finally, the precision of the input coordinates may be a problem. Because the Clipper Library only operates on integer coordinates, you may need to scale your coordinates (eg by a factor of 10) to improve precision.

#### Is there an easy way to reverse polygon orientations?

Yes, see reversePaths.

#### My drawings contain lots of beziers, ellipses and arcs. How can I perform clipping operations on these?

You'll have to convert them to 'flattened' paths. For an example of how this can be done (and even reconstructed back into beziers, arcs etc), see the CurvesDemo application included in this library.
