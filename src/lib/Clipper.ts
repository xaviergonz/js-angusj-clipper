import { Round, TopX } from './_functions';
import { IntersectNode, IntersectNodeComparer, MyIntersectNodeSort } from './_IntersectNode';
import { Join } from './_Join';
import { LocalMinima } from './_LocalMinima';
import { Maxima } from './_Maxima';
import { OutPt } from './_OutPt';
import { OutRec } from './_OutRec';
import { TEdge } from './_TEdge';
import { Direction, double, EdgeSide, horizontal, int, long, Skip, Unassigned } from './_types';
import { ClipperBase } from './ClipperBase';
import { ClipperError } from './ClipperError';
import { IntPoint, intPointEquals, newIntPointXY, newIntPointXYZ } from './IntPoint';
import { PolyNode } from './PolyNode';
import { PolyTree } from './PolyTree';
import { CInt, ClipType, Path, Paths, PolyFillType, PolyType, ZFillCallbackImmutable } from './types';

export interface ClipperInitOptions {
  reverseSolution?: boolean;
  strictlySimple?: boolean;
  preserveCollinear?: boolean;
  useLines?: boolean; // new
  useXyz?: boolean; // new
}

export class Clipper extends ClipperBase {
  private m_ClipType: ClipType = ClipType.Intersection;
  private m_Maxima?: Maxima;
  private m_SortedEdges?: TEdge;
  private m_IntersectList: IntersectNode[] = [];
  private m_IntersectNodeComparer: IntersectNodeComparer = MyIntersectNodeSort;
  private m_ExecuteLocked: boolean = false;
  private m_ClipFillType: PolyFillType = PolyFillType.EvenOdd;
  private m_SubjFillType: PolyFillType = PolyFillType.EvenOdd;
  private m_Joins: Join[] = [];
  private m_GhostJoins: Join[] = [];
  private m_UsingPolyTree: boolean = false;

  public zFillFunctionImmutable?: ZFillCallbackImmutable; // only used when use_xyz is true

  public constructor(initOptions: ClipperInitOptions = {}) {
    super();

    this.m_Scanbeam = undefined;
    this.m_Maxima = undefined;
    this.m_ActiveEdges = undefined;
    this.m_SortedEdges = undefined;
    //this.m_IntersectList = [];
    //this.m_IntersectNodeComparer = MyIntersectNodeSort;
    //this.m_ExecuteLocked = false;
    //this.m_UsingPolyTree = false;
    //this.m_PolyOuts = [];
    //this.m_Joins = [];
    //this.m_GhostJoins = [];

    //noinspection PointlessBooleanExpressionJS
    this.reverseSolution = !!initOptions.reverseSolution;
    //noinspection PointlessBooleanExpressionJS
    this.strictlySimple = !!initOptions.strictlySimple;
    //noinspection PointlessBooleanExpressionJS
    this.preserveCollinear = !!initOptions.preserveCollinear;

    this.useLines = initOptions.useLines === undefined ? true : initOptions.useLines;
    this.useXyz = initOptions.useXyz === undefined ? false : initOptions.useXyz;

    this.zFillFunctionImmutable = undefined;
  }

  private InsertMaxima(X: long): void {
    //double-linked list: sorted ascending, ignoring dups.
    const newMax = new Maxima();
    newMax.X = X;
    if (this.m_Maxima === undefined) {
      this.m_Maxima = newMax;
      this.m_Maxima.Next = undefined;
      this.m_Maxima.Prev = undefined;
    }
    else if (X < this.m_Maxima.X) {
      newMax.Next = this.m_Maxima;
      newMax.Prev = undefined;
      this.m_Maxima = newMax;
    }
    else {
      let m = this.m_Maxima;
      while (m.Next !== undefined && X >= m.Next.X) {
        m = m.Next;
      }
      if (X === m.X) {
        return; //ie ignores duplicates (& CG to clean up newMax)
      }
      //insert newMax between m and m.Next ...
      newMax.Next = m.Next;
      newMax.Prev = m;
      if (m.Next !== undefined) {
        m.Next.Prev = newMax;
      }
      m.Next = newMax;
    }
  }

  public reverseSolution: boolean = false;

  public strictlySimple: boolean = false;

  public executePaths(clipType: ClipType, subjFillType: PolyFillType = PolyFillType.EvenOdd, clipFillType?: PolyFillType): Paths | undefined { // in solution: boolean -> solution | undefined
    if (clipFillType === undefined) {
      clipFillType = subjFillType;
    }

    if (this.m_ExecuteLocked) {
      return undefined;
    }
    if (this.m_HasOpenPaths) {
      throw new ClipperError('Error: PolyTree struct is needed for open path clipping.');
    }

    const solution: Paths = [];
    this.m_ExecuteLocked = true;
    this.m_SubjFillType = subjFillType;
    this.m_ClipFillType = clipFillType;
    this.m_ClipType = clipType;
    this.m_UsingPolyTree = false;
    let succeeded = false;
    try {
      succeeded = this.ExecuteInternal();
      //build the return polygons ...
      if (succeeded) {
        this.BuildResult(solution);
        return solution;
      }
    }
    finally {
      this.DisposeAllPolyPts();
      this.m_ExecuteLocked = false;
    }
    return undefined;
  }

  public executePolyTree(clipType: ClipType, subjFillType: PolyFillType = PolyFillType.EvenOdd, clipFillType?: PolyFillType): PolyTree | undefined { // in polytree: boolean -> polytree | undefined
    if (clipFillType === undefined) {
      clipFillType = subjFillType;
    }

    if (this.m_ExecuteLocked) {
      return undefined;
    }

    const polytree = new PolyTree();
    this.m_ExecuteLocked = true;
    this.m_SubjFillType = subjFillType;
    this.m_ClipFillType = clipFillType;
    this.m_ClipType = clipType;
    this.m_UsingPolyTree = true;
    let succeeded = false;
    try {
      succeeded = this.ExecuteInternal();
      //build the return polygons ...
      if (succeeded) {
        this.BuildResult2(polytree);
        return polytree;
      }
    }
    finally {
      this.DisposeAllPolyPts();
      this.m_ExecuteLocked = false;
    }
    return undefined;
  }

  private static FixHoleLinkage(outRec: OutRec): void {
    //skip if an outermost polygon or
    //already already points to the correct FirstLeft ...
    if (outRec.FirstLeft === undefined ||
      outRec.IsHole !== outRec.FirstLeft.IsHole &&
      outRec.FirstLeft.Pts !== undefined) {
      return;
    }

    let orfl: OutRec | undefined = outRec.FirstLeft;
    while (orfl !== undefined && (orfl.IsHole === outRec.IsHole || orfl.Pts === undefined)) {
      orfl = orfl.FirstLeft;
    }
    outRec.FirstLeft = orfl;
  }

  private ExecuteInternal(): boolean {
    try {
      this.Reset();
      this.m_SortedEdges = undefined;
      this.m_Maxima = undefined;

      let botY: long = 0, topY: long = 0;
      const popResult1 = this.PopScanbeamNoOut();
      botY = popResult1.Y;
      if (!popResult1.res) {
        return false;
      }
      this.InsertLocalMinimaIntoAEL(botY);

      const popScanbeamCheck = () => {
        const popResult2 = this.PopScanbeamNoOut();
        topY = popResult2.Y;
        return popResult2.res;
      };

      while (popScanbeamCheck() || this.LocalMinimaPending()) {
        this.ProcessHorizontals();
        this.m_GhostJoins.length = 0;
        if (!this.ProcessIntersections(topY)) {
          return false;
        }
        this.ProcessEdgesAtTopOfScanbeam(topY);
        botY = topY;
        this.InsertLocalMinimaIntoAEL(botY);
      }

      //fix orientations ...
      for (let ii = 0, max = this.m_PolyOuts.length; ii < max; ii++) {
        const outRec = this.m_PolyOuts[ii];
        if (outRec!.Pts === undefined || outRec!.IsOpen) {
          continue;
        }
        if ((outRec!.IsHole !== this.reverseSolution) === (Clipper.AreaOutRec(outRec!) > 0)) {
          Clipper.ReversePolyPtLinks(outRec!.Pts);
        }
      }

      this.JoinCommonEdges();

      for (let ii = 0, max = this.m_PolyOuts.length; ii < max; ii++) {
        const outRec = this.m_PolyOuts[ii];
        if (outRec!.Pts === undefined) {
          //continue; // unneeded
        }
        else if (outRec!.IsOpen) {
          Clipper.FixupOutPolyline(outRec!);
        }
        else {
          this.FixupOutPolygon(outRec!);
        }
      }

      if (this.strictlySimple) {
        this.DoSimplePolygons();
      }
      return true;
    }
      //catch { return false; }
    finally {
      this.m_Joins.length = 0;
      this.m_GhostJoins.length = 0;
    }
  }

  private DisposeAllPolyPts(): void {
    for (let i: int = 0; i < this.m_PolyOuts.length; ++i) {
      this.DisposeOutRec(i);
    }
    this.m_PolyOuts.length = 0;
  }

  private AddJoin(Op1: OutPt, Op2: OutPt, OffPt: IntPoint): void {
    const j = new Join();
    j.OutPt1 = Op1;
    j.OutPt2 = Op2;
    j.OffPt = OffPt;
    this.m_Joins.push(j);
  }

  private AddGhostJoin(Op: OutPt, OffPt: IntPoint): void {
    const j = new Join();
    j.OutPt1 = Op;
    j.OffPt = OffPt;
    this.m_GhostJoins.push(j);
  }

  private SetZImmutable(pt: IntPoint, e1: TEdge, e2: TEdge): IntPoint {
    // this function was modified so rather than mutate the point it returns a new one

    // TODO: this could be optimized by comparing Z !== undefined and creating default points with Z undefined (though then check for .Z! usages)
    if (pt.z !== 0 || this.zFillFunctionImmutable === undefined) return pt;

    let z = 0;
    if (intPointEquals(pt, e1.Bot)) {
      z = e1.Bot.z!;
    }
    else if (intPointEquals(pt, e1.Top)) {
      z = e1.Top.z!;
    }
    else if (intPointEquals(pt, e2.Bot)) {
      z = e2.Bot.z!;
    }
    else if (intPointEquals(pt, e2.Top)) {
      z = e2.Top.z!;
    }
    else {
      z = this.zFillFunctionImmutable(e1.Bot, e1.Top, e2.Bot, e2.Top, pt);
    }

    return newIntPointXYZ(pt.x, pt.y, z);
  }

  private InsertLocalMinimaIntoAEL(botY: long): void {
    let lm: LocalMinima | undefined;

    const popLocalMinimaCheck = () => {
      const popResult2 = this.PopLocalMinimaNoOut(botY);
      lm = popResult2.current;
      return popResult2.res;
    };

    while (popLocalMinimaCheck()) {
      const lb = lm!.LeftBound;
      const rb = lm!.RightBound;

      let Op1: OutPt | undefined;
      if (lb === undefined) {
        this.InsertEdgeIntoAEL(rb!, undefined);
        this.SetWindingCount(rb!);
        if (this.IsContributing(rb!)) {
          Op1 = this.AddOutPt(rb!, rb!.Bot);
        }
      }
      else if (rb === undefined) {
        this.InsertEdgeIntoAEL(lb, undefined);
        this.SetWindingCount(lb);
        if (this.IsContributing(lb)) {
          Op1 = this.AddOutPt(lb, lb.Bot);
        }
        this.InsertScanbeam(lb.Top.y);
      }
      else {
        this.InsertEdgeIntoAEL(lb, undefined);
        this.InsertEdgeIntoAEL(rb, lb);
        this.SetWindingCount(lb);
        rb.WindCnt = lb.WindCnt;
        rb.WindCnt2 = lb.WindCnt2;
        if (this.IsContributing(lb)) {
          Op1 = this.AddLocalMinPoly(lb, rb, lb.Bot);
        }
        this.InsertScanbeam(lb.Top.y);
      }

      if (rb !== undefined) {
        if (Clipper.IsHorizontal(rb)) {
          if (rb.NextInLML !== undefined) {
            this.InsertScanbeam(rb.NextInLML.Top.y);
          }
          this.AddEdgeToSEL(rb);
        }
        else {
          this.InsertScanbeam(rb.Top.y);
        }
      }

      if (lb === undefined || rb === undefined) {
        continue;
      }

      //if output polygons share an Edge with a horizontal rb, they'll need joining later ...
      if (Op1 !== undefined && ClipperBase.IsHorizontal(rb) && this.m_GhostJoins.length > 0 && rb.WindDelta !== 0) {
        for (let i: int = 0; i < this.m_GhostJoins.length; i++) {
          //if the horizontal Rb and a 'ghost' horizontal overlap, then convert
          //the 'ghost' join to a real join ready for later ...
          const j = this.m_GhostJoins[i];
          if (Clipper.HorzSegmentsOverlap(j.OutPt1.Pt.x, j.OffPt.x, rb.Bot.x, rb.Top.x)) {
            this.AddJoin(j.OutPt1, Op1, j.OffPt);
          }
        }
      }

      if (lb.OutIdx >= 0 && lb.PrevInAEL !== undefined &&
        lb.PrevInAEL.Curr.x === lb.Bot.x &&
        lb.PrevInAEL.OutIdx >= 0 &&
        Clipper.IntPoint4SlopesEqual(lb.PrevInAEL.Curr, lb.PrevInAEL.Top, lb.Curr, lb.Top, this.m_UseFullRange) &&
        lb.WindDelta !== 0 && lb.PrevInAEL.WindDelta !== 0) {
        const Op2 = this.AddOutPt(lb.PrevInAEL, lb.Bot);
        this.AddJoin(Op1!, Op2, lb.Top);
      }

      if (lb.NextInAEL !== rb) {
        if (rb.OutIdx >= 0 && rb.PrevInAEL!.OutIdx >= 0 &&
          ClipperBase.IntPoint4SlopesEqual(rb.PrevInAEL!.Curr, rb.PrevInAEL!.Top, rb.Curr, rb.Top, this.m_UseFullRange) &&
          rb.WindDelta !== 0 && rb.PrevInAEL!.WindDelta !== 0) {
          const Op2 = this.AddOutPt(rb.PrevInAEL!, rb.Bot);
          this.AddJoin(Op1!, Op2, rb.Top);
        }

        let e = lb.NextInAEL;
        if (e !== undefined) {
          while (e !== rb) {
            //nb: For calculating winding counts etc, IntersectEdges() assumes
            //that param1 will be to the right of param2 ABOVE the intersection ...
            lb.Curr = this.IntersectEdgesImmutable(rb, e!, lb.Curr); //order important here
            e = e!.NextInAEL;
          }
        }
      }
    }
  }

