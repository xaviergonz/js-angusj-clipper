import { EdgeSide } from './_types';
import { PolyType } from './types';
import { emptyIntPoint, IntPoint } from './IntPoint';

export class TEdge { // internal
  Bot: IntPoint = emptyIntPoint;
  Curr: IntPoint = emptyIntPoint; //current (updated for every new scanbeam)
  Top: IntPoint = emptyIntPoint;
  Delta: IntPoint = emptyIntPoint;
  Dx: number = 0;
  PolyTyp: PolyType = PolyType.Subject;
  Side: EdgeSide = EdgeSide.esLeft; //side only refers to current side of solution poly
  WindDelta: number = 0; //1 or -1 depending on winding direction
  WindCnt: number = 0;
  WindCnt2: number = 0; //winding count of the opposite polytype
  OutIdx: number = 0;
  Next: TEdge; // cannot be undefined
  Prev?: TEdge; // can be undefined
  NextInLML?: TEdge; // can be undefined
  NextInAEL?: TEdge; // can be undefined
  PrevInAEL?: TEdge; // can be undefined
  NextInSEL?: TEdge; // can be undefined
  PrevInSEL?: TEdge; // can be undefined
}
