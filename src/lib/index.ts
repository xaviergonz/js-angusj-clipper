/*******************************************************************************
 *                                                                              *
 * Author    :  Angus Johnson                                                   *
 * Version   :  6.4.2                                                           *
 * Date      :  27 February 2017                                                *
 * Website   :  http://www.angusj.com                                           *
 * Copyright :  Angus Johnson 2010-2017                                         *
 *                                                                              *
 * License:                                                                     *
 * Use, modification & distribution is subject to Boost Software License Ver 1. *
 * http://www.boost.org/LICENSE_1_0.txt                                         *
 *                                                                              *
 * Attributions:                                                                *
 * The code in this library is an extension of Bala Vatti's clipping algorithm: *
 * "A generic solution to polygon clipping"                                     *
 * Communications of the ACM, Vol 35, Issue 7 (July 1992) pp 56-63.             *
 * http://portal.acm.org/citation.cfm?id=129906                                 *
 *                                                                              *
 * Computer graphics and geometric modeling: implementation and algorithms      *
 * By Max K. Agoston                                                            *
 * Springer; 1 edition (January 4, 2005)                                        *
 * http://books.google.com/books?q=vatti+clipping+agoston                       *
 *                                                                              *
 * See also:                                                                    *
 * "Polygon Offsetting by Computing Winding Numbers"                            *
 * Paper no. DETC2005-85513 pp. 565-575                                         *
 * ASME 2005 International Design Engineering Technical Conferences             *
 * and Computers and Information in Engineering Conference (IDETC/CIE2005)      *
 * September 24-28, 2005 , Long Beach, California, USA                          *
 * http://www.me.berkeley.edu/~mcmains/pubs/DAC05OffsetPolygon.pdf              *
 *                                                                              *
 *******************************************************************************/

/*******************************************************************************
 *                                                                              *
 * Author    :  Javier Gonzalez Garces                                          *
 * Version   :  6.4.2                                                           *
 * Date      :  12 July 2017                                                    *
 *                                                                              *
 * This is a translation of the C# Clipper library to Javascript.               *
 *                                                                              *
 * One change with respect to the original library is that points are assumed   *
 * to be immutable structures. This is done so the algorithm is faster, but if  *
 * you modify a point from the original polygon it might end up modifying the   *
 * result(s).                                                                   *
 *                                                                              *
 * Int128 struct of C# is implemented using js-big-integer                      *
 * Because Javascript lacks support for 64-bit integers, the space              *
 * is a little more restricted than in C# version.                              *
 *                                                                              *
 * C# version has support for coordinate space:                                 *
 * +-4611686018427387903 ( sqrt(2^127 -1)/2 )                                   *
 * while Javascript version has support for space:                              *
 * +-4503599627370495 ( sqrt(2^106 -1)/2 )                                      *
 *                                                                              *
 * js-big-integer proved to be the fastest big integer library for muls:        *
 * http://yaffle.github.io/BigInteger/benchmark/                                *
 *                                                                              *
 * This class can be made simpler when (if ever) 64-bit integer support comes.  *
 *                                                                              *
 *******************************************************************************/

import { CInt, ClipType, PolyType, PolyFillType, JoinType, EndType, Path, Paths,
  PointInPolygonResult, ZFillCallbackImmutable, loRange, hiRange } from './types';
export { CInt, ClipType, PolyType, PolyFillType, JoinType, EndType, Path, Paths,
  PointInPolygonResult, ZFillCallbackImmutable, loRange, hiRange};

import { IntPoint } from './IntPoint';
export { IntPoint };

import { IntRect } from './IntRect';
export { IntRect };

import { PolyNode } from './PolyNode';
export { PolyNode };

import { PolyTree } from './PolyTree';
export { PolyTree };

import { ClipperError } from './ClipperError';
export { ClipperError };

import { area, cleanPolygon, cleanPolygons, openPathsFromPolyTree, closedPathsFromPolyTree,
  minkowskiSumPath, minkowskiSumPaths, minkowskiDiff, polyTreeToPaths, orientation, pointInPolygon,
  reversePath, reversePaths, simplifyPolygon, simplifyPolygons, scalePath, scalePaths } from './functions';
export { area, cleanPolygon, cleanPolygons, openPathsFromPolyTree, closedPathsFromPolyTree,
  minkowskiSumPath, minkowskiSumPaths, minkowskiDiff, polyTreeToPaths, orientation, pointInPolygon,
  reversePath, reversePaths, simplifyPolygon, simplifyPolygons, scalePath, scalePaths };

import { ClipperBase } from './ClipperBase';
export { ClipperBase };

import { Clipper, ClipperInitOptions } from './Clipper';
export { Clipper, ClipperInitOptions };

import { ClipperOffset, ClipperOffsetInitOptions } from './ClipperOffset';
export { ClipperOffset, ClipperOffsetInitOptions };

// TODO: consider moving classes to interfaces to make them faster