  private InsertEdgeIntoAEL(edge: TEdge, startEdge: TEdge | undefined): void {
    if (this.m_ActiveEdges === undefined) {
      edge.PrevInAEL = undefined;
      edge.NextInAEL = undefined;
      this.m_ActiveEdges = edge;
    }
    else if (startEdge === undefined && Clipper.E2InsertsBeforeE1(this.m_ActiveEdges, edge)) {
      edge.PrevInAEL = undefined;
      edge.NextInAEL = this.m_ActiveEdges;
      this.m_ActiveEdges.PrevInAEL = edge;
      this.m_ActiveEdges = edge;
    }
    else {
      if (startEdge === undefined) {
        startEdge = this.m_ActiveEdges;
      }
      while (startEdge.NextInAEL !== undefined &&
      !Clipper.E2InsertsBeforeE1(startEdge.NextInAEL, edge)) {
        startEdge = startEdge.NextInAEL;
      }
      edge.NextInAEL = startEdge.NextInAEL;
      if (startEdge.NextInAEL !== undefined) {
        startEdge.NextInAEL.PrevInAEL = edge;
      }
      edge.PrevInAEL = startEdge;
      startEdge.NextInAEL = edge;
    }
  }

  private static E2InsertsBeforeE1(e1: TEdge, e2: TEdge): boolean {
    if (e2.Curr.x === e1.Curr.x) {
      if (e2.Top.y > e1.Top.y) {
        return e2.Top.x < TopX(e1, e2.Top.y);
      }
      else {
        return e1.Top.x > TopX(e2, e1.Top.y);
      }
    }
    else {
      return e2.Curr.x < e1.Curr.x;
    }
  }

  private IsEvenOddFillType(edge: TEdge): boolean {
    if (edge.PolyTyp === PolyType.Subject) {
      return this.m_SubjFillType === PolyFillType.EvenOdd;
    }
    else {
      return this.m_ClipFillType === PolyFillType.EvenOdd;
    }
  }

  private IsEvenOddAltFillType(edge: TEdge): boolean {
    if (edge.PolyTyp === PolyType.Subject) {
      return this.m_ClipFillType === PolyFillType.EvenOdd;
    }
    else {
      return this.m_SubjFillType === PolyFillType.EvenOdd;
    }
  }

  private IsContributing(edge: TEdge): boolean {
    let pft: PolyFillType, pft2: PolyFillType;
    if (edge.PolyTyp === PolyType.Subject) {
      pft = this.m_SubjFillType;
      pft2 = this.m_ClipFillType;
    }
    else {
      pft = this.m_ClipFillType;
      pft2 = this.m_SubjFillType;
    }

    switch (pft) {
      case PolyFillType.EvenOdd:
        //return false if a subj line has been flagged as inside a subj polygon
        if (edge.WindDelta === 0 && edge.WindCnt !== 1) {
          return false;
        }
        break;
      case PolyFillType.NonZero:
        if (Math.abs(edge.WindCnt) !== 1) {
          return false;
        }
        break;
      case PolyFillType.Positive:
        if (edge.WindCnt !== 1) {
          return false;
        }
        break;
      default: //PolyFillType.pftNegative
        if (edge.WindCnt !== -1) {
          return false;
        }
        break;
    }

    switch (this.m_ClipType) {
      case ClipType.Intersection:
        //noinspection NestedSwitchStatementJS
        switch (pft2) {
          case PolyFillType.EvenOdd:
          case PolyFillType.NonZero:
            return edge.WindCnt2 !== 0;
          case PolyFillType.Positive:
            return edge.WindCnt2 > 0;
          default:
            return edge.WindCnt2 < 0;
        }
      case ClipType.Union:
        //noinspection NestedSwitchStatementJS
        switch (pft2) {
          case PolyFillType.EvenOdd:
          case PolyFillType.NonZero:
            return edge.WindCnt2 === 0;
          case PolyFillType.Positive:
            return edge.WindCnt2 <= 0;
          default:
            return edge.WindCnt2 >= 0;
        }
      case ClipType.Difference:
        if (edge.PolyTyp === PolyType.Subject) {
          //noinspection NestedSwitchStatementJS
          switch (pft2) {
            case PolyFillType.EvenOdd:
            case PolyFillType.NonZero:
              return edge.WindCnt2 === 0;
            case PolyFillType.Positive:
              return edge.WindCnt2 <= 0;
            default:
              return edge.WindCnt2 >= 0;
          }
        }
        else {
          //noinspection NestedSwitchStatementJS
          switch (pft2) {
            case PolyFillType.EvenOdd:
            case PolyFillType.NonZero:
              return edge.WindCnt2 !== 0;
            case PolyFillType.Positive:
              return edge.WindCnt2 > 0;
            default:
              return edge.WindCnt2 < 0;
          }
        }
      case ClipType.Xor:
        if (edge.WindDelta === 0) { //XOr always contributing unless open
          //noinspection NestedSwitchStatementJS
          switch (pft2) {
            case PolyFillType.EvenOdd:
            case PolyFillType.NonZero:
              return edge.WindCnt2 === 0;
            case PolyFillType.Positive:
              return edge.WindCnt2 <= 0;
            default:
              return edge.WindCnt2 >= 0;
          }
        }
        else {
          return true;
        }
      default:
        break;
    }
    return true;
  }

  private SetWindingCount(edge: TEdge): void {
    let e = edge.PrevInAEL;
    //find the edge of the same polytype that immediately preceeds 'edge' in AEL
    while (e !== undefined && (e.PolyTyp !== edge.PolyTyp || e.WindDelta === 0)) {
      e = e.PrevInAEL;
    }
    if (e === undefined) {
      const pft = edge.PolyTyp === PolyType.Subject ? this.m_SubjFillType : this.m_ClipFillType;
      if (edge.WindDelta === 0) {
        edge.WindCnt = pft === PolyFillType.Negative ? -1 : 1;
      }
      else {
        edge.WindCnt = edge.WindDelta;
      }
      edge.WindCnt2 = 0;
      e = this.m_ActiveEdges; //ie get ready to calc WindCnt2
    }
    else if (edge.WindDelta === 0 && this.m_ClipType !== ClipType.Union) {
      edge.WindCnt = 1;
      edge.WindCnt2 = e.WindCnt2;
      e = e.NextInAEL; //ie get ready to calc WindCnt2
    }
    else if (this.IsEvenOddFillType(edge)) {
      //EvenOdd filling ...
      if (edge.WindDelta === 0) {
        //are we inside a subj polygon ...
        let Inside = true;
        let e2 = e.PrevInAEL;
        while (e2 !== undefined) {
          if (e2.PolyTyp === e.PolyTyp && e2.WindDelta !== 0) {
            Inside = !Inside;
          }
          e2 = e2.PrevInAEL;
        }
        edge.WindCnt = Inside ? 0 : 1;
      }
      else {
        edge.WindCnt = edge.WindDelta;
      }
      edge.WindCnt2 = e.WindCnt2;
      e = e.NextInAEL; //ie get ready to calc WindCnt2
    }
    else {
      //nonZero, Positive or Negative filling ...
      if (e.WindCnt * e.WindDelta < 0) {
        //prev edge is 'decreasing' WindCount (WC) toward zero
        //so we're outside the previous polygon ...
        if (Math.abs(e.WindCnt) > 1) {
          //outside prev poly but still inside another.
          //when reversing direction of prev poly use the same WC
          if (e.WindDelta * edge.WindDelta < 0) {
            edge.WindCnt = e.WindCnt;
          }
          //otherwise continue to 'decrease' WC ...
          else {
            edge.WindCnt = e.WindCnt + edge.WindDelta;
          }
        }
        else {
          //now outside all polys of same polytype so set own WC ...
          edge.WindCnt = edge.WindDelta === 0 ? 1 : edge.WindDelta;
        }
      }
      else {
        //prev edge is 'increasing' WindCount (WC) away from zero
        //so we're inside the previous polygon ...
        if (edge.WindDelta === 0) {
          edge.WindCnt = e.WindCnt < 0 ? e.WindCnt - 1 : e.WindCnt + 1;
        }
        //if wind direction is reversing prev then use same WC
        else if (e.WindDelta * edge.WindDelta < 0) {
          edge.WindCnt = e.WindCnt;
        }
        //otherwise add to WC ...
        else {
          edge.WindCnt = e.WindCnt + edge.WindDelta;
        }
      }
      edge.WindCnt2 = e.WindCnt2;
      e = e.NextInAEL; //ie get ready to calc WindCnt2
    }

    //update WindCnt2 ...
    if (this.IsEvenOddAltFillType(edge)) {
      //EvenOdd filling ...
      while (e !== edge) {
        if (e!.WindDelta !== 0) {
          edge.WindCnt2 = edge.WindCnt2 === 0 ? 1 : 0;
        }
        e = e!.NextInAEL;
      }
    }
    else {
      //nonZero, Positive or Negative filling ...
      while (e !== edge) {
        edge.WindCnt2 += e!.WindDelta;
        e = e!.NextInAEL;
      }
    }
  }

  private AddEdgeToSEL(edge: TEdge): void {
    //SEL pointers in PEdge are use to build transient lists of horizontal edges.
    //However, since we don't need to worry about processing order, all additions
    //are made to the front of the list ...
    if (this.m_SortedEdges === undefined) {
      this.m_SortedEdges = edge;
      edge.PrevInSEL = undefined;
      edge.NextInSEL = undefined;
    }
    else {
      edge.NextInSEL = this.m_SortedEdges;
      edge.PrevInSEL = undefined;
      this.m_SortedEdges.PrevInSEL = edge;
      this.m_SortedEdges = edge;
    }
  }

  private PopEdgeFromSelNoOut(): { e: TEdge | undefined, res: boolean } { // out e -> return { res, e }
    //Pop edge from front of SEL (ie SEL is a FILO list)
    const e = this.m_SortedEdges;
    if (e === undefined) {
      return { res: false, e: e };
    }
    const oldE = e;
    this.m_SortedEdges = e.NextInSEL;
    if (this.m_SortedEdges !== undefined) {
      this.m_SortedEdges.PrevInSEL = undefined;
    }
    oldE.NextInSEL = undefined;
    oldE.PrevInSEL = undefined;
    return { res: true, e: e };
  }

  protected CopyAELToSEL(): void {
    let e = this.m_ActiveEdges;
    this.m_SortedEdges = e;
    while (e !== undefined) {
      e.PrevInSEL = e.PrevInAEL;
      e.NextInSEL = e.NextInAEL;
      e = e.NextInAEL;
    }
  }

