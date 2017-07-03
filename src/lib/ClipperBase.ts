import { Int128Equals, Int128Mul } from './_bigint';
import { LocalMinima } from './_LocalMinima';
import { OutPt } from './_OutPt';
import { OutRec } from './_OutRec';
import { Scanbeam } from './_Scanbeam';
import { TEdge } from './_TEdge';
import { EdgeSide, horizontal, int, Skip, Unassigned } from './_types';
import { ClipperError } from './ClipperError';
import { cloneIntPointXYWithX, cloneIntPointXYZWithX, IntPoint, intPointEquals, newIntPointXY, newIntPointXYZ } from './IntPoint';
import { IntRect } from './IntRect';
import { CInt, hiRange, loRange, Path, Paths, PolyType } from './types';

export abstract class ClipperBase {
  private m_MinimaList?: LocalMinima;
  private m_CurrentLM?: LocalMinima;
  private m_edges: (TEdge | undefined)[][] = [];
  protected m_Scanbeam?: Scanbeam;
  protected m_PolyOuts: (OutRec | undefined)[] = [];
  protected m_ActiveEdges?: TEdge;
  protected m_UseFullRange: boolean = false;
  protected m_HasOpenPaths: boolean = false;

  // new
  public useLines: boolean;
  private _useXyz: boolean;
  public get useXyz(): boolean {
    return this._useXyz;
  }
  public set useXyz(val: boolean) {
    this._useXyz = val;
    this.newIntPoint = val ? newIntPointXYZ : newIntPointXY;
    this.cloneIntPointWithX = val ? cloneIntPointXYZWithX : cloneIntPointXYWithX;
  }
  protected newIntPoint: (x: CInt, y: CInt) => IntPoint; // new
  protected cloneIntPointWithX: (p: IntPoint, x: CInt) => IntPoint; // new

  public preserveCollinear: boolean = false;

  protected static IsHorizontal(e: TEdge): boolean {
    return e.Delta.y === 0;
  }

  //noinspection JSUnusedLocalSymbols
  private static PointIsVertex(pt: IntPoint, pp: OutPt): boolean { // unused in the original
    let pp2: OutPt | undefined = pp;
    do {
      if (intPointEquals(pp2!.Pt, pt)) return true;
      pp2 = pp2!.Next;
    } while (pp2 !== pp);

    return false;
  }

  private static PointOnLineSegment(pt: IntPoint, linePt1: IntPoint, linePt2: IntPoint, UseFullRange: boolean): boolean {
    if (UseFullRange) {
      return (
        ((pt.x === linePt1.x) && (pt.y === linePt1.y)) ||
        ((pt.x === linePt2.x) && (pt.y === linePt2.y)) ||
        (
          ((pt.x > linePt1.x) === (pt.x < linePt2.x)) &&
          ((pt.y > linePt1.y) === (pt.y < linePt2.y)) &&
          (
            Int128Equals(
              Int128Mul((pt.x - linePt1.x), (linePt2.y - linePt1.y)),
              Int128Mul((linePt2.x - linePt1.x), (pt.y - linePt1.y))
            )
          )
        )
      );
    }
    else {
      return (
        ((pt.x === linePt1.x) && (pt.y === linePt1.y)) ||
        ((pt.x === linePt2.x) && (pt.y === linePt2.y)) ||
        (
          ((pt.x > linePt1.x) === (pt.x < linePt2.x)) &&
          ((pt.y > linePt1.y) === (pt.y < linePt2.y)) &&
          (
            (pt.x - linePt1.x) * (linePt2.y - linePt1.y) === (linePt2.x - linePt1.x) * (pt.y - linePt1.y)
          )
        )
      );
    }
  }

  //noinspection JSUnusedLocalSymbols
  private static PointOnPolygon(pt: IntPoint, pp: OutPt, UseFullRange: boolean): boolean { // unused in the original
    let pp2: OutPt | undefined = pp;
    while (true) {
      if (ClipperBase.PointOnLineSegment(pt, pp2!.Pt, pp2!.Next.Pt, UseFullRange)) {
        return true;
      }
      pp2 = pp2!.Next;
      if (pp2 === pp) break;
    }
    return false;
  }

