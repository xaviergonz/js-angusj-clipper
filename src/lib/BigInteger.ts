// node/s port of Yaffle/BigInteger
// last updated 03072017

// BigInteger.js
// Available under Public Domain
// https://github.com/Yaffle/BigInteger/

// For implementation details, see "The Handbook of Applied Cryptography"
// http://www.cacr.math.uwaterloo.ca/hac/about/chap14.pdf

const parseInteger = function(s: string, from: number, to: number, radix: number) {
  let i = from - 1;
  let n = 0;
  const y = radix < 10 ? radix : 10;
  while (++i < to) {
    const code = s.charCodeAt(i);
    let v = code - 48;
    if (v < 0 || y <= v) {
      v = 10 - 65 + code;
      if (v < 10 || radix <= v) {
        v = 10 - 97 + code;
        if (v < 10 || radix <= v) {
          throw new RangeError();
        }
      }
    }
    n = n * radix + v;
  }
  return n;
};

const createArray = function(length: number) {
  const x = new Array(length);
  let i = -1;
  while (++i < length) {
    x[i] = 0;
  }
  return x;
};

// count >= 1
const pow = function(x: number, count: number) {
  let accumulator = 1;
  let v = x;
  let c = count;
  while (c > 1) {
    const q = Math.floor(c / 2);
    if (q * 2 !== c) {
      accumulator *= v;
    }
    v *= v;
    c = q;
  }
  return accumulator * v;
};

let epsilon = 2 / (9007199254740991 + 1);
while (1 + epsilon / 2 !== 1) {
  epsilon /= 2;
}
const BASE = 2 / epsilon;
let SPLIT: number;
const calcSplit = () => {
  let s = 134217728;
  while (s * s < 2 / epsilon) {
    s *= 2;
  }
  SPLIT = s + 1;
};
calcSplit();

// Veltkamp-Dekker's algorithm
// see http://web.mit.edu/tabbott/Public/quaddouble-debian/qd-2.3.4-old/docs/qd.pdf
const fma = function(a: number, b: number, product: number) {
  const at = SPLIT * a;
  const ahi = at - (at - a);
  const alo = a - ahi;
  const bt = SPLIT * b;
  const bhi = bt - (bt - b);
  const blo = b - bhi;
  return ((ahi * bhi + product) + ahi * blo + alo * bhi) + alo * blo;
};

const fastTrunc = function(x: number) {
  const v = (x - BASE) + BASE;
  return v > x ? v - 1 : v;
};

const performMultiplication = function(carry: number, a: number, b: number) {
  const product = a * b;
  const error = fma(a, b, -product);

  let hi = fastTrunc(product / BASE);
  let lo = product - hi * BASE + error;

  if (lo < 0) {
    lo += BASE;
    hi -= 1;
  }

  lo += carry - BASE;
  if (lo < 0) {
    lo += BASE;
  }
  else {
    hi += 1;
  }

  return { lo: lo, hi: hi };
};

const performDivision = function(a: number, b: number, divisor: number) {
  if (a >= divisor) {
    throw new RangeError();
  }
  const p = a * BASE;
  let q = fastTrunc(p / divisor);

  let r = 0 - fma(q, divisor, -p);
  if (r < 0) {
    q -= 1;
    r += divisor;
  }

  r += b - divisor;
  if (r < 0) {
    r += divisor;
  }
  else {
    q += 1;
  }
  const y = fastTrunc(r / divisor);
  r -= y * divisor;
  q += y;
  return { q: q, r: r };
};

const createBigInteger = function(sign: number, magnitude: any, length: any, value: any) {
  return length === 0 ? 0 : (length === 1 ? (sign === 1 ? 0 - value : value) : new BigInteger(sign, magnitude, length, value));
};

const valueOf = function(x: any) {
  if (typeof x === 'number') {
    return new BigInteger(x < 0 ? 1 : 0, undefined, x === 0 ? 0 : 1, x < 0 ? 0 - x : 0 + x);
  }
  return x;
};