  private SwapPositionsInSEL(edge1: TEdge, edge2: TEdge): void {
    if (edge1.NextInSEL === undefined && edge1.PrevInSEL === undefined) {
      return;
    }
    if (edge2.NextInSEL === undefined && edge2.PrevInSEL === undefined) {
      return;
    }

    if (edge1.NextInSEL === edge2) {
      const next = edge2.NextInSEL;
      if (next !== undefined) {
        next.PrevInSEL = edge1;
      }
      const prev = edge1.PrevInSEL;
      if (prev !== undefined) {
        prev.NextInSEL = edge2;
      }
      edge2.PrevInSEL = prev;
      edge2.NextInSEL = edge1;
      edge1.PrevInSEL = edge2;
      edge1.NextInSEL = next;
    }
    else if (edge2.NextInSEL === edge1) {
      const next = edge1.NextInSEL;
      if (next !== undefined) {
        next.PrevInSEL = edge2;
      }
      const prev = edge2.PrevInSEL;
      if (prev !== undefined) {
        prev.NextInSEL = edge1;
      }
      edge1.PrevInSEL = prev;
      edge1.NextInSEL = edge2;
      edge2.PrevInSEL = edge1;
      edge2.NextInSEL = next;
    }
    else {
      const next = edge1.NextInSEL;
      const prev = edge1.PrevInSEL;
      edge1.NextInSEL = edge2.NextInSEL;
      if (edge1.NextInSEL !== undefined) {
        edge1.NextInSEL.PrevInSEL = edge1;
      }
      edge1.PrevInSEL = edge2.PrevInSEL;
      if (edge1.PrevInSEL !== undefined) {
        edge1.PrevInSEL.NextInSEL = edge1;
      }
      edge2.NextInSEL = next;
      if (edge2.NextInSEL !== undefined) {
        edge2.NextInSEL.PrevInSEL = edge2;
      }
      edge2.PrevInSEL = prev;
      if (edge2.PrevInSEL !== undefined) {
        edge2.PrevInSEL.NextInSEL = edge2;
      }
    }

    if (edge1.PrevInSEL === undefined) {
      this.m_SortedEdges = edge1;
    }
    else if (edge2.PrevInSEL === undefined) {
      this.m_SortedEdges = edge2;
    }
  }

  private AddLocalMaxPoly(e1: TEdge, e2: TEdge, pt: IntPoint) {
    this.AddOutPt(e1, pt);
    if (e2.WindDelta === 0) {
      this.AddOutPt(e2, pt);
    }
    if (e1.OutIdx === e2.OutIdx) {
      e1.OutIdx = Unassigned;
      e2.OutIdx = Unassigned;
    }
    else if (e1.OutIdx < e2.OutIdx) {
      this.AppendPolygon(e1, e2);
    }
    else {
      this.AppendPolygon(e2, e1);
    }
  }

  private AddLocalMinPoly(e1: TEdge, e2: TEdge, pt: IntPoint): OutPt | undefined {
    let result: OutPt | undefined;
    let e: TEdge | undefined, prevE: TEdge | undefined;
    if (ClipperBase.IsHorizontal(e2) || e1.Dx > e2.Dx) {
      result = this.AddOutPt(e1, pt);
      e2.OutIdx = e1.OutIdx;
      e1.Side = EdgeSide.esLeft;
      e2.Side = EdgeSide.esRight;
      e = e1;
      if (e.PrevInAEL === e2) {
        prevE = e2.PrevInAEL;
      }
      else {
        prevE = e.PrevInAEL;
      }
    }
    else {
      result = this.AddOutPt(e2, pt);
      e1.OutIdx = e2.OutIdx;
      e1.Side = EdgeSide.esRight;
      e2.Side = EdgeSide.esLeft;
      e = e2;
      if (e.PrevInAEL === e1) {
        prevE = e1.PrevInAEL;
      }
      else {
        prevE = e.PrevInAEL;
      }
    }

    if (prevE !== undefined && prevE.OutIdx >= 0 && prevE.Top.y < pt.y && e.Top.y < pt.y) {
      const xPrev = TopX(prevE, pt.y);
      const xE = TopX(e, pt.y);
      if (xPrev === xE && e.WindDelta !== 0 && prevE.WindDelta !== 0 &&
        ClipperBase.IntPoint4SlopesEqual(this.newIntPoint(xPrev, pt.y), prevE.Top, this.newIntPoint(xE, pt.y), e.Top, this.m_UseFullRange)) {
        const outPt = this.AddOutPt(prevE, pt);
        this.AddJoin(result!, outPt, e.Top);
      }
    }
    return result;
  }

  private AddOutPt(e: TEdge, pt: IntPoint): OutPt {
    if (e.OutIdx < 0) {
      const outRec = this.CreateOutRec();
      outRec.IsOpen = e.WindDelta === 0;
      const newOp = new OutPt();
      outRec.Pts = newOp;
      newOp.Idx = outRec.Idx;
      newOp.Pt = pt;
      newOp.Next = newOp;
      newOp.Prev = newOp;
      if (!outRec.IsOpen) {
        this.SetHoleState(e, outRec);
      }
      e.OutIdx = outRec.Idx; //nb: do this after SetZ !
      return newOp;
    }
    else {
      const outRec = this.m_PolyOuts[e.OutIdx];
      //OutRec.Pts is the 'Left-most' point & OutRec.Pts.Prev is the 'Right-most'
      const op = outRec!.Pts;
      const ToFront = e.Side === EdgeSide.esLeft;
      if (ToFront && intPointEquals(pt, op!.Pt)) {
        return op!;
      }
      else if (!ToFront && intPointEquals(pt, op!.Prev.Pt)) {
        return op!.Prev;
      }

      const newOp = new OutPt();
      newOp.Idx = outRec!.Idx;
      newOp.Pt = pt;
      newOp.Next = op!;
      newOp.Prev = op!.Prev;
      newOp.Prev.Next = newOp;
      op!.Prev = newOp;
      if (ToFront) {
        outRec!.Pts = newOp;
      }
      return newOp;
    }
  }

  private GetLastOutPt(e: TEdge): OutPt | undefined {
    const outRec = this.m_PolyOuts[e.OutIdx];
    if (e.Side === EdgeSide.esLeft) {
      return outRec!.Pts;
    }
    else {
      return outRec!.Pts!.Prev;
    }
  }

  private static HorzSegmentsOverlap(seg1a: long, seg1b: long, seg2a: long, seg2b: long): boolean {
    if (seg1a > seg1b) {
      const tmp = seg1a;
      seg1a = seg1b;
      seg1b = tmp;
    }
    if (seg2a > seg2b) {
      const tmp = seg2a;
      seg2a = seg2b;
      seg2b = tmp;
    }
    return seg1a < seg2b && seg2a < seg1b;
  }

  private SetHoleState(e: TEdge, outRec: OutRec): void {
    let e2 = e.PrevInAEL;
    let eTmp: TEdge | undefined;
    while (e2 !== undefined) {
      if (e2.OutIdx >= 0 && e2.WindDelta !== 0) {
        if (eTmp === undefined) {
          eTmp = e2;
        }
        else if (eTmp.OutIdx === e2.OutIdx) {
          eTmp = undefined; //paired
        }
      }
      e2 = e2.PrevInAEL;
    }

    if (eTmp === undefined) {
      outRec.FirstLeft = undefined;
      outRec.IsHole = false;
    }
    else {
      outRec.FirstLeft = this.m_PolyOuts[eTmp.OutIdx];
      outRec.IsHole = !outRec!.FirstLeft!.IsHole;
    }
  }

  private static GetDx(pt1: IntPoint, pt2: IntPoint): double {
    if (pt1.y === pt2.y) {
      return horizontal;
    }
    else {
      return (pt2.x - pt1.x) / (pt2.y - pt1.y);
    }
  }

  private static FirstIsBottomPt(btmPt1: OutPt, btmPt2: OutPt): boolean {
    let p = btmPt1.Prev;
    while (intPointEquals(p!.Pt, btmPt1.Pt) && p !== btmPt1) {
      p = p!.Prev;
    }
    const dx1p = Math.abs(Clipper.GetDx(btmPt1.Pt, p!.Pt));
    p = btmPt1.Next;
    while (intPointEquals(p!.Pt, btmPt1.Pt) && p !== btmPt1) {
      p = p!.Next;
    }
    const dx1n = Math.abs(Clipper.GetDx(btmPt1.Pt, p!.Pt));

    p = btmPt2.Prev;
    while (intPointEquals(p!.Pt, btmPt2.Pt) && p !== btmPt2) {
      p = p!.Prev;
    }
    const dx2p = Math.abs(Clipper.GetDx(btmPt2.Pt, p!.Pt));
    p = btmPt2.Next;
    while (intPointEquals(p!.Pt, btmPt2.Pt) && p !== btmPt2) {
      p = p!.Next;
    }
    const dx2n = Math.abs(Clipper.GetDx(btmPt2.Pt, p!.Pt));

    if (Math.max(dx1p, dx1n) === Math.max(dx2p, dx2n) &&
      Math.min(dx1p, dx1n) === Math.min(dx2p, dx2n)) {
      return Clipper.AreaOutPt(btmPt1) > 0; //if otherwise identical use orientation
    }
    else {
      return dx1p >= dx2p && dx1p >= dx2n || dx1n >= dx2p && dx1n >= dx2n;
    }
  }

  private static GetBottomPt(pp: OutPt): OutPt {
    let dups: OutPt | undefined;
    let p = pp.Next;
    while (p !== pp) {
      if (p!.Pt.y > pp.Pt.y) {
        pp = p!;
        dups = undefined;
      }
      else if (p!.Pt.y === pp.Pt.y && p!.Pt.x <= pp.Pt.x) {
        if (p.Pt.x < pp.Pt.x) {
          dups = undefined;
          pp = p!;
        }
        else {
          if (p!.Next !== pp && p!.Prev !== pp) {
            dups = p;
          }
        }
      }
      p = p!.Next;
    }
    if (dups !== undefined) {
      //there appears to be at least 2 vertices at bottomPt so ...
      while (dups !== p) {
        if (!Clipper.FirstIsBottomPt(p, dups!)) {
          pp = dups!;
        }
        dups = dups!.Next;
        while (!intPointEquals(dups!.Pt, pp.Pt)) {
          dups = dups!.Next;
        }
      }
    }
    return pp;
  }

  private static GetLowermostRec(outRec1: OutRec, outRec2: OutRec): OutRec {
    //work out which polygon fragment has the correct hole state ...
    if (outRec1.BottomPt === undefined) {
      outRec1.BottomPt = Clipper.GetBottomPt(outRec1.Pts!);
    }
    if (outRec2.BottomPt === undefined) {
      outRec2.BottomPt = Clipper.GetBottomPt(outRec2.Pts!);
    }
    const bPt1 = outRec1.BottomPt;
    const bPt2 = outRec2.BottomPt;
    if (bPt1.Pt.y > bPt2.Pt.y) {
      return outRec1;
    }
    else if (bPt1.Pt.y < bPt2.Pt.y) {
      return outRec2;
    }
    else if (bPt1.Pt.x < bPt2.Pt.x) {
      return outRec1;
    }
    else if (bPt1.Pt.x > bPt2.Pt.x) {
      return outRec2;
    }
    else if (bPt1.Next === bPt1) {
      return outRec2;
    }
    else if (bPt2.Next === bPt2) {
      return outRec1;
    }
    else if (Clipper.FirstIsBottomPt(bPt1, bPt2)) {
      return outRec1;
    }
    else {
      return outRec2;
    }
  }

  private static OutRec1RightOfOutRec2(outRec1: OutRec, outRec2: OutRec): boolean {
    do {
      outRec1 = outRec1.FirstLeft!;
      if (outRec1 === outRec2) {
        return true;
      }
    } while (outRec1 !== undefined);
    return false;
  }

  private GetOutRec(idx: int) {
    let outrec = this.m_PolyOuts[idx]!;
    while (outrec !== this.m_PolyOuts[outrec.Idx]) {
      outrec = this.m_PolyOuts[outrec.Idx]!;
    }
    return outrec;
  }