  protected static EdgeSlopesEqual(e1: TEdge, e2: TEdge, UseFullRange: boolean): boolean {
    if (UseFullRange) {
      return Int128Equals(Int128Mul(e1.Delta.y, e2.Delta.x), Int128Mul(e1.Delta.x, e2.Delta.y));
    }
    else {
      return (e1.Delta.y) * (e2.Delta.x) === (e1.Delta.x) * (e2.Delta.y);
    }
  }

  protected static IntPoint3SlopesEqual(pt1: IntPoint, pt2: IntPoint, pt3: IntPoint, UseFullRange: boolean): boolean {
    if (UseFullRange) {
      return Int128Equals(Int128Mul(pt1.y - pt2.y, pt2.x - pt3.x), Int128Mul(pt1.x - pt2.x, pt2.y - pt3.y));
    }
    else {
      return (pt1.y - pt2.y) * (pt2.x - pt3.x) - (pt1.x - pt2.x) * (pt2.y - pt3.y) === 0;
    }
  }

  protected static IntPoint4SlopesEqual(pt1: IntPoint, pt2: IntPoint, pt3: IntPoint, pt4: IntPoint, UseFullRange: boolean) {
    if (UseFullRange) {
      return Int128Equals(Int128Mul(pt1.y - pt2.y, pt3.x - pt4.x), Int128Mul(pt1.x - pt2.x, pt3.y - pt4.y));
    }
    else {
      return (pt1.y - pt2.y) * (pt3.x - pt4.x) - (pt1.x - pt2.x) * (pt3.y - pt4.y) === 0;
    }
  }

  protected constructor() {
    this.m_MinimaList = undefined;
    this.m_CurrentLM = undefined;
    this.m_UseFullRange = false;
    this.m_HasOpenPaths = false;

    this.useLines = true;
    this.useXyz = false;
  }

  public clear(): void { // virtual
    this.DisposeLocalMinimaList();
    for (let i: int = 0; i < this.m_edges.length; ++i) {
      for (let j: int = 0; j < this.m_edges[i].length; ++j) this.m_edges[i][j] = undefined;
      this.m_edges[i].length = 0;
    }
    this.m_edges.length = 0;
    this.m_UseFullRange = false;
    this.m_HasOpenPaths = false;
  }

  private DisposeLocalMinimaList(): void {
    while (this.m_MinimaList !== undefined ) {
      const tmpLm: LocalMinima | undefined = this.m_MinimaList.Next;
      this.m_MinimaList = undefined;
      this.m_MinimaList = tmpLm;
    }
    this.m_CurrentLM = undefined;
  }

  private static RangeTestNoRef(Pt: IntPoint, useFullRange: boolean): boolean { // ref useFullRange -> in useFullRange: useFullRange
    if (useFullRange) {
      if (Pt.x > hiRange || Pt.y > hiRange || -Pt.x > hiRange || -Pt.y > hiRange) throw new ClipperError('Coordinate outside allowed range');
    }
    else if (Pt.x > loRange || Pt.y > loRange || -Pt.x > loRange || -Pt.y > loRange) {
      useFullRange = true;
      useFullRange = ClipperBase.RangeTestNoRef(Pt, useFullRange);
    }
    return useFullRange;
  }

  private static InitEdge(e: TEdge, eNext: TEdge, ePrev: TEdge, pt: IntPoint): void {
    e.Next = eNext;
    e.Prev = ePrev;
    e.Curr = pt;
    e.OutIdx = Unassigned;
  }

  private InitEdge2(e: TEdge, polyType: PolyType): void {
    if (e.Curr.y >= e.Next.Curr.y) {
      e.Bot = e.Curr;
      e.Top = e.Next.Curr;
    }
    else {
      e.Top = e.Curr;
      e.Bot = e.Next.Curr;
    }
    this.SetDx(e);
    e.PolyTyp = polyType;
  }

