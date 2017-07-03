import { CInt } from './types';

export class Maxima { // internal
  X: CInt = 0;
  Next?: Maxima; // can be undefined
  Prev?: Maxima; // can be undefined
}