  private AppendPolygon(e1: TEdge, e2: TEdge): void {
    const outRec1 = this.m_PolyOuts[e1.OutIdx]!;
    const outRec2 = this.m_PolyOuts[e2.OutIdx]!;

    let holeStateRec: OutRec | undefined;
    if (Clipper.OutRec1RightOfOutRec2(outRec1, outRec2)) {
      holeStateRec = outRec2;
    }
    else if (Clipper.OutRec1RightOfOutRec2(outRec2, outRec1)) {
      holeStateRec = outRec1;
    }
    else {
      holeStateRec = Clipper.GetLowermostRec(outRec1, outRec2);
    }

    //get the start and ends of both output polygons and
    //join E2 poly onto E1 poly and delete pointers to E2 ...
    const p1_lft = outRec1!.Pts!;
    const p1_rt = p1_lft!.Prev;
    const p2_lft = outRec2!.Pts!;
    const p2_rt = p2_lft!.Prev;

    //join e2 poly onto e1 poly and delete pointers to e2 ...
    if (e1.Side === EdgeSide.esLeft) {
      if (e2.Side === EdgeSide.esLeft) {
        //z y x a b c
        Clipper.ReversePolyPtLinks(p2_lft);
        p2_lft.Next = p1_lft;
        p1_lft.Prev = p2_lft;
        p1_rt.Next = p2_rt;
        p2_rt.Prev = p1_rt;
        outRec1.Pts = p2_rt;
      }
      else {
        //x y z a b c
        p2_rt.Next = p1_lft;
        p1_lft.Prev = p2_rt;
        p2_lft.Prev = p1_rt;
        p1_rt.Next = p2_lft;
        outRec1.Pts = p2_lft;
      }
    }
    else {
      if (e2.Side === EdgeSide.esRight) {
        //a b c z y x
        Clipper.ReversePolyPtLinks(p2_lft);
        p1_rt.Next = p2_rt;
        p2_rt.Prev = p1_rt;
        p2_lft.Next = p1_lft;
        p1_lft.Prev = p2_lft;
      }
      else {
        //a b c x y z
        p1_rt.Next = p2_lft;
        p2_lft.Prev = p1_rt;
        p1_lft.Prev = p2_rt;
        p2_rt.Next = p1_lft;
      }
    }

    outRec1.BottomPt = undefined;
    if (holeStateRec === outRec2) {
      if (outRec2.FirstLeft !== outRec1) {
        outRec1.FirstLeft = outRec2.FirstLeft;
      }
      outRec1.IsHole = outRec2.IsHole;
    }
    outRec2.Pts = undefined;
    outRec2.BottomPt = undefined;

    outRec2.FirstLeft = outRec1;

    const OKIdx = e1.OutIdx;
    const ObsoleteIdx = e2.OutIdx;

    e1.OutIdx = Unassigned; //nb: safe because we only get here via AddLocalMaxPoly
    e2.OutIdx = Unassigned;

    let e = this.m_ActiveEdges;
    while (e !== undefined) {
      if (e.OutIdx === ObsoleteIdx) {
        e.OutIdx = OKIdx;
        e.Side = e1.Side;
        break;
      }
      e = e.NextInAEL;
    }
    outRec2.Idx = outRec1.Idx;
  }

  private static ReversePolyPtLinks(pp: OutPt | undefined): void {
    if (pp === undefined) {
      return;
    }
    let pp1: OutPt | undefined;
    let pp2: OutPt | undefined;
    pp1 = pp;
    do {
      pp2 = pp1!.Next;
      pp1!.Next = pp1!.Prev;
      pp1!.Prev = pp2;
      pp1 = pp2;
    } while (pp1 !== pp);
  }

  private static SwapSides(edge1: TEdge, edge2: TEdge ): void {
    const side = edge1.Side;
    edge1.Side = edge2.Side;
    edge2.Side = side;
  }

  private static SwapPolyIndexes(edge1: TEdge, edge2: TEdge): void {
    const outIdx = edge1.OutIdx;
    edge1.OutIdx = edge2.OutIdx;
    edge2.OutIdx = outIdx;
  }

  private IntersectEdgesImmutable(e1: TEdge, e2: TEdge, pt: IntPoint): IntPoint {
    // this function was changed so pt was not mutated but rather returned a new copy

    //e1 will be to the left of e2 BELOW the intersection. Therefore e1 is before
    //e2 in AEL except when e1 is being inserted at the intersection point ...

    const e1Contributing = e1.OutIdx >= 0;
    const e2Contributing = e2.OutIdx >= 0;

    if (this.useXyz) {
      pt = this.SetZImmutable(pt, e1, e2);
    }

    if (this.useLines) {
      //if either edge is on an OPEN path ...
      if (e1.WindDelta === 0 || e2.WindDelta === 0) {
        //ignore subject-subject open path intersections UNLESS they
        //are both open paths, AND they are both 'contributing maximas' ...
        if (e1.WindDelta === 0 && e2.WindDelta === 0) {
          return pt;
        }
        //if intersecting a subj line with a subj poly ...
        else if (e1.PolyTyp === e2.PolyTyp &&
          e1.WindDelta !== e2.WindDelta && this.m_ClipType === ClipType.Union) {
          if (e1.WindDelta === 0) {
            if (e2Contributing) {
              this.AddOutPt(e1, pt);
              if (e1Contributing) {
                e1.OutIdx = Unassigned;
              }
            }
          }
          else {
            if (e1Contributing) {
              this.AddOutPt(e2, pt);
              if (e2Contributing) {
                e2.OutIdx = Unassigned;
              }
            }
          }
        }
        else if (e1.PolyTyp !== e2.PolyTyp) {
          if (e1.WindDelta === 0 && Math.abs(e2.WindCnt) === 1 &&
            (this.m_ClipType !== ClipType.Union || e2.WindCnt2 === 0)) {
            this.AddOutPt(e1, pt);
            if (e1Contributing) {
              e1.OutIdx = Unassigned;
            }
          }
          else if (e2.WindDelta === 0 && Math.abs(e1.WindCnt) === 1 &&
            (this.m_ClipType !== ClipType.Union || e1.WindCnt2 === 0)) {
            this.AddOutPt(e2, pt);
            if (e2Contributing) {
              e2.OutIdx = Unassigned;
            }
          }
        }
        return pt;
      }
    }

    //update winding counts...
    //assumes that e1 will be to the Right of e2 ABOVE the intersection
    if (e1.PolyTyp === e2.PolyTyp) {
      if (this.IsEvenOddFillType(e1)) {
        const oldE1WindCnt = e1.WindCnt;
        e1.WindCnt = e2.WindCnt;
        e2.WindCnt = oldE1WindCnt;
      }
      else {
        if (e1.WindCnt + e2.WindDelta === 0) {
          e1.WindCnt = -e1.WindCnt;
        }
        else {
          e1.WindCnt += e2.WindDelta;
        }
        if (e2.WindCnt - e1.WindDelta === 0) {
          e2.WindCnt = -e2.WindCnt;
        }
        else {
          e2.WindCnt -= e1.WindDelta;
        }
      }
    }
    else {
      if (!this.IsEvenOddFillType(e2)) {
        e1.WindCnt2 += e2.WindDelta;
      }
      else {
        e1.WindCnt2 = e1.WindCnt2 === 0 ? 1 : 0;
      }
      if (!this.IsEvenOddFillType(e1)) {
        e2.WindCnt2 -= e1.WindDelta;
      }
      else {
        e2.WindCnt2 = e2.WindCnt2 === 0 ? 1 : 0;
      }
    }

    let e1FillType = PolyFillType.EvenOdd, e2FillType = PolyFillType.EvenOdd, e1FillType2 = PolyFillType.EvenOdd, e2FillType2 = PolyFillType.EvenOdd;
    if (e1.PolyTyp === PolyType.Subject) {
      e1FillType = this.m_SubjFillType;
      e1FillType2 = this.m_ClipFillType;
    }
    else {
      e1FillType = this.m_ClipFillType;
      e1FillType2 = this.m_SubjFillType;
    }
    if (e2.PolyTyp === PolyType.Subject) {
      e2FillType = this.m_SubjFillType;
      e2FillType2 = this.m_ClipFillType;
    }
    else {
      e2FillType = this.m_ClipFillType;
      e2FillType2 = this.m_SubjFillType;
    }

    let e1Wc: int = 0, e2Wc: int = 0;
    switch (e1FillType) {
      case PolyFillType.Positive:
        e1Wc = e1.WindCnt;
        break;
      case PolyFillType.Negative:
        e1Wc = -e1.WindCnt;
        break;
      default:
        e1Wc = Math.abs(e1.WindCnt);
        break;
    }
    switch (e2FillType) {
      case PolyFillType.Positive:
        e2Wc = e2.WindCnt;
        break;
      case PolyFillType.Negative:
        e2Wc = -e2.WindCnt;
        break;
      default:
        e2Wc = Math.abs(e2.WindCnt);
        break;
    }

    if (e1Contributing && e2Contributing) {
      if (e1Wc !== 0 && e1Wc !== 1 || e2Wc !== 0 && e2Wc !== 1 ||
        e1.PolyTyp !== e2.PolyTyp && this.m_ClipType !== ClipType.Xor) {
        this.AddLocalMaxPoly(e1, e2, pt);
      }
      else {
        this.AddOutPt(e1, pt);
        this.AddOutPt(e2, pt);
        Clipper.SwapSides(e1, e2);
        Clipper.SwapPolyIndexes(e1, e2);
      }
    }
    else if (e1Contributing) {
      if (e2Wc === 0 || e2Wc === 1) {
        this.AddOutPt(e1, pt);
        Clipper.SwapSides(e1, e2);
        Clipper.SwapPolyIndexes(e1, e2);
      }
    }
    else if (e2Contributing) {
      if (e1Wc === 0 || e1Wc === 1) {
        this.AddOutPt(e2, pt);
        Clipper.SwapSides(e1, e2);
        Clipper.SwapPolyIndexes(e1, e2);
      }
    }
    else if ((e1Wc === 0 || e1Wc === 1) && (e2Wc === 0 || e2Wc === 1)) {
      //neither edge is currently contributing ...
      let e1Wc2: long = 0, e2Wc2: long = 0;
      switch (e1FillType2) {
        case PolyFillType.Positive:
          e1Wc2 = e1.WindCnt2;
          break;
        case PolyFillType.Negative:
          e1Wc2 = -e1.WindCnt2;
          break;
        default:
          e1Wc2 = Math.abs(e1.WindCnt2);
          break;
      }
      switch (e2FillType2) {
        case PolyFillType.Positive:
          e2Wc2 = e2.WindCnt2;
          break;
        case PolyFillType.Negative:
          e2Wc2 = -e2.WindCnt2;
          break;
        default:
          e2Wc2 = Math.abs(e2.WindCnt2);
          break;
      }

      if (e1.PolyTyp !== e2.PolyTyp) {
        this.AddLocalMinPoly(e1, e2, pt);
      }
      else if (e1Wc === 1 && e2Wc === 1) {
        switch (this.m_ClipType) {
          case ClipType.Intersection:
            if (e1Wc2 > 0 && e2Wc2 > 0) {
              this.AddLocalMinPoly(e1, e2, pt);
            }
            break;
          case ClipType.Union:
            if (e1Wc2 <= 0 && e2Wc2 <= 0) {
              this.AddLocalMinPoly(e1, e2, pt);
            }
            break;
          case ClipType.Difference:
            if (e1.PolyTyp === PolyType.Clip && e1Wc2 > 0 && e2Wc2 > 0 ||
              e1.PolyTyp === PolyType.Subject && e1Wc2 <= 0 && e2Wc2 <= 0) {
              this.AddLocalMinPoly(e1, e2, pt);
            }
            break;
          case ClipType.Xor:
            this.AddLocalMinPoly(e1, e2, pt);
            break;
          default:
            break;
        }
      }
      else {
        Clipper.SwapSides(e1, e2);
      }
    }

    return pt;
  }

  //noinspection JSUnusedLocalSymbols
  private DeleteFromSEL(e: TEdge): void { // unused on the original
    const SelPrev = e.PrevInSEL;
    const SelNext = e.NextInSEL;
    if (SelPrev === undefined && SelNext === undefined && e !== this.m_SortedEdges) {
      return; //already deleted
    }
    if (SelPrev !== undefined) {
      SelPrev.NextInSEL = SelNext;
    }
    else {
      this.m_SortedEdges = SelNext;
    }
    if (SelNext !== undefined) {
      SelNext.PrevInSEL = SelPrev;
    }
    e.NextInSEL = undefined;
    e.PrevInSEL = undefined;
  }

  private ProcessHorizontals(): void {
    let horzEdge: TEdge | undefined; //m_SortedEdges;

    const popEdgeCheck = () => {
      const popRes = this.PopEdgeFromSelNoOut();
      horzEdge = popRes.e;
      return popRes.res;
    };

    while (popEdgeCheck()) {
      this.ProcessHorizontal(horzEdge!);
    }
  }

  private static GetHorzDirectionNoOut(HorzEdge: TEdge): { Dir: Direction, Left: long, Right: long } { // out Dir, out Left, out Right -> {Dir, Left, Right}
    if (HorzEdge.Bot.x < HorzEdge.Top.x) {
      return {
        Left: HorzEdge.Bot.x,
        Right: HorzEdge.Top.x,
        Dir: Direction.dLeftToRight,
      };
    }
    else {
      return {
        Left: HorzEdge.Top.x,
        Right: HorzEdge.Bot.x,
        Dir: Direction.dRightToLeft,
      };
    }
  }

