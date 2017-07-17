// native enum
export interface NativeClipType {
  Intersection: NativeClipType;
  Union: NativeClipType;
  Difference: NativeClipType;
  Xor: NativeClipType;
}

// native enum
export interface NativePolyType {
  Subject: NativePolyType;
  Clip: NativePolyType;
}

// native enum
export interface NativePolyFillType {
  EvenOdd: NativePolyFillType;
  NonZero: NativePolyFillType;
  Positive: NativePolyFillType;
  Negative: NativePolyFillType;
}

// native enum
export interface NativeInitOptions {
  ReverseSolution: NativeInitOptions | number;
  StrictlySimple: NativeInitOptions | number;
  PreserveCollinear: NativeInitOptions | number;
}

// native enum
export interface NativeJoinType {
  Square: NativeJoinType;
  Round: NativeJoinType;
  Miter: NativeJoinType;
}

// native enum
export interface NativeEndType {
  ClosedPolygon: NativeEndType;
  ClosedLine: NativeEndType;
  OpenButt: NativeEndType;
  OpenSquare: NativeEndType;
  OpenRound: NativeEndType;
}