  private static FindNextLocMin(e: TEdge): TEdge {
    let E: TEdge = e;
    let E2: TEdge;
    while (true) {
      while ((!intPointEquals(E.Bot, E.Prev!.Bot)) || intPointEquals(E.Curr, E.Top)) {
        E = E.Next;
      }
      if (E.Dx !== horizontal && E.Prev!.Dx !== horizontal) {
        break;
      }
      while (E.Prev!.Dx === horizontal) {
        E = E.Prev!;
      }
      E2 = E;
      while (E.Dx === horizontal) {
        E = E.Next;
      }
      if (E.Top.y === E.Prev!.Bot.y) {
        continue; //ie just an intermediate horz.
      }
      if (E2.Prev!.Bot.x < E.Bot.x) {
        E = E2;
      }
      break;
    }
    return E;
  }

  private ProcessBound(e: TEdge, LeftBoundIsForward: boolean): TEdge {
    let E: TEdge | undefined = e;
    let EStart: TEdge, Result: TEdge = E;
    let Horz: TEdge;

    if (Result.OutIdx === Skip) {
      //check if there are edges beyond the skip edge in the bound and if so
      //create another LocMin and calling ProcessBound once more ...
      E = Result;
      if (LeftBoundIsForward) {
        while (E.Top.y === E.Next.Bot.y) E = E.Next;
        while (E !== Result && E.Dx === horizontal) E = E.Prev!;
      }
      else {
        while (E.Top.y === E.Prev!.Bot.y) E = E.Prev!;
        while (E !== Result && E.Dx === horizontal) E = E.Next;
      }
      if (E === Result) {
        if (LeftBoundIsForward) Result = E.Next;
        else Result = E.Prev!;
      }
      else {
        //there are more edges in the bound beyond result starting with E
        if (LeftBoundIsForward)
          E = Result.Next;
        else
          E = Result.Prev!;
        const locMin: LocalMinima = new LocalMinima();
        locMin.Next = undefined;
        locMin.Y = E.Bot.y;
        locMin.LeftBound = undefined;
        locMin.RightBound = E;
        E.WindDelta = 0;
        Result = this.ProcessBound(E, LeftBoundIsForward);
        this.InsertLocalMinima(locMin);
      }
      return Result;
    }

    if (E.Dx === horizontal) {
      //We need to be careful with open paths because this may not be a
      //true local minima (ie E may be following a skip edge).
      //Also, consecutive horz. edges may start heading left before going right.
      if (LeftBoundIsForward) EStart = E.Prev!;
      else EStart = E.Next;
      if (EStart!.Dx === horizontal) { //ie an adjoining horizontal skip edge
        if (EStart!.Bot.x !== E.Bot.x && EStart!.Top.x !== E.Bot.x)
          this.ReverseHorizontal(E);
      }
      else if (EStart!.Bot.x !== E.Bot.x)
        this.ReverseHorizontal(E);
    }

    EStart = E;
    if (LeftBoundIsForward) {
      while (Result!.Top.y === Result!.Next.Bot.y && Result!.Next.OutIdx !== Skip)
        Result = Result!.Next;
      if (Result!.Dx === horizontal && Result!.Next.OutIdx !== Skip) {
        //nb: at the top of a bound, horizontals are added to the bound
        //only when the preceding edge attaches to the horizontal's left vertex
        //unless a Skip edge is encountered when that becomes the top divide
        Horz = Result;
        while (Horz!.Prev!.Dx === horizontal) Horz = Horz.Prev!;
        if (Horz!.Prev!.Top.x > Result!.Next.Top.x) Result = Horz.Prev!;
      }
      while (E !== Result) {
        E.NextInLML = E.Next;
        if (E.Dx === horizontal && E !== EStart && E.Bot.x !== E.Prev!.Top.x)
          this.ReverseHorizontal(E);
        E = E.Next;
      }
      if (E.Dx === horizontal && E !== EStart && E.Bot.x !== E.Prev!.Top.x)
        this.ReverseHorizontal(E);
      Result = Result!.Next; //move to the edge just beyond current bound
    }
    else {
      while (Result!.Top.y === Result!.Prev!.Bot.y && Result!.Prev!.OutIdx !== Skip)
        Result = Result.Prev!;
      if (Result!.Dx === horizontal && Result!.Prev!.OutIdx !== Skip) {
        Horz = Result;
        while (Horz!.Next.Dx === horizontal) Horz = Horz!.Next;
        if (Horz!.Next.Top.x === Result!.Prev!.Top.x ||
          Horz!.Next.Top.x > Result!.Prev!.Top.x) Result = Horz!.Next;
      }

      while (E !== Result) {
        E.NextInLML = E.Prev!;
        if (E.Dx === horizontal && E !== EStart && E.Bot.x !== E.Next.Top.x)
          this.ReverseHorizontal(E);
        E = E.Prev!;
      }
      if (E.Dx === horizontal && E !== EStart && E.Bot.x !== E.Next.Top.x)
        this.ReverseHorizontal(E);
      Result = Result.Prev!; //move to the edge just beyond current bound
    }
    return Result;
  }