const parseBigInteger = function(s: string, radix?: number) {
  if (radix === undefined) {
    radix = 10;
  }
  if (radix !== 10 && (radix < 2 || radix > 36 || radix !== Math.floor(radix))) {
    throw new RangeError('radix argument must be an integer between 2 and 36');
  }
  let length = s.length;
  if (length === 0) {
    throw new RangeError();
  }
  let sign = 0;
  const signCharCode = s.charCodeAt(0);
  let from = 0;
  if (signCharCode === 43) { // "+"
    from = 1;
  }
  if (signCharCode === 45) { // "-"
    from = 1;
    sign = 1;
  }

  length -= from;
  if (length === 0) {
    throw new RangeError();
  }
  if (pow(radix, length) <= BASE) {
    const value = parseInteger(s, from, from + length, radix);
    return createBigInteger(value === 0 ? 0 : sign, undefined, value === 0 ? 0 : 1, value);
  }
  let groupLength = 0;
  let groupRadix = 1;
  const limit = fastTrunc(BASE / radix);
  while (groupRadix <= limit) {
    groupLength += 1;
    groupRadix *= radix;
  }
  let size = Math.floor((length - 1) / groupLength) + 1;

  const magnitude = createArray(size);
  let k = size;
  let i = length;
  while (i > 0) {
    k -= 1;
    magnitude[k] = parseInteger(s, from + (i > groupLength ? i - groupLength : 0), from + i, radix);
    i -= groupLength;
  }

  let j = -1;
  while (++j < size) {
    let c = magnitude[j];
    let l = -1;
    while (++l < j) {
      const tmp = performMultiplication(c, magnitude[l], groupRadix);
      const lo = tmp.lo;
      const hi = tmp.hi;
      magnitude[l] = lo;
      c = hi;
    }
    magnitude[j] = c;
  }

  while (size > 0 && magnitude[size - 1] === 0) {
    size -= 1;
  }

  return createBigInteger(size === 0 ? 0 : sign, magnitude, size, magnitude[0]);
};

const compareMagnitude = function(a: any, b: any) {
  if (a.length !== b.length) {
    return a.length < b.length ? -1 : +1;
  }
  let i = a.length;
  while (--i >= 0) {
    if ((a.magnitude === undefined ? a.value : a.magnitude[i]) !== (b.magnitude === undefined ? b.value : b.magnitude[i])) {
      return (a.magnitude === undefined ? a.value : a.magnitude[i]) < (b.magnitude === undefined ? b.value : b.magnitude[i]) ? -1 : +1;
    }
  }
  return 0;
};

const compareTo = function(x: any, y: any) {
  const a = valueOf(x);
  const b = valueOf(y);
  const c = a.sign === b.sign ? compareMagnitude(a, b) : 1;
  return a.sign === 1 ? 0 - c : c; // positive zero will be returned for c === 0
};

