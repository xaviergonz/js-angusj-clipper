import { CInt } from './types';

export class Scanbeam { // internal
  Y: CInt = 0;
  Next?: Scanbeam; // can be undefined
}