  public addPath(pg: Path, polyType: PolyType, closed: boolean): boolean {
    if (this.useLines) {
      if (!closed && polyType === PolyType.Clip)
        throw new ClipperError('AddPath: Open paths must be subject.');
    }
    else {
      if (!closed)
        throw new ClipperError('AddPath: Open paths have been disabled.');
    }

    let highI: int = pg.length - 1;
    if (closed) while (highI > 0 && intPointEquals(pg[highI], pg[0])) --highI;
    while (highI > 0 && intPointEquals(pg[highI], pg[highI - 1])) --highI;
    if ((closed && highI < 2) || (!closed && highI < 1)) return false;

    //create a new edge array ...
    const edges: TEdge[] = []; // new List<TEdge>(highI+1);
    edges.length = highI + 1;
    for (let i: int = 0; i <= highI; i++) edges[i] = new TEdge();

    let IsFlat: boolean = true;

    //1. Basic (first) edge initialization ...
    edges[1].Curr = pg[1];
    this.m_UseFullRange = ClipperBase.RangeTestNoRef(pg[0], this.m_UseFullRange);
    this.m_UseFullRange = ClipperBase.RangeTestNoRef(pg[highI], this.m_UseFullRange);
    ClipperBase.InitEdge(edges[0], edges[1], edges[highI], pg[0]);
    ClipperBase.InitEdge(edges[highI], edges[0], edges[highI - 1], pg[highI]);
    for (let i: int = highI - 1; i >= 1; --i) {
      this.m_UseFullRange = ClipperBase.RangeTestNoRef(pg[i], this.m_UseFullRange);
      ClipperBase.InitEdge(edges[i], edges[i + 1], edges[i - 1], pg[i]);
    }
    let eStart: TEdge = edges[0];

    //2. Remove duplicate vertices, and (when closed) collinear edges ...
    let E: TEdge = eStart, eLoopStop: TEdge | undefined = eStart;
    while (true) {
      //nb: allows matching start and end points when not Closed ...
      if (intPointEquals(E!.Curr, E!.Next.Curr) && (closed || E!.Next !== eStart)) {
        if (E === E!.Next) break;
        if (E === eStart) eStart = E!.Next;
        E = ClipperBase.RemoveEdge(E!);
        eLoopStop = E;
        continue;
      }
      if (E!.Prev === E!.Next)
        break; //only two vertices
      else if (
        closed &&
        ClipperBase.IntPoint3SlopesEqual(E!.Prev!.Curr, E!.Curr, E!.Next.Curr, this.m_UseFullRange) &&
        (
        !this.preserveCollinear || !ClipperBase.Pt2IsBetweenPt1AndPt3(E!.Prev!.Curr, E!.Curr, E!.Next.Curr))
      ) {
        //Collinear edges are allowed for open paths but in closed paths
        //the default is to merge adjacent collinear edges into a single edge.
        //However, if the PreserveCollinear property is enabled, only overlapping
        //collinear edges (ie spikes) will be removed from closed paths.
        if (E === eStart) eStart = E!.Next;
        E = ClipperBase.RemoveEdge(E!);
        E = E.Prev!;
        eLoopStop = E;
        continue;
      }
      E = E!.Next;
      if ((E === eLoopStop) || (!closed && E!.Next === eStart)) break;
    }

    if ((!closed && (E === E!.Next)) || (closed && (E!.Prev === E!.Next)))
      return false;

    if (!closed) {
      this.m_HasOpenPaths = true;
      eStart!.Prev!.OutIdx = Skip;
    }

    //3. Do second stage of edge initialization ...
    E = eStart;
    do {
      this.InitEdge2(E!, polyType);
      E = E!.Next;
      if (IsFlat && E!.Curr.y !== eStart!.Curr.y) IsFlat = false;
    }
    while (E !== eStart);

    //4. Finally, add edge bounds to LocalMinima list ...

    //Totally flat paths must be handled differently when adding them
    //to LocalMinima list to avoid endless loops etc ...
    if (IsFlat) {
      if (closed) return false;
      E!.Prev!.OutIdx = Skip;
      const locMin: LocalMinima = new LocalMinima();
      locMin.Next = undefined;
      locMin.Y = E!.Bot.y;
      locMin.LeftBound = undefined;
      locMin.RightBound = E;
      locMin.RightBound!.Side = EdgeSide.esRight;
      locMin.RightBound!.WindDelta = 0;
      while (true) {
        if (E!.Bot.x !== E!.Prev!.Top.x) this.ReverseHorizontal(E!);
        if (E!.Next.OutIdx === Skip) break;
        E!.NextInLML = E!.Next;
        E = E!.Next;
      }
      this.InsertLocalMinima(locMin);
      this.m_edges.push(edges);
      return true;
    }

    this.m_edges.push(edges);
    let leftBoundIsForward: boolean = false;
    let EMin: TEdge | undefined;

    //workaround to avoid an endless loop in the while loop below when
    //open paths have matching start and end points ...
    if (intPointEquals(E!.Prev!.Bot, E!.Prev!.Top)) E = E!.Next;

    while (true) {
      E = ClipperBase.FindNextLocMin(E);
      if (E === EMin) {
        break;
      }
      else if (EMin === undefined) {
        EMin = E;
      }

      //E and E.Prev now share a local minima (left aligned if horizontal).
      //Compare their slopes to find which starts which bound ...
      const locMin = new LocalMinima();
      locMin.Next = undefined;
      locMin.Y = E.Bot.y;
      if (E.Dx < E.Prev!.Dx) {
        locMin.LeftBound = E.Prev;
        locMin.RightBound = E;
        leftBoundIsForward = false; //Q.nextInLML = Q.prev
      }
      else {
        locMin.LeftBound = E;
        locMin.RightBound = E.Prev;
        leftBoundIsForward = true; //Q.nextInLML = Q.next
      }
      locMin.LeftBound!.Side = EdgeSide.esLeft;
      locMin.RightBound!.Side = EdgeSide.esRight;

      if (!closed) {
        locMin.LeftBound!.WindDelta = 0;
      }
      else if (locMin.LeftBound!.Next === locMin.RightBound) {
        locMin.LeftBound!.WindDelta = -1;
      }
      else {
        locMin.LeftBound!.WindDelta = 1;
      }
      locMin.RightBound!.WindDelta = -locMin.LeftBound!.WindDelta;

      E = this.ProcessBound(locMin.LeftBound!, leftBoundIsForward);
      if (E.OutIdx === Skip) {
        E = this.ProcessBound(E, leftBoundIsForward);
      }

      let E2 = this.ProcessBound(locMin.RightBound!, !leftBoundIsForward);
      if (E2.OutIdx === Skip) {
        E2 = this.ProcessBound(E2, !leftBoundIsForward);
      }

      if (locMin.LeftBound!.OutIdx === Skip) {
        locMin.LeftBound = undefined;
      }
      else if (locMin.RightBound!.OutIdx === Skip) {
        locMin.RightBound = undefined;
      }
      this.InsertLocalMinima(locMin);
      if (!leftBoundIsForward) {
        E = E2;
      }
    }
    return true;
  }

