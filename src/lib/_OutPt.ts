import { emptyIntPoint, IntPoint } from './IntPoint';

export class OutPt { // internal
  Idx: number = 0;
  Pt: IntPoint = emptyIntPoint;
  Next: OutPt; // cannot be undefined
  Prev: OutPt; // cannot be undefined
}
