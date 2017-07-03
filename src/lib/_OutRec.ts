import { OutPt } from './_OutPt';
import { PolyNode } from './PolyNode';

//OutRec: contains a path in the clipping solution. Edges in the AEL will
//carry a pointer to an OutRec when they are part of the clipping solution.
export class OutRec { // internal
  Idx: number = 0;
  IsHole: boolean = false;
  IsOpen: boolean = false;
  FirstLeft?: OutRec; // can be undefined //see comments in clipper.pas
  Pts?: OutPt; // can be undefined
  BottomPt?: OutPt; // can be undefined
  PolyNode?: PolyNode; // can be undefined
}