  public addPaths(ppg: Paths, polyType: PolyType, closed: boolean): boolean {
    let result: boolean = false;
    for (let i: int = 0; i < ppg.length; ++i) {
      if (this.addPath(ppg[i], polyType, closed))
        result = true;
    }
    return result;
  }

  protected static Pt2IsBetweenPt1AndPt3(pt1: IntPoint, pt2: IntPoint, pt3: IntPoint): boolean {
    if (intPointEquals(pt1, pt3) || intPointEquals(pt1, pt2) || intPointEquals(pt3, pt2)) return false;
    else if (pt1.x !== pt3.x) return (pt2.x > pt1.x) === (pt2.x < pt3.x);
    else return (pt2.y > pt1.y) === (pt2.y < pt3.y);
  }

  private static RemoveEdge(e: TEdge): TEdge {
    //removes e from double_linked_list (but without removing from memory)
    e.Prev!.Next = e.Next;
    e.Next.Prev = e.Prev;
    const result = e.Next;
    e.Prev = undefined; //flag as removed (see ClipperBase.Clear)
    return result;
  }

  private SetDx(e: TEdge): void {
    e.Delta = this.newIntPoint((e.Top.x - e.Bot.x), (e.Top.y - e.Bot.y));
    if (e.Delta.y === 0) e.Dx = horizontal;
    else e.Dx = (e.Delta.x) / (e.Delta.y);
  }