const add = function(x: any, y: any, isSubtraction: any) {
  const a = valueOf(x);
  const b = valueOf(y);
  const z = compareMagnitude(a, b);
  const minSign = z < 0 ? a.sign : (isSubtraction ? 1 - b.sign : b.sign);
  const minMagnitude = z < 0 ? a.magnitude : b.magnitude;
  const minLength = z < 0 ? a.length : b.length;
  const minValue = z < 0 ? a.value : b.value;
  const maxSign = z < 0 ? (isSubtraction ? 1 - b.sign : b.sign) : a.sign;
  const maxMagnitude = z < 0 ? b.magnitude : a.magnitude;
  const maxLength = z < 0 ? b.length : a.length;
  const maxValue = z < 0 ? b.value : a.value;

  // |a| <= |b|
  if (minLength === 0) {
    return createBigInteger(maxSign, maxMagnitude, maxLength, maxValue);
  }
  let subtract = 0;
  let resultLength = maxLength;
  if (minSign !== maxSign) {
    subtract = 1;
    if (minLength === resultLength) {
      while (resultLength > 0 && (minMagnitude === undefined ? minValue : minMagnitude[resultLength - 1]) === (maxMagnitude === undefined ? maxValue : maxMagnitude[resultLength - 1])) {
        resultLength -= 1;
      }
    }
    if (resultLength === 0) { // a === (-b)
      return createBigInteger(0, createArray(0), 0, 0);
    }
  }
  // result !== 0
  const result = createArray(resultLength + (1 - subtract));
  let i = -1;
  let c = 0;
  while (++i < resultLength) {
    const aDigit = i < minLength ? (minMagnitude === undefined ? minValue : minMagnitude[i]) : 0;
    c += (maxMagnitude === undefined ? maxValue : maxMagnitude[i]) + (subtract === 1 ? 0 - aDigit : aDigit - BASE);
    if (c < 0) {
      result[i] = BASE + c;
      c = 0 - subtract;
    }
    else {
      result[i] = c;
      c = 1 - subtract;
    }
  }
  if (c !== 0) {
    result[resultLength] = c;
    resultLength += 1;
  }
  while (resultLength > 0 && result[resultLength - 1] === 0) {
    resultLength -= 1;
  }
  return createBigInteger(maxSign, result, resultLength, result[0]);
};

const multiply = function(x: any, y: any) {
  const a = valueOf(x);
  const b = valueOf(y);
  if (a.length === 0 || b.length === 0) {
    return createBigInteger(0, createArray(0), 0, 0);
  }
  const resultSign = a.sign === 1 ? 1 - b.sign : b.sign;
  if (a.length === 1 && (a.magnitude === undefined ? a.value : a.magnitude[0]) === 1) {
    return createBigInteger(resultSign, b.magnitude, b.length, b.value);
  }
  if (b.length === 1 && (b.magnitude === undefined ? b.value : b.magnitude[0]) === 1) {
    return createBigInteger(resultSign, a.magnitude, a.length, a.value);
  }
  let resultLength = a.length + b.length;
  const result = createArray(resultLength);
  let i = -1;
  while (++i < b.length) {
    let c = 0;
    let j = -1;
    while (++j < a.length) {
      let carry = 0;
      c += result[j + i] - BASE;
      if (c >= 0) {
        carry = 1;
      }
      else {
        c += BASE;
      }
      const tmp = performMultiplication(c, a.magnitude === undefined ? a.value : a.magnitude[j], b.magnitude === undefined ? b.value : b.magnitude[i]);
      const lo = tmp.lo;
      const hi = tmp.hi;
      result[j + i] = lo;
      c = hi + carry;
    }
    result[a.length + i] = c;
  }
  while (resultLength > 0 && result[resultLength - 1] === 0) {
    resultLength -= 1;
  }
  return createBigInteger(resultSign, result, resultLength, result[0]);
};