  private ProcessHorizontal(horzEdge: TEdge): void {
    const IsOpen = horzEdge.WindDelta === 0;
    let {Dir: dir, Left: horzLeft, Right: horzRight} = Clipper.GetHorzDirectionNoOut(horzEdge);

    let eLastHorz = horzEdge, eMaxPair: TEdge | undefined;
    while (eLastHorz.NextInLML !== undefined && Clipper.IsHorizontal(eLastHorz.NextInLML)) {
      eLastHorz = eLastHorz.NextInLML;
    }
    if (eLastHorz.NextInLML === undefined) {
      eMaxPair = Clipper.GetMaximaPair(eLastHorz);
    }

    let currMax = this.m_Maxima;
    if (currMax !== undefined) {
      //get the first maxima in range (X) ...
      if (dir === Direction.dLeftToRight) {
        while (currMax !== undefined && currMax.X <= horzEdge.Bot.x) {
          currMax = currMax.Next;
        }
        if (currMax !== undefined && currMax.X >= eLastHorz.Top.x) {
          currMax = undefined;
        }
      }
      else {
        while (currMax.Next !== undefined && currMax.Next.X < horzEdge.Bot.x) {
          currMax = currMax.Next;
        }
        if (currMax.X <= eLastHorz.Top.x) {
          currMax = undefined;
        }
      }
    }

    let op1: OutPt | undefined;
    while (true) { //loop through consec. horizontal edges
      const IsLastHorz = horzEdge === eLastHorz;
      let e: TEdge | undefined = Clipper.GetNextInAEL(horzEdge, dir);
      while (e !== undefined) {
        //this code block inserts extra coords into horizontal edges (in output
        //polygons) whereever maxima touch these horizontal edges. This helps
        //'simplifying' polygons (ie if the Simplify property is set).
        if (currMax !== undefined) {
          if (dir === Direction.dLeftToRight) {
            while (currMax !== undefined && currMax.X < e.Curr.x) {
              if (horzEdge.OutIdx >= 0 && !IsOpen) {
                this.AddOutPt(horzEdge, this.newIntPoint(currMax.X, horzEdge.Bot.y));
              }
              currMax = currMax.Next;
            }
          }
          else {
            while (currMax !== undefined && currMax.X > e.Curr.x) {
              if (horzEdge.OutIdx >= 0 && !IsOpen) {
                this.AddOutPt(horzEdge, this.newIntPoint(currMax.X, horzEdge.Bot.y));
              }
              currMax = currMax.Prev;
            }
          }
        }

        if (dir === Direction.dLeftToRight && e.Curr.x > horzRight ||
          dir === Direction.dRightToLeft && e.Curr.x < horzLeft) {
          break;
        }

        //Also break if we've got to the end of an intermediate horizontal edge ...
        //nb: Smaller Dx's are to the right of larger Dx's ABOVE the horizontal.
        if (e.Curr.x === horzEdge.Top.x && horzEdge.NextInLML !== undefined &&
          e.Dx < horzEdge.NextInLML.Dx) {
          break;
        }

        if (horzEdge.OutIdx >= 0 && !IsOpen) { //note: may be done multiple times
          if (this.useXyz) {
            if (dir === Direction.dLeftToRight) {
              e.Curr = this.SetZImmutable(e.Curr, horzEdge, e);
            }
            else {
              e.Curr = this.SetZImmutable(e.Curr, e, horzEdge);
            }
          }

          op1 = this.AddOutPt(horzEdge, e.Curr);
          let eNextHorz = this.m_SortedEdges;
          while (eNextHorz !== undefined) {
            if (eNextHorz.OutIdx >= 0 && Clipper.HorzSegmentsOverlap(horzEdge.Bot.x,
                horzEdge.Top.x, eNextHorz.Bot.x, eNextHorz.Top.x)) {
              const op2 = this.GetLastOutPt(eNextHorz);
              this.AddJoin(op2!, op1, eNextHorz.Top);
            }
            eNextHorz = eNextHorz.NextInSEL;
          }
          this.AddGhostJoin(op1, horzEdge.Bot);
        }

        //OK, so far we're still in range of the horizontal Edge  but make sure
        //we're at the last of consec. horizontals when matching with eMaxPair
        if (e === eMaxPair && IsLastHorz) {
          if (horzEdge.OutIdx >= 0) {
            this.AddLocalMaxPoly(horzEdge, eMaxPair!, horzEdge.Top);
          }
          this.DeleteFromAEL(horzEdge);
          this.DeleteFromAEL(eMaxPair!);
          return;
        }

        if (dir === Direction.dLeftToRight) {
          const Pt = this.newIntPoint(e.Curr.x, horzEdge.Curr.y);
          // no need to save Pt = since we don't care about the new Z value
          this.IntersectEdgesImmutable(horzEdge, e, Pt);
        }
        else {
          const Pt = this.newIntPoint(e.Curr.x, horzEdge.Curr.y);
          // no need to save Pt = since we don't care about the new Z value
          this.IntersectEdgesImmutable(e, horzEdge, Pt);
        }
        const eNext = Clipper.GetNextInAEL(e, dir);
        this.SwapPositionsInAEL(horzEdge, e);
        e = eNext;
      } //end while(e !== undefined)

      //Break out of loop if HorzEdge.NextInLML is not also horizontal ...
      if (horzEdge.NextInLML === undefined || !Clipper.IsHorizontal(horzEdge.NextInLML)) {
        break;
      }

      horzEdge = this.UpdateEdgeIntoAELNoRef(horzEdge);
      if (horzEdge.OutIdx >= 0) {
        this.AddOutPt(horzEdge, horzEdge.Bot);
      }
      const result = Clipper.GetHorzDirectionNoOut(horzEdge);
      dir = result.Dir;
      horzLeft = result.Left;
      horzRight = result.Right;
    }

    if (horzEdge.OutIdx >= 0 && op1 === undefined) {
      op1 = this.GetLastOutPt(horzEdge);
      let eNextHorz = this.m_SortedEdges;
      while (eNextHorz !== undefined) {
        if (eNextHorz.OutIdx >= 0 && Clipper.HorzSegmentsOverlap(horzEdge.Bot.x,
            horzEdge.Top.x, eNextHorz.Bot.x, eNextHorz.Top.x)) {
          const op2 = this.GetLastOutPt(eNextHorz);
          this.AddJoin(op2!, op1!, eNextHorz.Top);
        }
        eNextHorz = eNextHorz.NextInSEL;
      }
      this.AddGhostJoin(op1!, horzEdge.Top);
    }

    if (horzEdge.NextInLML !== undefined) {
      if (horzEdge.OutIdx >= 0) {
        op1 = this.AddOutPt(horzEdge, horzEdge.Top);

        horzEdge = this.UpdateEdgeIntoAELNoRef(horzEdge);
        if (horzEdge.WindDelta === 0) {
          return;
        }
        //nb: HorzEdge is no longer horizontal here
        const ePrev = horzEdge.PrevInAEL;
        const eNext = horzEdge.NextInAEL;
        if (ePrev !== undefined && ePrev.Curr.x === horzEdge.Bot.x &&
          ePrev.Curr.y === horzEdge.Bot.y && ePrev.WindDelta !== 0 && ePrev.OutIdx >= 0 && ePrev.Curr.y > ePrev.Top.y && ClipperBase.EdgeSlopesEqual(horzEdge, ePrev, this.m_UseFullRange)) {
          const op2 = this.AddOutPt(ePrev, horzEdge.Bot);
          this.AddJoin(op1, op2, horzEdge.Top);
        }
        else if (eNext !== undefined && eNext.Curr.x === horzEdge.Bot.x &&
          eNext.Curr.y === horzEdge.Bot.y && eNext.WindDelta !== 0 &&
          eNext.OutIdx >= 0 && eNext.Curr.y > eNext.Top.y &&
          ClipperBase.EdgeSlopesEqual(horzEdge, eNext, this.m_UseFullRange)) {
          const op2 = this.AddOutPt(eNext, horzEdge.Bot);
          this.AddJoin(op1, op2, horzEdge.Top);
        }
      }
      else {
        horzEdge = this.UpdateEdgeIntoAELNoRef(horzEdge);
      }
    }
    else {
      if (horzEdge.OutIdx >= 0) {
        this.AddOutPt(horzEdge, horzEdge.Top);
      }
      this.DeleteFromAEL(horzEdge);
    }
  }

  private static GetNextInAEL(e: TEdge, direction: Direction): TEdge | undefined {
    return direction === Direction.dLeftToRight ? e.NextInAEL : e.PrevInAEL;
  }

  //noinspection JSUnusedLocalSymbols
  private static IsMinima(e: TEdge | undefined): boolean { // unused in the original
    return e !== undefined && e.Prev!.NextInLML !== e && e.Next.NextInLML !== e;
  }

  private static IsMaxima(e: TEdge | undefined, Y: double): boolean {
    return e !== undefined && e.Top.y === Y && e.NextInLML === undefined;
  }

  private static IsIntermediate(e: TEdge, Y: double): boolean {
    return e.Top.y === Y && e.NextInLML !== undefined;
  }

  private static GetMaximaPair(e: TEdge): TEdge | undefined {
    if (intPointEquals(e.Next.Top, e.Top) && e.Next.NextInLML === undefined) {
      return e.Next;
    }
    else if (intPointEquals(e.Prev!.Top, e.Top) && e.Prev!.NextInLML === undefined) {
      return e.Prev;
    }
    else {
      return undefined;
    }
  }

  private static GetMaximaPairEx(e: TEdge): TEdge | undefined {
    //as above but returns undefined if MaxPair isn't in AEL (unless it's horizontal)
    const result = this.GetMaximaPair(e);
    if (result === undefined || result.OutIdx === Skip ||
      result.NextInAEL === result.PrevInAEL && !ClipperBase.IsHorizontal(result)) {
      return undefined;
    }
    return result;
  }

  private ProcessIntersections(topY: long): boolean {
    if (this.m_ActiveEdges === undefined) {
      return true;
    }
    //noinspection UnusedCatchParameterJS
    try {
      this.BuildIntersectList(topY);
      if (this.m_IntersectList.length === 0) {
        return true;
      }
      if (this.m_IntersectList.length === 1 || this.FixupIntersectionOrder()) {
        this.ProcessIntersectList();
      }
      else {
        return false;
      }
    }
    catch (err) {
      this.m_SortedEdges = undefined;
      this.m_IntersectList.length = 0;
      throw new ClipperError('ProcessIntersections error');
    }
    this.m_SortedEdges = undefined;
    return true;
  }

  private BuildIntersectList(topY: long): void {
    if (this.m_ActiveEdges === undefined) {
      return;
    }

    //prepare for sorting ...
    let e = this.m_ActiveEdges;
    this.m_SortedEdges = e;
    while (e !== undefined) {
      e.PrevInSEL = e.PrevInAEL;
      e.NextInSEL = e.NextInAEL;
      //e.Curr.X = TopX(e, topY);
      e.Curr = this.cloneIntPointWithX(e.Curr, TopX(e, topY));
      e = e.NextInAEL!;
    }

    //bubblesort ...
    let isModified = true;
    while (isModified && this.m_SortedEdges !== undefined) {
      isModified = false;
      e = this.m_SortedEdges;
      while (e.NextInSEL !== undefined) {
        const eNext = e.NextInSEL;
        if (e.Curr.x > eNext.Curr.x) {
          let pt: IntPoint = this.IntersectPointNoOut(e, eNext);
          if (pt.y < topY) {
            //pt.X = TopX(e, topY);
            //pt.Y = topY;
            // no need to clone since the point Z is generated by us
            pt = this.newIntPoint(TopX(e, topY), topY);
          }
          const newNode = new IntersectNode();
          newNode.Edge1 = e;
          newNode.Edge2 = eNext;
          newNode.Pt = pt;
          this.m_IntersectList.push(newNode);

          this.SwapPositionsInSEL(e, eNext);
          isModified = true;
        }
        else {
          e = eNext;
        }
      }
      if (e.PrevInSEL !== undefined) {
        e.PrevInSEL.NextInSEL = undefined;
      }
      else {
        break;
      }
    }
    this.m_SortedEdges = undefined;
  }

  private static EdgesAdjacent(inode: IntersectNode): boolean {
    return inode.Edge1.NextInSEL === inode.Edge2 ||
      inode.Edge1.PrevInSEL === inode.Edge2;
  }

  //noinspection JSUnusedLocalSymbols
  private static IntersectNodeSort(node1: IntersectNode, node2: IntersectNode): int { // unused in the original
    //the following typecast is safe because the differences in Pt.Y will
    //be limited to the height of the scanbeam.
    return (node2.Pt.y - node1.Pt.y);
  }

  private FixupIntersectionOrder(): boolean {
    //pre-condition: intersections are sorted bottom-most first.
    //Now it's crucial that intersections are made only between adjacent edges,
    //so to ensure this the order of intersections may need adjusting ...
    this.m_IntersectList.sort(this.m_IntersectNodeComparer);

    this.CopyAELToSEL();
    const cnt = this.m_IntersectList.length;
    for (let i: int = 0; i < cnt; i++) {
      if (!Clipper.EdgesAdjacent(this.m_IntersectList[i])) {
        let j: int = i + 1;
        while (j < cnt && !Clipper.EdgesAdjacent(this.m_IntersectList[j])) {
          j++;
        }
        if (j === cnt) {
          return false;
        }

        const tmp = this.m_IntersectList[i];
        this.m_IntersectList[i] = this.m_IntersectList[j];
        this.m_IntersectList[j] = tmp;
      }
      this.SwapPositionsInSEL(this.m_IntersectList[i].Edge1, this.m_IntersectList[i].Edge2);
    }
    return true;
  }

