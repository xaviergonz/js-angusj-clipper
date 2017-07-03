// big int
import {BigInteger} from './BigInteger';

export const Int128Mul = (a: any, b: any): any => {
  return BigInteger.multiply(a, b);
};

export const Int128Equals = (a: any, b: any): boolean => {
  return BigInteger.compareTo(a, b) === 0;
};
