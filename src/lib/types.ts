// types
import { IntPoint } from './IntPoint';

export type CInt = number; // long

// enums
export const enum ClipType { Intersection, Union, Difference, Xor }
export const enum PolyType { Subject, Clip }

//By far the most widely used winding rules for polygon filling are
//EvenOdd & NonZero (GDI, GDI+, XLib, OpenGL, Cairo, AGG, Quartz, SVG, Gr32)
//Others rules include Positive, Negative and ABS_GTR_EQ_TWO (only in OpenGL)
//see http://glprogramming.com/red/chapter11.html
export const enum PolyFillType { EvenOdd, NonZero, Positive, Negative }

export const enum JoinType { Square, Round, Miter }
export const enum EndType { ClosedPolygon, ClosedLine, OpenButt, OpenSquare, OpenRound }

export type Path = IntPoint[];
export type Paths = Path[];

export const enum PointInPolygonResult {
  Outside = 0,
  Inside = 1,
  OnBoundary = -1
}

// note that this method was changed so it should NOT modify pt, but rather return the new Z
export type ZFillCallbackImmutable = (bot1: IntPoint, top1: IntPoint, bot2: IntPoint, top2: IntPoint, pt: IntPoint) => CInt;

// ranges in c# are too high for JS
//export const loRange: cInt = 0x3FFFFFFF; // = 1073741823 = sqrt(2^63 -1)/2
//export const hiRange: cInt = 0x3FFFFFFFFFFFFFFF; // = 4611686018427387903 = sqrt(2^127 -1)/2
export const loRange: CInt = 47453132; // sqrt(2^53 -1)/2
export const hiRange: CInt = 4503599627370495; // sqrt(2^106 -1)/2
// if JS ever supports true 64-bit integers then these ranges can be as in C#
// and the biginteger library can be simpler, as then 128bit can be represented as two 64bit numbers