  private ProcessIntersectList(): void {
    for (let i: int = 0; i < this.m_IntersectList.length; i++) {
      const iNode = this.m_IntersectList[i];
      iNode.Pt = this.IntersectEdgesImmutable(iNode.Edge1, iNode.Edge2, iNode.Pt);
      this.SwapPositionsInAEL(iNode.Edge1, iNode.Edge2);
    }
    this.m_IntersectList.length = 0;
  }

  private IntersectPointNoOut(edge1: TEdge, edge2: TEdge): IntPoint { // out ip -> return ip
    let ipX: CInt = 0, ipY: CInt = 0;
    let b1: double = 0, b2: double = 0;
    //nb: with very large coordinate values, it's possible for SlopesEqual() to
    //return false but for the edge.Dx value be equal due to double precision rounding.
    if (edge1.Dx === edge2.Dx) {
      ipY = edge1.Curr.y;
      ipX = TopX(edge1, ipY);
      return this.newIntPoint(ipX, ipY);
    }

    if (edge1.Delta.x === 0) {
      ipX = edge1.Bot.x;
      if (Clipper.IsHorizontal(edge2)) {
        ipY = edge2.Bot.y;
      }
      else {
        b2 = edge2.Bot.y - edge2.Bot.x / edge2.Dx;
        ipY = Round(ipX / edge2.Dx + b2);
      }
    }
    else if (edge2.Delta.x === 0) {
      ipX = edge2.Bot.x;
      if (Clipper.IsHorizontal(edge1)) {
        ipY = edge1.Bot.y;
      }
      else {
        b1 = edge1.Bot.y - edge1.Bot.x / edge1.Dx;
        ipY = Round(ipX / edge1.Dx + b1);
      }
    }
    else {
      b1 = edge1.Bot.x - edge1.Bot.y * edge1.Dx;
      b2 = edge2.Bot.x - edge2.Bot.y * edge2.Dx;
      const q: double = (b2 - b1) / (edge1.Dx - edge2.Dx);
      ipY = Round(q);
      if (Math.abs(edge1.Dx) < Math.abs(edge2.Dx)) {
        ipX = Round(edge1.Dx * q + b1);
      }
      else {
        ipX = Round(edge2.Dx * q + b2);
      }
    }

    if (ipY < edge1.Top.y || ipY < edge2.Top.y) {
      if (edge1.Top.y > edge2.Top.y) {
        ipY = edge1.Top.y;
      }
      else {
        ipY = edge2.Top.y;
      }
      if (Math.abs(edge1.Dx) < Math.abs(edge2.Dx)) {
        ipX = TopX(edge1, ipY);
      }
      else {
        ipX = TopX(edge2, ipY);
      }
    }
    //finally, don't allow 'ip' to be BELOW curr.Y (ie bottom of scanbeam) ...
    if (ipY > edge1.Curr.y) {
      ipY = edge1.Curr.y;
      //better to use the more vertical edge to derive X ...
      if (Math.abs(edge1.Dx) > Math.abs(edge2.Dx)) {
        ipX = TopX(edge2, ipY);
      }
      else {
        ipX = TopX(edge1, ipY);
      }
    }

    return this.newIntPoint(ipX, ipY);
  }

  private ProcessEdgesAtTopOfScanbeam(topY: long): void {
    let e = this.m_ActiveEdges;
    while (e !== undefined) {
      //1. process maxima, treating them as if they're 'bent' horizontal edges,
      //   but exclude maxima with horizontal edges. nb: e can't be a horizontal.
      let IsMaximaEdge = Clipper.IsMaxima(e, topY);

      if (IsMaximaEdge) {
        const eMaxPair = Clipper.GetMaximaPairEx(e);
        IsMaximaEdge = eMaxPair === undefined || !Clipper.IsHorizontal(eMaxPair);
      }

      if (IsMaximaEdge) {
        if (this.strictlySimple) {
          this.InsertMaxima(e.Top.x);
        }
        const ePrev = e.PrevInAEL;
        this.DoMaxima(e);
        if (ePrev === undefined) {
          e = this.m_ActiveEdges;
        }
        else {
          e = ePrev.NextInAEL;
        }
      }
      else {
        //2. promote horizontal edges, otherwise update Curr.X and Curr.Y ...
        if (Clipper.IsIntermediate(e, topY) && Clipper.IsHorizontal(e.NextInLML!)) {
          e = this.UpdateEdgeIntoAELNoRef(e);
          if (e.OutIdx >= 0) {
            this.AddOutPt(e, e.Bot);
          }
          this.AddEdgeToSEL(e);
        }
        else {
          //e.Curr.X = TopX(e, topY);
          //e.Curr.Y = topY;
          const newX = TopX(e, topY);
          const newY = topY;

          if (this.useXyz) {
            let newZ = 0;
            if (e.Top.y === topY) newZ = e.Top.z!;
            else if (e.Bot.y === topY) newZ = e.Bot.z!;
            //else newZ = 0;

            e.Curr = newIntPointXYZ(newX, newY, newZ);
          }
          else {
            e.Curr = newIntPointXY(newX, newY);
          }
        }
        //When StrictlySimple and 'e' is being touched by another edge, then
        //make sure both edges have a vertex here ...
        if (this.strictlySimple) {
          const ePrev = e.PrevInAEL;
          if (e.OutIdx >= 0 && e.WindDelta !== 0 && ePrev !== undefined &&
            ePrev.OutIdx >= 0 && ePrev.Curr.x === e.Curr.x &&
            ePrev.WindDelta !== 0) {
            let ip = e.Curr;
            if (this.useXyz) {
              ip = this.SetZImmutable(ip, ePrev, e);
            }
            const op = this.AddOutPt(ePrev, ip);
            const op2 = this.AddOutPt(e, ip);
            this.AddJoin(op, op2, ip); //StrictlySimple (type-3) join
          }
        }

        e = e.NextInAEL;
      }
    }

    //3. Process horizontals at the Top of the scanbeam ...
    this.ProcessHorizontals();
    this.m_Maxima = undefined;

    //4. Promote intermediate vertices ...
    e = this.m_ActiveEdges;
    while (e !== undefined) {
      if (Clipper.IsIntermediate(e, topY)) {
        let op: OutPt | undefined;
        if (e.OutIdx >= 0) {
          op = this.AddOutPt(e, e.Top);
        }
        e = this.UpdateEdgeIntoAELNoRef(e);

        //if output polygons share an edge, they'll need joining later ...
        const ePrev = e.PrevInAEL;
        const eNext = e.NextInAEL;
        if (ePrev !== undefined && ePrev.Curr.x === e.Bot.x &&
          ePrev.Curr.y === e.Bot.y && op !== undefined &&
          ePrev.OutIdx >= 0 && ePrev.Curr.y > ePrev.Top.y &&
          ClipperBase.IntPoint4SlopesEqual(e.Curr, e.Top, ePrev.Curr, ePrev.Top, this.m_UseFullRange) &&
          e.WindDelta !== 0 && ePrev.WindDelta !== 0) {
          const op2 = this.AddOutPt(ePrev, e.Bot);
          this.AddJoin(op, op2, e.Top);
        }
        else if (eNext !== undefined && eNext.Curr.x === e.Bot.x &&
          eNext.Curr.y === e.Bot.y && op !== undefined &&
          eNext.OutIdx >= 0 && eNext.Curr.y > eNext.Top.y &&
          ClipperBase.IntPoint4SlopesEqual(e.Curr, e.Top, eNext.Curr, eNext.Top, this.m_UseFullRange) &&
          e.WindDelta !== 0 && eNext.WindDelta !== 0) {
          const op2 = this.AddOutPt(eNext, e.Bot);
          this.AddJoin(op, op2, e.Top);
        }
      }
      e = e.NextInAEL;
    }
  }

  private DoMaxima(e: TEdge): void {
    const eMaxPair = Clipper.GetMaximaPairEx(e);
    if (eMaxPair === undefined) {
      if (e.OutIdx >= 0) {
        this.AddOutPt(e, e.Top);
      }
      this.DeleteFromAEL(e);
      return;
    }

    let eNext = e.NextInAEL;
    while (eNext !== undefined && eNext !== eMaxPair) {
      e.Top = this.IntersectEdgesImmutable(e, eNext, e.Top);
      this.SwapPositionsInAEL(e, eNext);
      eNext = e.NextInAEL;
    }

    if (e.OutIdx === Unassigned && eMaxPair.OutIdx === Unassigned) {
      this.DeleteFromAEL(e);
      this.DeleteFromAEL(eMaxPair);
    }
    else if (e.OutIdx >= 0 && eMaxPair.OutIdx >= 0) {
      if (e.OutIdx >= 0) {
        this.AddLocalMaxPoly(e, eMaxPair, e.Top);
      }
      this.DeleteFromAEL(e);
      this.DeleteFromAEL(eMaxPair);
    }
    else if (this.useLines && e.WindDelta === 0) {
      if (e.OutIdx >= 0) {
        this.AddOutPt(e, e.Top);
        e.OutIdx = Unassigned;
      }
      this.DeleteFromAEL(e);

      if (eMaxPair.OutIdx >= 0) {
        this.AddOutPt(eMaxPair, e.Top);
        eMaxPair.OutIdx = Unassigned;
      }
      this.DeleteFromAEL(eMaxPair);
    }
    else {
      throw new ClipperError('DoMaxima error');
    }
  }

  private static PointCount(pts: OutPt | undefined): int {
    if (pts === undefined) {
      return 0;
    }
    let result: int = 0;
    let p = pts;
    do {
      result++;
      p = p.Next;
    } while (p !== pts);
    return result;
  }

  private BuildResult(polyg: Paths): void {
    polyg.length = this.m_PolyOuts.length;
    let finalLength = 0;
    for (let i: int = 0; i < this.m_PolyOuts.length; i++) {
      const outRec = this.m_PolyOuts[i];
      if (outRec!.Pts === undefined) {
        continue;
      }
      let p = outRec!.Pts!.Prev;
      const cnt = Clipper.PointCount(p);
      if (cnt < 2) {
        continue;
      }
      const pg: Path = [];
      pg.length = cnt;
      for (let j: int = 0; j < cnt; j++) {
        pg[j] = p.Pt;
        p = p.Prev;
      }
      polyg[finalLength++] = pg;
    }
    polyg.length = finalLength;
  }

  private BuildResult2(polytree: PolyTree): void {
    polytree.clear();

    //add each output polygon/contour to polytree ...
    polytree.m_AllPolys.length = this.m_PolyOuts.length;
    let allPolysLength = 0;
    for (let i: int = 0; i < this.m_PolyOuts.length; i++) {
      const outRec: OutRec = this.m_PolyOuts[i]!;
      const cnt = Clipper.PointCount(outRec.Pts);
      if (outRec.IsOpen && cnt < 2 ||
        !outRec.IsOpen && cnt < 3) {
        continue;
      }
      Clipper.FixHoleLinkage(outRec);
      const pn = new PolyNode();
      polytree.m_AllPolys[allPolysLength++] = pn;
      outRec.PolyNode = pn;
      pn.m_polygon.length = cnt;
      let op = outRec.Pts!.Prev;
      for (let j: int = 0; j < cnt; j++) {
        pn.m_polygon[j] = op.Pt;
        op = op.Prev;
      }
    }
    polytree.m_AllPolys.length = allPolysLength;

    //fixup PolyNode links etc ...
    //polytree.m_Childs.Capacity = this.m_PolyOuts.length;
    for (let i = 0; i < this.m_PolyOuts.length; i++) {
      const outRec = this.m_PolyOuts[i]!;
      if (outRec.PolyNode === undefined) {
        //continue;
      }
      else if (outRec.IsOpen) {
        outRec.PolyNode.isOpen = true;
        polytree.AddChild(outRec.PolyNode);
      }
      else if (outRec.FirstLeft !== undefined &&
        outRec.FirstLeft.PolyNode !== undefined) {
        outRec.FirstLeft.PolyNode.AddChild(outRec.PolyNode);
      }
      else {
        polytree.AddChild(outRec.PolyNode);
      }
    }
  }

  private static FixupOutPolyline(outrec: OutRec): void {
    let pp = outrec.Pts!;
    let lastPP = pp.Prev;
    while (pp !== lastPP) {
      pp = pp.Next;
      if (intPointEquals(pp.Pt, pp.Prev.Pt)) {
        if (pp === lastPP) {
          lastPP = pp.Prev;
        }
        const tmpPP = pp.Prev;
        tmpPP.Next = pp.Next;
        pp.Next.Prev = tmpPP;
        pp = tmpPP;
      }
    }
    if (pp === pp.Prev) {
      outrec.Pts = undefined;
    }
  }