  private InsertLocalMinima(newLm: LocalMinima): void {
    if (this.m_MinimaList === undefined ) {
      this.m_MinimaList = newLm;
    }
    else if (newLm.Y >= this.m_MinimaList.Y) {
      newLm.Next = this.m_MinimaList;
      this.m_MinimaList = newLm;
    }
    else {
      let tmpLm: LocalMinima | undefined = this.m_MinimaList;
      while (tmpLm.Next !== undefined && (newLm.Y < tmpLm.Next.Y))
        tmpLm = tmpLm.Next;
      newLm.Next = tmpLm.Next;
      tmpLm.Next = newLm;
    }
  }

  protected PopLocalMinimaNoOut(Y: CInt): {res: boolean, current: LocalMinima | undefined} { // out current: boolean -> { res, current }
    const current = this.m_CurrentLM;
    if (this.m_CurrentLM !== undefined && this.m_CurrentLM.Y === Y) {
      this.m_CurrentLM = this.m_CurrentLM.Next;
      return { res: true, current: current };
    }
    return { res: false, current: current };
  }

  private ReverseHorizontal(e: TEdge): void {
    //swap horizontal edges' top and bottom x's so they follow the natural
    //progression of the bounds - ie so their xbots will align with the
    //adjoining lower edge. [Helpful in the ProcessHorizontal() method.]

    const oldTopX = e.Top.x;
    if (this.useXyz) {
      const topZ = e.Bot.z;
      const botZ = e.Top.z;

      e.Top = newIntPointXYZ(e.Bot.x, e.Top.y, topZ);
      e.Bot = newIntPointXYZ(oldTopX, e.Bot.y, botZ);
    }
    else {
      e.Top = newIntPointXY(e.Bot.x, e.Top.y);
      e.Bot = newIntPointXY(oldTopX, e.Bot.y);
    }

    // changed the function that mutates points to another that doesn't
    /*
     const tmpx = e.Top.X;
     e.Top.X = e.Bot.X;
     e.Bot.X = tmpx;

     if (use_xyz) {
     const tmpz = (e.Top as IntPointXYZ).Z;
     (e.Top as IntPointXYZ).Z = (e.Bot as IntPointXYZ).Z;
     (e.Bot as IntPointXYZ).Z = tmpz;
     }*/
  }