const divideAndRemainder = function(x: any, y: any, isDivision: any) {
  const a = valueOf(x);
  const b = valueOf(y);
  if (b.length === 0) {
    throw new RangeError();
  }
  if (a.length === 0) {
    return createBigInteger(0, createArray(0), 0, 0);
  }
  const quotientSign = a.sign === 1 ? 1 - b.sign : b.sign;
  if (b.length === 1 && (b.magnitude === undefined ? b.value : b.magnitude[0]) === 1) {
    if (isDivision === 1) {
      return createBigInteger(quotientSign, a.magnitude, a.length, a.value);
    }
    return createBigInteger(0, createArray(0), 0, 0);
  }

  const divisorOffset = a.length + 1; // `+ 1` for extra digit in case of normalization
  const divisorAndRemainder = createArray(divisorOffset + b.length + 1); // `+ 1` to avoid `index < length` checks
  const divisor = divisorAndRemainder;
  const remainder = divisorAndRemainder;
  let n = -1;
  while (++n < a.length) {
    remainder[n] = a.magnitude === undefined ? a.value : a.magnitude[n];
  }
  let m = -1;
  while (++m < b.length) {
    divisor[divisorOffset + m] = b.magnitude === undefined ? b.value : b.magnitude[m];
  }

  let top = divisor[divisorOffset + b.length - 1];

  // normalization
  let lambda = 1;
  if (b.length > 1) {
    lambda = fastTrunc(BASE / (top + 1));
    if (lambda > 1) {
      let carry = 0;
      let l = -1;
      while (++l < divisorOffset + b.length) {
        const tmp = performMultiplication(carry, divisorAndRemainder[l], lambda);
        const lo = tmp.lo;
        const hi = tmp.hi;
        divisorAndRemainder[l] = lo;
        carry = hi;
      }
      divisorAndRemainder[divisorOffset + b.length] = carry;
      top = divisor[divisorOffset + b.length - 1];
    }
    // assertion
    if (top < fastTrunc(BASE / 2)) {
      throw new RangeError();
    }
  }

  let shift = a.length - b.length + 1;
  if (shift < 0) {
    shift = 0;
  }
  let quotient;
  let quotientLength = 0;

  let i = shift;
  while (--i >= 0) {
    const t = b.length + i;
    let q = BASE - 1;
    if (remainder[t] !== top) {
      const tmp2 = performDivision(remainder[t], remainder[t - 1], top);
      const q2 = tmp2.q;
      //let r2 = tmp2.r;
      q = q2;
    }

    let ax = 0;
    let bx = 0;
    let j = i - 1;
    while (++j <= t) {
      const rj = remainder[j];
      const tmp3 = performMultiplication(bx, q, divisor[divisorOffset + j - i]);
      const lo3 = tmp3.lo;
      const hi3 = tmp3.hi;
      remainder[j] = lo3;
      bx = hi3;
      ax += rj - remainder[j];
      if (ax < 0) {
        remainder[j] = BASE + ax;
        ax = -1;
      }
      else {
        remainder[j] = ax;
        ax = 0;
      }
    }
    while (ax !== 0) {
      q -= 1;
      let c = 0;
      let k = i - 1;
      while (++k <= t) {
        c += remainder[k] - BASE + divisor[divisorOffset + k - i];
        if (c < 0) {
          remainder[k] = BASE + c;
          c = 0;
        }
        else {
          remainder[k] = c;
          c = +1;
        }
      }
      ax += c;
    }
    if (isDivision === 1 && q !== 0) {
      if (quotientLength === 0) {
        quotientLength = i + 1;
        quotient = createArray(quotientLength);
      }
      quotient![i] = q;
    }
  }

  if (isDivision === 1) {
    if (quotientLength === 0) {
      return createBigInteger(0, createArray(0), 0, 0);
    }
    return createBigInteger(quotientSign, quotient, quotientLength, quotient![0]);
  }

  let remainderLength = a.length + 1;
  if (lambda > 1) {
    let r = 0;
    let p = remainderLength;
    while (--p >= 0) {
      const tmp4 = performDivision(r, remainder[p], lambda);
      const q4 = tmp4.q;
      const r4 = tmp4.r;
      remainder[p] = q4;
      r = r4;
    }
    if (r !== 0) {
      // assertion
      throw new RangeError();
    }
  }
  while (remainderLength > 0 && remainder[remainderLength - 1] === 0) {
    remainderLength -= 1;
  }
  if (remainderLength === 0) {
    return createBigInteger(0, createArray(0), 0, 0);
  }
  const result = createArray(remainderLength);
  let o = -1;
  while (++o < remainderLength) {
    result[o] = remainder[o];
  }
  return createBigInteger(a.sign, result, remainderLength, result[0]);
};

const negate = function(x: any) {
  const a = valueOf(x);
  return createBigInteger(1 - a.sign, a.magnitude, a.length, a.value);
};

