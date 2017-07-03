import { TEdge } from './_TEdge';
import { CInt } from './types';

export class LocalMinima { // internal
  Y: CInt = 0;
  LeftBound?: TEdge; // can be undefined
  RightBound?: TEdge; // can be undefined
  Next?: LocalMinima; // can be undefined
}