  protected Reset(): void { // virtual
    this.m_CurrentLM = this.m_MinimaList;
    if (this.m_CurrentLM === undefined)
      return; //ie nothing to process

    //reset all edges ...
    this.m_Scanbeam = undefined;
    let lm: LocalMinima | undefined = this.m_MinimaList;
    while (lm !== undefined) {
      this.InsertScanbeam(lm.Y);
      let e: TEdge | undefined = lm.LeftBound;
      if (e !== undefined) {
        e.Curr = e.Bot;
        e.OutIdx = Unassigned;
      }
      e = lm.RightBound;
      if (e !== undefined) {
        e.Curr = e.Bot;
        e.OutIdx = Unassigned;
      }
      lm = lm.Next;
    }
    this.m_ActiveEdges = undefined;
  }

  public static getBounds(paths: Paths): IntRect {
    let i: int = 0;
    const cnt: int = paths.length;
    while (i < cnt && paths[i].length === 0)
      i++;

    const result: IntRect = {left: 0, top: 0, bottom: 0, right: 0};
    if (i === cnt)
      return result;

    result.left = paths[i][0].x;
    result.right = result.left;
    result.top = paths[i][0].y;
    result.bottom = result.top;
    for (; i < cnt; i++) {
      for (let j: int = 0; j < paths[i].length; j++) {
        if (paths[i][j].x < result.left)
          result.left = paths[i][j].x;
        else if (paths[i][j].x > result.right)
          result.right = paths[i][j].x;
        if (paths[i][j].y < result.top)
          result.top = paths[i][j].y;
        else if (paths[i][j].y > result.bottom)
          result.bottom = paths[i][j].y;
      }
    }
    return result;
  }

  protected InsertScanbeam(Y: number): void {
    //single-linked list: sorted descending, ignoring dups.
    if (this.m_Scanbeam === undefined) {
      this.m_Scanbeam = new Scanbeam();
      this.m_Scanbeam.Next = undefined;
      this.m_Scanbeam.Y = Y;
    }
    else if (Y > this.m_Scanbeam.Y) {
      const newSb: Scanbeam = new Scanbeam();
      newSb.Y = Y;
      newSb.Next = this.m_Scanbeam;
      this.m_Scanbeam = newSb;
    }
    else {
      let sb2: Scanbeam = this.m_Scanbeam;
      while (sb2.Next !== undefined && Y <= sb2.Next.Y) {
        sb2 = sb2.Next;
      }
      if (Y === sb2.Y) {
        return; //ie ignores duplicates
      }
      const newSb = new Scanbeam();
      newSb.Y = Y;
      newSb.Next = sb2.Next;
      sb2.Next = newSb;
    }
  }

  protected PopScanbeamNoOut(): { res: boolean, Y: number} { // out y: boolean -> { res, y }
    if (this.m_Scanbeam === undefined) {
      return { res: false, Y: 0};
    }
    const Y = this.m_Scanbeam.Y;
    this.m_Scanbeam = this.m_Scanbeam.Next;
    return { res: true, Y: Y};
  }

  protected LocalMinimaPending(): boolean {
    return this.m_CurrentLM !== undefined;
  }

  protected CreateOutRec(): OutRec {
    const result = new OutRec();
    result.Idx = Unassigned;
    result.IsHole = false;
    result.IsOpen = false;
    result.FirstLeft = undefined;
    result.Pts = undefined;
    result.BottomPt = undefined;
    result.PolyNode = undefined;
    this.m_PolyOuts.push(result);
    result.Idx = this.m_PolyOuts.length - 1;
    return result;
  }

  protected DisposeOutRec(index: number): void {
    let outRec: OutRec | undefined = this.m_PolyOuts[index];
    outRec!.Pts = undefined;
    outRec = undefined;
    this.m_PolyOuts[index] = undefined;
  }