const toString = function(sign: any, magnitude: any, length: any, radix: any) {
  let result = sign === 1 ? '-' : '';

  let remainderLength = length;
  if (remainderLength === 0) {
    return '0';
  }
  if (remainderLength === 1) {
    result += magnitude[0].toString(radix);
    return result;
  }
  let groupLength = 0;
  let groupRadix = 1;
  const limit = fastTrunc(BASE / radix);
  while (groupRadix <= limit) {
    groupLength += 1;
    groupRadix *= radix;
  }
  // assertion
  if (groupRadix * radix <= BASE) {
    throw new RangeError();
  }
  const size = remainderLength + Math.floor((remainderLength - 1) / groupLength) + 1;
  const remainder = createArray(size);
  let n = -1;
  while (++n < remainderLength) {
    remainder[n] = magnitude[n];
  }

  let k = size;
  while (remainderLength !== 0) {
    let groupDigit = 0;
    let i = remainderLength;
    while (--i >= 0) {
      const tmp = performDivision(groupDigit, remainder[i], groupRadix);
      const q = tmp.q;
      const r = tmp.r;
      remainder[i] = q;
      groupDigit = r;
    }
    while (remainderLength > 0 && remainder[remainderLength - 1] === 0) {
      remainderLength -= 1;
    }
    k -= 1;
    remainder[k] = groupDigit;
  }
  result += remainder[k].toString(radix);
  while (++k < size) {
    const t = remainder[k].toString(radix);
    let j = groupLength - t.length;
    while (--j >= 0) {
      result += '0';
    }
    result += t;
  }
  return result;
};

export class BigInteger {
  constructor(public sign: number, public magnitude: any, public length: any, public value: any) {
  }

  toString(radix?: number): string {
    if (radix === undefined) {
      radix = 10;
    }
    if (radix !== 10 && (radix < 2 || radix > 36 || radix !== Math.floor(radix))) {
      throw new RangeError('radix argument must be an integer between 2 and 36');
    }
    return toString(this.sign, this.magnitude, this.length, radix);
  }

  static parseInt = parseBigInteger;

  static compareTo(x: number | BigInteger, y: number | BigInteger): number | BigInteger {
    if (typeof x === 'number' && typeof y === 'number') {
      return x < y ? -1 : (y < x ? +1 : 0);
    }
    return compareTo(x, y);
  }

  static add(x: number | BigInteger, y: number | BigInteger): number | BigInteger {
    if (typeof x === 'number' && typeof y === 'number') {
      const value = x + y;
      if (value >= -9007199254740991 && value <= +9007199254740991) {
        return value;
      }
    }
    return add(x, y, 0);
  }

  static subtract(x: number | BigInteger, y: number | BigInteger): number | BigInteger {
    if (typeof x === 'number' && typeof y === 'number') {
      const value = x - y;
      if (value >= -9007199254740991 && value <= +9007199254740991) {
        return value;
      }
    }
    return add(x, y, 1);
  }

  static multiply(x: number | BigInteger, y: number | BigInteger): number | BigInteger {
    if (typeof x === 'number' && typeof y === 'number') {
      const value = 0 + x * y;
      if (value >= -9007199254740991 && value <= +9007199254740991) {
        return value;
      }
    }
    return multiply(x, y);
  }

  static divide(x: number | BigInteger, y: number | BigInteger): number | BigInteger {
    if (typeof x === 'number' && typeof y === 'number') {
      if (y !== 0) {
        return x === 0 ? 0 : (x > 0 && y > 0) || (x < 0 && y < 0) ? 0 + Math.floor(x / y) : 0 - Math.floor((0 - x) / y);
      }
    }
    return divideAndRemainder(x, y, 1);
  }

  static remainder(x: number | BigInteger, y: number | BigInteger): number | BigInteger {
    if (typeof x === 'number' && typeof y === 'number') {
      if (y !== 0) {
        return 0 + x % y;
      }
    }
    return divideAndRemainder(x, y, 0);
  }

  static negate(x: number | BigInteger): number | BigInteger {
    if (typeof x === 'number') {
      return 0 - x;
    }
    return negate(x);
  }
}
