import { emptyIntPoint, IntPoint } from './IntPoint';
import { OutPt } from './_OutPt';

export class Join { // internal
  OutPt1: OutPt; // cannot be undefined
  OutPt2: OutPt; // cannot be undefined
  OffPt: IntPoint = emptyIntPoint;
}
