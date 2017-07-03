import { CInt } from './types';
import { int } from './_types';
import { TEdge } from './_TEdge';
import { emptyIntPoint, IntPoint } from './IntPoint';

export class IntersectNode {
  Edge1: TEdge; // internal, cant be undefined
  Edge2: TEdge; // internal, cant be undefined
  Pt: IntPoint = emptyIntPoint; // internal
}

export type IntersectNodeComparer = (node1: IntersectNode, node2: IntersectNode) => int;
export const MyIntersectNodeSort: IntersectNodeComparer = (node1: IntersectNode, node2: IntersectNode): int => {
  const i: CInt = node2.Pt.y - node1.Pt.y;
  if (i > 0) return 1;
  else if (i < 0) return -1;
  else return 0;
};
