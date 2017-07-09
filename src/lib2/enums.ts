/**
 * By far the most widely used winding rules for polygon filling are EvenOdd & NonZero (GDI, GDI+, XLib, OpenGL, Cairo, AGG, Quartz, SVG, Gr32)
 * Others rules include Positive, Negative and ABS_GTR_EQ_TWO (only in OpenGL)
 * see http://glprogramming.com/red/chapter11.html
 */
export const enum PolyFillType { EvenOdd, NonZero, Positive, Negative }

export const enum ClipType { Intersection, Union, Difference, Xor }
export const enum PolyType { Subject, Clip }

export const enum JoinType { Square, Round, Miter }
export const enum EndType { ClosedPolygon, ClosedLine, OpenButt, OpenSquare, OpenRound }
