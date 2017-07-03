import { CInt } from './types';

// points, assumed to be immutable for speed
export interface IntPoint {
  readonly x: CInt;
  readonly y: CInt;
  readonly z?: CInt;
}

export const newIntPointXY = (X: CInt, Y: CInt): IntPoint => {
  return {
    x: X,
    y: Y,
  };
};

export const newIntPointXYZ = (X: CInt, Y: CInt, Z: CInt = 0): IntPoint => {
  return {
    x: X,
    y: Y,
    z: Z,
  };
};

export const intPointEquals = (a: IntPoint, b: IntPoint): boolean => {
  // yes, we don't compare Z
  // also we can't only compare by reference, since two points might have the same values, yet different refs
  return (a === b) || (a.x === b.x && a.y === b.y);
};

export const cloneIntPointXYWithX = (p: IntPoint, x: CInt): IntPoint => {
  return {
    x: x,
    y: p.y
  };
};

export const cloneIntPointXYZWithX = (p: IntPoint, x: CInt): IntPoint => {
  return {
    x: x,
    y: p.y,
    z: p.z
  };
};

export const emptyIntPoint: IntPoint = {
  x: 0, y: 0, z: 0
};
