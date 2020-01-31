export interface NativeEnum {
  value: number;
}

// native enum
export interface NativeClipType {
  Intersection: NativeEnum & NativeClipType;
  Union: NativeEnum & NativeClipType;
  Difference: NativeEnum & NativeClipType;
  Xor: NativeEnum & NativeClipType;
}

// native enum
export interface NativePolyType {
  Subject: NativeEnum & NativePolyType;
  Clip: NativeEnum & NativePolyType;
}

// native enum
export interface NativePolyFillType {
  EvenOdd: NativeEnum & NativePolyFillType;
  NonZero: NativeEnum & NativePolyFillType;
  Positive: NativeEnum & NativePolyFillType;
  Negative: NativeEnum & NativePolyFillType;
}

// native enum
export interface NativeInitOptions {
  ReverseSolution: NativeEnum & NativeInitOptions;
  StrictlySimple: NativeEnum & NativeInitOptions;
  PreserveCollinear: NativeEnum & NativeInitOptions;
}

// native enum
export interface NativeJoinType {
  Square: NativeEnum & NativeJoinType;
  Round: NativeEnum & NativeJoinType;
  Miter: NativeEnum & NativeJoinType;
}

// native enum
export interface NativeEndType {
  ClosedPolygon: NativeEnum & NativeEndType;
  ClosedLine: NativeEnum & NativeEndType;
  OpenButt: NativeEnum & NativeEndType;
  OpenSquare: NativeEnum & NativeEndType;
  OpenRound: NativeEnum & NativeEndType;
}