  protected UpdateEdgeIntoAELNoRef(e: TEdge): TEdge { // ref e -> in e: e
    if (e.NextInLML === undefined) {
      throw new ClipperError('UpdateEdgeIntoAEL: invalid call');
    }
    const AelPrev = e.PrevInAEL;
    const AelNext = e.NextInAEL;
    e.NextInLML.OutIdx = e.OutIdx;
    if (AelPrev !== undefined) {
      AelPrev.NextInAEL = e.NextInLML;
    }
    else {
      this.m_ActiveEdges = e.NextInLML;
    }
    if (AelNext !== undefined) {
      AelNext.PrevInAEL = e.NextInLML;
    }
    e.NextInLML.Side = e.Side;
    e.NextInLML.WindDelta = e.WindDelta;
    e.NextInLML.WindCnt = e.WindCnt;
    e.NextInLML.WindCnt2 = e.WindCnt2;
    e = e.NextInLML;
    e.Curr = e.Bot;
    e.PrevInAEL = AelPrev;
    e.NextInAEL = AelNext;
    if (!ClipperBase.IsHorizontal(e)) {
      this.InsertScanbeam(e.Top.y);
    }
    return e;
  }

  protected SwapPositionsInAEL(edge1: TEdge, edge2: TEdge): void {
    //check that one or other edge hasn't already been removed from AEL ...
    if (edge1.NextInAEL === edge1.PrevInAEL ||
      edge2.NextInAEL === edge2.PrevInAEL) {
      return;
    }

    if (edge1.NextInAEL === edge2) {
      const next = edge2.NextInAEL;
      if (next !== undefined) {
        next.PrevInAEL = edge1;
      }
      const prev = edge1.PrevInAEL;
      if (prev !== undefined) {
        prev.NextInAEL = edge2;
      }
      edge2.PrevInAEL = prev;
      edge2.NextInAEL = edge1;
      edge1.PrevInAEL = edge2;
      edge1.NextInAEL = next;
    }
    else if (edge2.NextInAEL === edge1) {
      const next = edge1.NextInAEL;
      if (next !== undefined) {
        next.PrevInAEL = edge2;
      }
      const prev = edge2.PrevInAEL;
      if (prev !== undefined) {
        prev.NextInAEL = edge1;
      }
      edge1.PrevInAEL = prev;
      edge1.NextInAEL = edge2;
      edge2.PrevInAEL = edge1;
      edge2.NextInAEL = next;
    }
    else {
      const next = edge1.NextInAEL;
      const prev = edge1.PrevInAEL;
      edge1.NextInAEL = edge2.NextInAEL;
      if (edge1.NextInAEL !== undefined) {
        edge1.NextInAEL.PrevInAEL = edge1;
      }
      edge1.PrevInAEL = edge2.PrevInAEL;
      if (edge1.PrevInAEL !== undefined) {
        edge1.PrevInAEL.NextInAEL = edge1;
      }
      edge2.NextInAEL = next;
      if (edge2.NextInAEL !== undefined) {
        edge2.NextInAEL.PrevInAEL = edge2;
      }
      edge2.PrevInAEL = prev;
      if (edge2.PrevInAEL !== undefined) {
        edge2.PrevInAEL.NextInAEL = edge2;
      }
    }

    if (edge1.PrevInAEL === undefined) {
      this.m_ActiveEdges = edge1;
    }
    else if (edge2.PrevInAEL === undefined) {
      this.m_ActiveEdges = edge2;
    }
  }

  protected DeleteFromAEL(e: TEdge): void {
    const AelPrev = e.PrevInAEL;
    const AelNext = e.NextInAEL;
    if (AelPrev === undefined && AelNext === undefined && e !== this.m_ActiveEdges) {
      return; //already deleted
    }
    if (AelPrev !== undefined) {
      AelPrev.NextInAEL = AelNext;
    }
    else {
      this.m_ActiveEdges = AelNext;
    }
    if (AelNext !== undefined) {
      AelNext.PrevInAEL = AelPrev;
    }
    e.NextInAEL = undefined;
    e.PrevInAEL = undefined;
  }
}