  private FixupOutPolygon(outRec: OutRec): void {
    //FixupOutPolygon() - removes duplicate points and simplifies consecutive
    //parallel edges by removing the middle vertex.
    let lastOK: OutPt | undefined;
    outRec.BottomPt = undefined;
    let pp = outRec.Pts!;
    const preserveCol = this.preserveCollinear || this.strictlySimple;
    while (true) {
      if (pp.Prev === pp || pp.Prev === pp.Next) {
        outRec.Pts = undefined;
        return;
      }
      //test for duplicate points and collinear edges ...
      if (intPointEquals(pp.Pt, pp.Next.Pt) || intPointEquals(pp.Pt, pp.Prev.Pt) ||
        ClipperBase.IntPoint3SlopesEqual(pp.Prev.Pt, pp.Pt, pp.Next.Pt, this.m_UseFullRange) &&
        (!preserveCol || !ClipperBase.Pt2IsBetweenPt1AndPt3(pp.Prev.Pt, pp.Pt, pp.Next.Pt))) {
        lastOK = undefined;
        pp.Prev.Next = pp.Next;
        pp.Next.Prev = pp.Prev;
        pp = pp.Prev;
      }
      else if (pp === lastOK) {
        break;
      }
      else {
        if (lastOK === undefined) {
          lastOK = pp;
        }
        pp = pp.Next;
      }
    }
    outRec.Pts = pp;
  }

  private static DupOutPt(outPt: OutPt, InsertAfter: boolean): OutPt {
    const result = new OutPt();
    result.Pt = outPt.Pt;
    result.Idx = outPt.Idx;
    if (InsertAfter) {
      result.Next = outPt.Next;
      result.Prev = outPt;
      outPt.Next.Prev = result;
      outPt.Next = result;
    }
    else {
      result.Prev = outPt.Prev;
      result.Next = outPt;
      outPt.Prev.Next = result;
      outPt.Prev = result;
    }
    return result;
  }

  private static GetOverlapNoOut(a1: long, a2: long, b1: long, b2: long): { res: boolean, Left: long, Right: long } { // out Left, out Right: boolean - > {res, Left, Right}
    let Left: long, Right: long;
    if (a1 < a2) {
      if (b1 < b2) {
        Left = Math.max(a1, b1);
        Right = Math.min(a2, b2);
      }
      else {
        Left = Math.max(a1, b2);
        Right = Math.min(a2, b1);
      }
    }
    else {
      if (b1 < b2) {
        Left = Math.max(a2, b1);
        Right = Math.min(a1, b2);
      }
      else {
        Left = Math.max(a2, b2);
        Right = Math.min(a1, b1);
      }
    }
    return { res: Left < Right, Left: Left, Right: Right };
  }

  private static JoinHorz(op1: OutPt, op1b: OutPt, op2: OutPt, op2b: OutPt, Pt: IntPoint, DiscardLeft: boolean): boolean {
    const Dir1 = op1.Pt.x > op1b.Pt.x ? Direction.dRightToLeft : Direction.dLeftToRight;
    const Dir2 = op2.Pt.x > op2b.Pt.x ? Direction.dRightToLeft : Direction.dLeftToRight;
    if (Dir1 === Dir2) {
      return false;
    }

    //When DiscardLeft, we want Op1b to be on the Left of Op1, otherwise we
    //want Op1b to be on the Right. (And likewise with Op2 and Op2b.)
    //So, to facilitate this while inserting Op1b and Op2b ...
    //when DiscardLeft, make sure we're AT or RIGHT of Pt before adding Op1b,
    //otherwise make sure we're AT or LEFT of Pt. (Likewise with Op2b.)
    if (Dir1 === Direction.dLeftToRight) {
      while (op1.Next.Pt.x <= Pt.x &&
      op1.Next.Pt.x >= op1.Pt.x && op1.Next.Pt.y === Pt.y) {
        op1 = op1.Next;
      }
      if (DiscardLeft && op1.Pt.x !== Pt.x) {
        op1 = op1.Next;
      }
      op1b = Clipper.DupOutPt(op1, !DiscardLeft);
      if (!intPointEquals(op1b.Pt, Pt)) {
        op1 = op1b;
        op1.Pt = Pt;
        op1b = Clipper.DupOutPt(op1, !DiscardLeft);
      }
    }
    else {
      while (op1.Next.Pt.x >= Pt.x &&
      op1.Next.Pt.x <= op1.Pt.x && op1.Next.Pt.y === Pt.y) {
        op1 = op1.Next;
      }
      if (!DiscardLeft && op1.Pt.x !== Pt.x) {
        op1 = op1.Next;
      }
      op1b = Clipper.DupOutPt(op1, DiscardLeft);
      if (!intPointEquals(op1b.Pt, Pt)) {
        op1 = op1b;
        op1.Pt = Pt;
        op1b = Clipper.DupOutPt(op1, DiscardLeft);
      }
    }

    if (Dir2 === Direction.dLeftToRight) {
      while (op2.Next.Pt.x <= Pt.x &&
      op2.Next.Pt.x >= op2.Pt.x && op2.Next.Pt.y === Pt.y) {
        op2 = op2.Next;
      }
      if (DiscardLeft && op2.Pt.x !== Pt.x) {
        op2 = op2.Next;
      }
      op2b = Clipper.DupOutPt(op2, !DiscardLeft);
      if (!intPointEquals(op2b.Pt, Pt)) {
        op2 = op2b;
        op2.Pt = Pt;
        op2b = Clipper.DupOutPt(op2, !DiscardLeft);
      }
    }
    else {
      while (op2.Next.Pt.x >= Pt.x &&
      op2.Next.Pt.x <= op2.Pt.x && op2.Next.Pt.y === Pt.y) {
        op2 = op2.Next;
      }
      if (!DiscardLeft && op2.Pt.x !== Pt.x) {
        op2 = op2.Next;
      }
      op2b = Clipper.DupOutPt(op2, DiscardLeft);
      if (!intPointEquals(op2b.Pt, Pt)) {
        op2 = op2b;
        op2.Pt = Pt;
        op2b = Clipper.DupOutPt(op2, DiscardLeft);
      }
    }

    if (Dir1 === Direction.dLeftToRight === DiscardLeft) {
      op1.Prev = op2;
      op2.Next = op1;
      op1b.Next = op2b;
      op2b.Prev = op1b;
    }
    else {
      op1.Next = op2;
      op2.Prev = op1;
      op1b.Prev = op2b;
      op2b.Next = op1b;
    }
    return true;
  }

  private JoinPoints(j: Join, outRec1: OutRec, outRec2: OutRec): boolean {
    let op1 = j.OutPt1;
    let op1b: OutPt | undefined;
    let op2 = j.OutPt2;
    let op2b: OutPt | undefined;


    //There are 3 kinds of joins for output polygons ...
    //1. Horizontal joins where Join.OutPt1 & Join.OutPt2 are vertices anywhere
    //along (horizontal) collinear edges (& Join.OffPt is on the same horizontal).
    //2. Non-horizontal joins where Join.OutPt1 & Join.OutPt2 are at the same
    //location at the Bottom of the overlapping segment (& Join.OffPt is above).
    //3. StrictlySimple joins where edges touch but are not collinear and where
    //Join.OutPt1, Join.OutPt2 & Join.OffPt all share the same point.
    const isHorizontal = j.OutPt1.Pt.y === j.OffPt.y;

    if (isHorizontal && intPointEquals(j.OffPt, j.OutPt1.Pt) && intPointEquals(j.OffPt, j.OutPt2.Pt)) {
      //Strictly Simple join ...
      if (outRec1 !== outRec2) {
        return false;
      }
      op1b = j.OutPt1.Next;
      while (op1b !== op1 && intPointEquals(op1b.Pt, j.OffPt)) {
        op1b = op1b.Next;
      }
      const reverse1 = op1b.Pt.y > j.OffPt.y;
      op2b = j.OutPt2.Next;
      while (op2b !== op2 && intPointEquals(op2b.Pt, j.OffPt)) {
        op2b = op2b.Next;
      }
      const reverse2 = op2b.Pt.y > j.OffPt.y;
      if (reverse1 === reverse2) {
        return false;
      }
      if (reverse1) {
        op1b = Clipper.DupOutPt(op1, false);
        op2b = Clipper.DupOutPt(op2, true);
        op1.Prev = op2;
        op2.Next = op1;
        op1b.Next = op2b;
        op2b.Prev = op1b;
        j.OutPt1 = op1;
        j.OutPt2 = op1b;
        return true;
      }
      else {
        op1b = Clipper.DupOutPt(op1, true);
        op2b = Clipper.DupOutPt(op2, false);
        op1.Next = op2;
        op2.Prev = op1;
        op1b.Prev = op2b;
        op2b.Next = op1b;
        j.OutPt1 = op1;
        j.OutPt2 = op1b;
        return true;
      }
    }
    else if (isHorizontal) {
      //treat horizontal joins differently to non-horizontal joins since with
      //them we're not yet sure where the overlapping is. OutPt1.Pt & OutPt2.Pt
      //may be anywhere along the horizontal edge.
      op1b = op1;
      while (op1.Prev.Pt.y === op1.Pt.y && op1.Prev !== op1b && op1.Prev !== op2) {
        op1 = op1.Prev;
      }
      while (op1b.Next.Pt.y === op1b.Pt.y && op1b.Next !== op1 && op1b.Next !== op2) {
        op1b = op1b.Next;
      }
      if (op1b.Next === op1 || op1b.Next === op2) {
        return false; //a flat 'polygon'
      }

      op2b = op2;
      while (op2.Prev.Pt.y === op2.Pt.y && op2.Prev !== op2b && op2.Prev !== op1b) {
        op2 = op2.Prev;
      }
      while (op2b.Next.Pt.y === op2b.Pt.y && op2b.Next !== op2 && op2b.Next !== op1) {
        op2b = op2b.Next;
      }
      if (op2b.Next === op2 || op2b.Next === op1) {
        return false; //a flat 'polygon'
      }

      //Op1 -. Op1b & Op2 -. Op2b are the extremites of the horizontal edges
      const { res, Left, Right } = Clipper.GetOverlapNoOut(op1.Pt.x, op1b.Pt.x, op2.Pt.x, op2b.Pt.x);
      if (!res) {
        return false;
      }

      //DiscardLeftSide: when overlapping edges are joined, a spike will created
      //which needs to be cleaned up. However, we don't want Op1 or Op2 caught up
      //on the discard Side as either may still be needed for other joins ...
      let Pt: IntPoint;
      let DiscardLeftSide: boolean;
      if (op1.Pt.x >= Left && op1.Pt.x <= Right) {
        Pt = op1.Pt;
        DiscardLeftSide = op1.Pt.x > op1b.Pt.x;
      }
      else if (op2.Pt.x >= Left && op2.Pt.x <= Right) {
        Pt = op2.Pt;
        DiscardLeftSide = op2.Pt.x > op2b.Pt.x;
      }
      else if (op1b.Pt.x >= Left && op1b.Pt.x <= Right) {
        Pt = op1b.Pt;
        DiscardLeftSide = op1b.Pt.x > op1.Pt.x;
      }
      else {
        Pt = op2b.Pt;
        DiscardLeftSide = op2b.Pt.x > op2.Pt.x;
      }
      j.OutPt1 = op1;
      j.OutPt2 = op2;
      return Clipper.JoinHorz(op1, op1b, op2, op2b, Pt, DiscardLeftSide);
    }
    else {
      //nb: For non-horizontal joins ...
      //    1. Jr.OutPt1.Pt.Y === Jr.OutPt2.Pt.Y
      //    2. Jr.OutPt1.Pt > Jr.OffPt.Y

      //make sure the polygons are correctly oriented ...
      op1b = op1.Next;
      while (intPointEquals(op1b.Pt, op1.Pt) && op1b !== op1) {
        op1b = op1b.Next;
      }
      const Reverse1 = op1b.Pt.y > op1.Pt.y ||
        !ClipperBase.IntPoint3SlopesEqual(op1.Pt, op1b.Pt, j.OffPt, this.m_UseFullRange);
      if (Reverse1) {
        op1b = op1.Prev;
        while (intPointEquals(op1b.Pt, op1.Pt) && op1b !== op1) {
          op1b = op1b.Prev;
        }
        if (op1b.Pt.y > op1.Pt.y ||
          !ClipperBase.IntPoint3SlopesEqual(op1.Pt, op1b.Pt, j.OffPt, this.m_UseFullRange)) {
          return false;
        }
      }

      op2b = op2.Next;
      while (intPointEquals(op2b.Pt, op2.Pt) && op2b !== op2) {
        op2b = op2b.Next;
      }
      const Reverse2 = op2b.Pt.y > op2.Pt.y ||
        !ClipperBase.IntPoint3SlopesEqual(op2.Pt, op2b.Pt, j.OffPt, this.m_UseFullRange);
      if (Reverse2) {
        op2b = op2.Prev;
        while (intPointEquals(op2b.Pt, op2.Pt) && op2b !== op2) {
          op2b = op2b.Prev;
        }
        if (op2b.Pt.y > op2.Pt.y ||
          !ClipperBase.IntPoint3SlopesEqual(op2.Pt, op2b.Pt, j.OffPt, this.m_UseFullRange)) {
          return false;
        }
      }

      if (op1b === op1 || op2b === op2 || op1b === op2b ||
        outRec1 === outRec2 && Reverse1 === Reverse2) {
        return false;
      }

      if (Reverse1) {
        op1b = Clipper.DupOutPt(op1, false);
        op2b = Clipper.DupOutPt(op2, true);
        op1.Prev = op2;
        op2.Next = op1;
        op1b.Next = op2b;
        op2b.Prev = op1b;
        j.OutPt1 = op1;
        j.OutPt2 = op1b;
        return true;
      }
      else {
        op1b = Clipper.DupOutPt(op1, true);
        op2b = Clipper.DupOutPt(op2, false);
        op1.Next = op2;
        op2.Prev = op1;
        op1b.Prev = op2b;
        op2b.Next = op1b;
        j.OutPt1 = op1;
        j.OutPt2 = op1b;
        return true;
      }
    }
  }

