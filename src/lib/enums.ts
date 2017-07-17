/**
 * By far the most widely used winding rules for polygon filling are EvenOdd & NonZero (GDI, GDI+, XLib, OpenGL, Cairo, AGG, Quartz, SVG, Gr32)
 * Others rules include Positive, Negative and ABS_GTR_EQ_TWO (only in OpenGL)
 * see http://glprogramming.com/red/chapter11.html
 */
export enum PolyFillType { EvenOdd, NonZero, Positive, Negative }

export enum ClipType { Intersection, Union, Difference, Xor }
export enum PolyType { Subject, Clip }

export enum JoinType { Square, Round, Miter }
export enum EndType { ClosedPolygon, ClosedLine, OpenButt, OpenSquare, OpenRound }

export const enum PointInPolygonResult {
  Outside = 0,
  Inside = 1,
  OnBoundary = -1
}

