export type long = number;
export type int = number;
export type double = number;

export const enum Direction {dRightToLeft, dLeftToRight} // internal
export const enum NodeType { ntAny, ntOpen, ntClosed } // internal
export const enum EdgeSide {esLeft, esRight} // internal

//const horizontal: double = -3.4E+38;
export const horizontal: double = -9007199254740992; //-2^53

export const Skip: int = -2; // internal
export const Unassigned: int = -1; // internal