  //See "The Point in Polygon Problem for Arbitrary Polygons" by Hormann & Agathos
  //http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.88.5498&rep=rep1&type=pdf
  private static PointInPolygonOutPt(pt: IntPoint, op: OutPt): int {
    //returns 0 if false, +1 if true, -1 if pt ON polygon boundary
    let result: int = 0;
    const startOp = op;
    const ptx = pt.x, pty = pt.y;
    let poly0x = op.Pt.x, poly0y = op.Pt.y;
    do {
      op = op.Next;
      const poly1x = op.Pt.x, poly1y = op.Pt.y;

      if (poly1y === pty) {
        if (poly1x === ptx || poly0y === pty &&
          poly1x > ptx === poly0x < ptx) {
          return -1;
        }
      }
      if (poly0y < pty !== poly1y < pty) {
        if (poly0x >= ptx) {
          if (poly1x > ptx) {
            result = 1 - result;
          }
          else {
            const d: double = (poly0x - ptx) * (poly1y - pty) -
              (poly1x - ptx) * (poly0y - pty);
            if (d === 0) {
              return -1;
            }
            if (d > 0 === poly1y > poly0y) {
              result = 1 - result;
            }
          }
        }
        else {
          if (poly1x > ptx) {
            const d: double = (poly0x - ptx) * (poly1y - pty) -
              (poly1x - ptx) * (poly0y - pty);
            if (d === 0) {
              return -1;
            }
            if (d > 0 === poly1y > poly0y) {
              result = 1 - result;
            }
          }
        }
      }
      poly0x = poly1x;
      poly0y = poly1y;
    } while (startOp !== op);
    return result;
  }

  private static Poly2ContainsPoly1(outPt1: OutPt, outPt2: OutPt): boolean {
    let op = outPt1;
    do {
      //nb: PointInPolygon returns 0 if false, +1 if true, -1 if pt on polygon
      const res = Clipper.PointInPolygonOutPt(op.Pt, outPt2);
      if (res >= 0) {
        return res > 0;
      }
      op = op.Next;
    } while (op !== outPt1);
    return true;
  }

  private FixupFirstLefts1(OldOutRec: OutRec, NewOutRec: OutRec): void {
    for (let ii = 0, max = this.m_PolyOuts.length; ii < max; ii++) {
      const outRec = this.m_PolyOuts[ii];
      const firstLeft = Clipper.ParseFirstLeft(outRec!.FirstLeft);
      if (outRec!.Pts !== undefined && firstLeft === OldOutRec) {
        if (Clipper.Poly2ContainsPoly1(outRec!.Pts!, NewOutRec.Pts!)) {
          outRec!.FirstLeft = NewOutRec;
        }
      }
    }
  }

  private FixupFirstLefts2(innerOutRec: OutRec, outerOutRec: OutRec): void {
    //A polygon has split into two such that one is now the inner of the other.
    //It's possible that these polygons now wrap around other polygons, so check
    //every polygon that's also contained by OuterOutRec's FirstLeft container
    //(including nil) to see if they've become inner to the new inner polygon ...
    const orfl = outerOutRec.FirstLeft;
    for (let ii = 0, max = this.m_PolyOuts.length; ii < max; ii++) {
      const outRec = this.m_PolyOuts[ii];
      if (outRec!.Pts === undefined || outRec === outerOutRec || outRec === innerOutRec) {
        continue;
      }
      const firstLeft = Clipper.ParseFirstLeft(outRec!.FirstLeft);
      if (firstLeft !== orfl && firstLeft !== innerOutRec && firstLeft !== outerOutRec) {
        continue;
      }
      if (Clipper.Poly2ContainsPoly1(outRec!.Pts!, innerOutRec!.Pts!)) {
        outRec!.FirstLeft = innerOutRec;
      }
      else if (Clipper.Poly2ContainsPoly1(outRec!.Pts!, outerOutRec!.Pts!)) {
        outRec!.FirstLeft = outerOutRec;
      }
      else if (outRec!.FirstLeft === innerOutRec || outRec!.FirstLeft === outerOutRec) {
        outRec!.FirstLeft = orfl;
      }
    }
  }

  private FixupFirstLefts3(OldOutRec: OutRec, NewOutRec: OutRec): void {
    //same as FixupFirstLefts1 but doesn't call Poly2ContainsPoly1()
    for (let ii = 0, max = this.m_PolyOuts.length; ii < max; ii++) {
      const outRec = this.m_PolyOuts[ii];
      const firstLeft = Clipper.ParseFirstLeft(outRec!.FirstLeft);
      if (outRec!.Pts !== undefined && firstLeft === OldOutRec) {
        outRec!.FirstLeft = NewOutRec;
      }
    }
  }

  private static ParseFirstLeft(FirstLeft: OutRec | undefined): OutRec | undefined {
    while (FirstLeft !== undefined && FirstLeft.Pts === undefined) {
      FirstLeft = FirstLeft.FirstLeft;
    }
    return FirstLeft;
  }

  private JoinCommonEdges(): void {
    for (let i = 0; i < this.m_Joins.length; i++) {
      const join = this.m_Joins[i];

      const outRec1 = this.GetOutRec(join.OutPt1.Idx);
      let outRec2 = this.GetOutRec(join.OutPt2.Idx);

      if (outRec1.Pts === undefined || outRec2.Pts === undefined) {
        continue;
      }
      if (outRec1.IsOpen || outRec2.IsOpen) {
        continue;
      }

      //get the polygon fragment with the correct hole state (FirstLeft)
      //before calling JoinPoints() ...
      let holeStateRec: OutRec | undefined;
      if (outRec1 === outRec2) {
        holeStateRec = outRec1;
      }
      else if (Clipper.OutRec1RightOfOutRec2(outRec1, outRec2)) {
        holeStateRec = outRec2;
      }
      else if (Clipper.OutRec1RightOfOutRec2(outRec2, outRec1)) {
        holeStateRec = outRec1;
      }
      else {
        holeStateRec = Clipper.GetLowermostRec(outRec1, outRec2);
      }

      if (!this.JoinPoints(join, outRec1, outRec2)) {
        continue;
      }

      if (outRec1 === outRec2) {
        //instead of joining two polygons, we've just created a new one by
        //splitting one polygon into two.
        outRec1.Pts = join.OutPt1;
        outRec1.BottomPt = undefined;
        outRec2 = this.CreateOutRec();
        outRec2.Pts = join.OutPt2;

        //update all OutRec2.Pts Idx's ...
        Clipper.UpdateOutPtIdxs(outRec2);

        if (Clipper.Poly2ContainsPoly1(outRec2.Pts, outRec1.Pts)) {
          //outRec1 contains outRec2 ...
          outRec2.IsHole = !outRec1.IsHole;
          outRec2.FirstLeft = outRec1;

          if (this.m_UsingPolyTree) {
            this.FixupFirstLefts2(outRec2, outRec1);
          }

          if ((outRec2.IsHole !== this.reverseSolution) === Clipper.AreaOutRec(outRec2) > 0) {
            Clipper.ReversePolyPtLinks(outRec2.Pts);
          }
        }
        else if (Clipper.Poly2ContainsPoly1(outRec1.Pts, outRec2.Pts)) {
          //outRec2 contains outRec1 ...
          outRec2.IsHole = outRec1.IsHole;
          outRec1.IsHole = !outRec2.IsHole;
          outRec2.FirstLeft = outRec1.FirstLeft;
          outRec1.FirstLeft = outRec2;

          if (this.m_UsingPolyTree) {
            this.FixupFirstLefts2(outRec1, outRec2);
          }

          if ((outRec1.IsHole !== this.reverseSolution) === Clipper.AreaOutRec(outRec1) > 0) {
            Clipper.ReversePolyPtLinks(outRec1.Pts);
          }
        }
        else {
          //the 2 polygons are completely separate ...
          outRec2.IsHole = outRec1.IsHole;
          outRec2.FirstLeft = outRec1.FirstLeft;

          //fixup FirstLeft pointers that may need reassigning to OutRec2
          if (this.m_UsingPolyTree) {
            this.FixupFirstLefts1(outRec1, outRec2);
          }
        }
      }
      else {
        //joined 2 polygons together ...

        outRec2.Pts = undefined;
        outRec2.BottomPt = undefined;
        outRec2.Idx = outRec1.Idx;

        outRec1.IsHole = holeStateRec.IsHole;
        if (holeStateRec === outRec2) {
          outRec1.FirstLeft = outRec2.FirstLeft;
        }
        outRec2.FirstLeft = outRec1;

        //fixup FirstLeft pointers that may need reassigning to OutRec1
        if (this.m_UsingPolyTree) {
          this.FixupFirstLefts3(outRec2, outRec1);
        }
      }
    }
  }

  private static UpdateOutPtIdxs(outrec: OutRec): void {
    let op = outrec.Pts;
    do {
      op!.Idx = outrec.Idx;
      op = op!.Prev;
    } while (op !== outrec.Pts);
  }

  private DoSimplePolygons(): void {
    let i: int = 0;
    while (i < this.m_PolyOuts.length) {
      const outrec = this.m_PolyOuts[i++]!;
      let op = outrec.Pts!;
      if (op === undefined || outrec.IsOpen) {
        continue;
      }
      do { //for each Pt in Polygon until duplicate found do ...
        let op2 = op.Next;
        while (op2 !== outrec.Pts) {
          if (intPointEquals(op.Pt, op2.Pt) && op2.Next !== op && op2.Prev !== op) {
            //split the polygon into two ...
            const op3 = op.Prev;
            const op4 = op2.Prev;
            op.Prev = op4;
            op4.Next = op;
            op2.Prev = op3;
            op3.Next = op2;

            outrec.Pts = op;
            const outrec2 = this.CreateOutRec();
            outrec2.Pts = op2;
            Clipper.UpdateOutPtIdxs(outrec2);
            if (Clipper.Poly2ContainsPoly1(outrec2.Pts!, outrec.Pts)) {
              //OutRec2 is contained by OutRec1 ...
              outrec2.IsHole = !outrec.IsHole;
              outrec2.FirstLeft = outrec;
              if (this.m_UsingPolyTree) {
                this.FixupFirstLefts2(outrec2, outrec);
              }
            }
            else if (Clipper.Poly2ContainsPoly1(outrec.Pts, outrec2.Pts!)) {
              //OutRec1 is contained by OutRec2 ...
              outrec2.IsHole = outrec.IsHole;
              outrec.IsHole = !outrec2.IsHole;
              outrec2.FirstLeft = outrec.FirstLeft;
              outrec.FirstLeft = outrec2;
              if (this.m_UsingPolyTree) {
                this.FixupFirstLefts2(outrec, outrec2);
              }
            }
            else {
              //the 2 polygons are separate ...
              outrec2.IsHole = outrec.IsHole;
              outrec2.FirstLeft = outrec.FirstLeft;
              if (this.m_UsingPolyTree) {
                this.FixupFirstLefts1(outrec, outrec2);
              }
            }
            op2 = op; //ie get ready for the next iteration
          }
          op2 = op2.Next;
        }
        op = op.Next;
      } while (op !== outrec.Pts);
    }
  }

  private static AreaOutRec(outRec: OutRec): double {
    return Clipper.AreaOutPt(outRec.Pts);
  }

  private static AreaOutPt(op: OutPt | undefined): double {
    const opFirst = op;
    if (op === undefined) {
      return 0;
    }
    let a: double = 0;
    do {
      a += (op.Prev.Pt.x + op.Pt.x) * (op.Prev.Pt.y - op.Pt.y);
      op = op.Next;
    } while (op !== opFirst);
    return a * 0.5;
  }

  //noinspection JSUnusedLocalSymbols
  private static DistanceSqrd(pt1: IntPoint, pt2: IntPoint): double { // unused in the original
    const dx = pt1.x - pt2.x;
    const dy = pt1.y - pt2.y;
    return dx * dx + dy * dy;
  }
}
