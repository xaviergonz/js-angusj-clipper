import { double, int } from './_types';
import { CInt, ClipType, EndType, JoinType, Path, Paths, PolyFillType, PolyType } from './types';
import { cloneIntPointXYWithX, cloneIntPointXYZWithX, emptyIntPoint, IntPoint, intPointEquals, newIntPointXY, newIntPointXYZ } from './IntPoint';
import { PolyNode } from './PolyNode';
import { near_zero, Round } from './_functions';
import { Clipper } from './Clipper';
import { ClipperBase } from './ClipperBase';
import { PolyTree } from './PolyTree';
import { orientation } from './functions';

interface DoublePoint { // struct
  readonly dX: double;
  readonly dY: double;
}

const two_pi = Math.PI * 2;
const def_arc_tolerance = 0.25;

export interface ClipperOffsetInitOptions {
  miterLimit?: number;
  arcTolerance?: number;
  useXyz?: number; // new
}

export class ClipperOffset {
  private m_destPolys?: Paths;
  private m_srcPoly?: Path;
  private m_destPoly?: Path;
  private m_normals: DoublePoint[] = [];
  private m_delta: double = 0;
  private m_sinA: double = 0;
  private m_sin: double = 0;
  private m_cos: double = 0;
  private m_miterLim: double = 0;
  private m_StepsPerRad: double = 0;

  private m_lowest: IntPoint = emptyIntPoint;
  private m_polyNodes: PolyNode = new PolyNode();

  public arcTolerance: number = 0;
  public miterLimit: number = 0;

  private newIntPoint: (x: CInt, y: CInt) => IntPoint;
  private cloneIntPointWithX: (p: IntPoint, x: CInt) => IntPoint;

  public constructor(initOptions: ClipperOffsetInitOptions = {}) {
    this.miterLimit = initOptions.miterLimit === undefined ? 2.0 : initOptions.miterLimit;
    this.arcTolerance = initOptions.arcTolerance === undefined ? def_arc_tolerance : initOptions.arcTolerance;
    const useXyz = initOptions.useXyz === undefined ? false : initOptions.useXyz;
    //this.m_lowest.X = -1;

    this.newIntPoint = useXyz ? newIntPointXYZ : newIntPointXY;
    this.cloneIntPointWithX = useXyz ? cloneIntPointXYZWithX : cloneIntPointXYWithX;

    this.m_lowest = this.cloneIntPointWithX(this.m_lowest, -1);
  }

  public clear(): void {
    this.m_polyNodes.childs.length = 0;
    //this.m_lowest.X = -1;
    this.m_lowest = this.cloneIntPointWithX(this.m_lowest, -1);
  }

  public addPath(path: Path, joinType: JoinType, endType: EndType): void {
    let highI = path.length - 1;
    if (highI < 0) {
      return;
    }
    const newNode = new PolyNode();
    newNode.m_jointype = joinType;
    newNode.m_endtype = endType;

    //strip duplicate points from path and also get index to the lowest point ...
    if (endType === EndType.ClosedLine || endType === EndType.ClosedPolygon) {
      while (highI > 0 && intPointEquals(path[0], path[highI])) {
        highI--;
      }
    }
    //newNode.m_polygon.Capacity = highI + 1;
    newNode.m_polygon.push(path[0]);
    let j: int = 0, k: int = 0;
    for (let i = 1; i <= highI; i++) {
      if (!intPointEquals(newNode.m_polygon[j], path[i])) {
        j++;
        newNode.m_polygon.push(path[i]);
        if (path[i].y > newNode.m_polygon[k].y ||
          path[i].y === newNode.m_polygon[k].y &&
          path[i].x < newNode.m_polygon[k].x) {
          k = j;
        }
      }
    }
    if (endType === EndType.ClosedPolygon && j < 2) {
      return;
    }

    this.m_polyNodes.AddChild(newNode);

    //if this path's lowest pt is lower than all the others then update m_lowest
    if (endType !== EndType.ClosedPolygon) {
      return;
    }
    if (this.m_lowest.x < 0) {
      this.m_lowest = this.newIntPoint(this.m_polyNodes.childCount - 1, k);
    }
    else {
      const ip = this.m_polyNodes.childs[this.m_lowest.x].m_polygon[this.m_lowest.y];
      if (newNode.m_polygon[k].y > ip.y ||
        newNode.m_polygon[k].y === ip.y &&
        newNode.m_polygon[k].x < ip.x) {
        this.m_lowest = this.newIntPoint(this.m_polyNodes.childCount - 1, k);
      }
    }
  }

  public addPaths(paths: Paths, joinType: JoinType, endType: EndType) {
    for (let ii = 0, max = paths.length; ii < max; ii++) {
      this.addPath(paths[ii], joinType, endType);
    }
  }

  private FixOrientations(): void {
    //fixup orientations of all closed paths if the orientation of the
    //closed path with the lowermost vertex is wrong ...
    if (this.m_lowest.x >= 0 &&
      !orientation(this.m_polyNodes.childs[this.m_lowest.x].m_polygon)) {
      for (let i = 0; i < this.m_polyNodes.childCount; i++) {
        const node = this.m_polyNodes.childs[i];
        if (node.m_endtype === EndType.ClosedPolygon ||
          node.m_endtype === EndType.ClosedLine &&
          orientation(node.m_polygon)) {
          node.m_polygon.reverse();
        }
      }
    }
    else {
      for (let i = 0; i < this.m_polyNodes.childCount; i++) {
        const node = this.m_polyNodes.childs[i];
        if (node.m_endtype === EndType.ClosedLine &&
          !orientation(node.m_polygon)) {
          node.m_polygon.reverse();
        }
      }
    }
  }

  private static GetUnitNormal(pt1: IntPoint, pt2: IntPoint): DoublePoint {
    let dx: double = pt2.x - pt1.x;
    let dy: double = pt2.y - pt1.y;
    if (dx === 0 && dy === 0) {
      return { dX: 0, dY: 0};
    }

    const f: double = 1.0 / Math.sqrt(dx * dx + dy * dy);
    dx *= f;
    dy *= f;

    return { dX: dy, dY: -dx };
  }

  private DoOffset(delta: double): void {
    this.m_destPolys = [];
    this.m_delta = delta;

    //if Zero offset, just copy any CLOSED polygons to m_p and return ...
    if (near_zero(delta)) {
      this.m_destPolys.length = this.m_polyNodes.childCount;
      let destPolysLength = 0;

      for (let i = 0; i < this.m_polyNodes.childCount; i++) {
        const node = this.m_polyNodes.childs[i];
        if (node.m_endtype === EndType.ClosedPolygon) {
          this.m_destPolys[destPolysLength++] = node.m_polygon;
        }
      }
      this.m_destPolys.length = destPolysLength;
      return;
    }

    //see offset_triginometry3.svg in the documentation folder ...
    if (this.miterLimit > 2) {
      this.m_miterLim = 2 / (this.miterLimit * this.miterLimit);
    }
    else {
      this.m_miterLim = 0.5;
    }

    let y: double = 0;
    if (this.arcTolerance <= 0.0) {
      y = def_arc_tolerance;
    }
    else if (this.arcTolerance > Math.abs(delta) * def_arc_tolerance) {
      y = Math.abs(delta) * def_arc_tolerance;
    }
    else {
      y = this.arcTolerance;
    }
    //see offset_triginometry2.svg in the documentation folder ...
    const steps: double = Math.PI / Math.acos(1 - y / Math.abs(delta));
    this.m_sin = Math.sin(two_pi / steps);
    this.m_cos = Math.cos(two_pi / steps);
    this.m_StepsPerRad = steps / two_pi;
    if (delta < 0.0) {
      this.m_sin = -this.m_sin;
    }

    //this.m_destPolys.Capacity = this.m_polyNodes.ChildCount * 2;
    for (let i = 0; i < this.m_polyNodes.childCount; i++) {
      const node = this.m_polyNodes.childs[i];
      this.m_srcPoly = node.m_polygon;

      const len = this.m_srcPoly.length;

      if (len === 0 || delta <= 0 && (len < 3 ||
        node.m_endtype !== EndType.ClosedPolygon)) {
        continue;
      }

      this.m_destPoly = [];

      if (len === 1) {
        if (node.m_jointype === JoinType.Round) {
          let X: double = 1.0, Y: double = 0.0;
          for (let j = 1; j <= steps; j++) {
            this.m_destPoly.push(this.newIntPoint(
              Round(this.m_srcPoly[0].x + X * delta),
              Round(this.m_srcPoly[0].y + Y * delta)
            ));
            const X2 = X;
            X = X * this.m_cos - this.m_sin * Y;
            Y = X2 * this.m_sin + Y * this.m_cos;
          }
        }
        else {
          let X: double = -1.0, Y: double = -1.0;
          for (let j = 0; j < 4; ++j) {
            this.m_destPoly.push(this.newIntPoint(
              Round(this.m_srcPoly[0].x + X * delta),
              Round(this.m_srcPoly[0].y + Y * delta)
            ));
            if (X < 0) {
              X = 1;
            }
            else if (Y < 0) {
              Y = 1;
            }
            else {
              X = -1;
            }
          }
        }
        this.m_destPolys.push(this.m_destPoly);
        continue;
      }

      //build m_normals ...
      this.m_normals.length = 0;
      //this.m_normals.Capacity = len;
      for (let j = 0; j < len - 1; j++) {
        this.m_normals.push(ClipperOffset.GetUnitNormal(this.m_srcPoly[j], this.m_srcPoly[j + 1]));
      }
      if (node.m_endtype === EndType.ClosedLine ||
        node.m_endtype === EndType.ClosedPolygon) {
        this.m_normals.push(ClipperOffset.GetUnitNormal(this.m_srcPoly[len - 1], this.m_srcPoly[0]));
      }
      else {
        // no need to clone since double points are never modified
        this.m_normals.push(this.m_normals[len - 2]);
      }

      if (node.m_endtype === EndType.ClosedPolygon) {
        let k = len - 1;
        for (let j = 0; j < len; j++) {
          k = this.OffsetPointNoRef(j, k, node.m_jointype);
        }
        this.m_destPolys.push(this.m_destPoly);
      }
      else if (node.m_endtype === EndType.ClosedLine) {
        let k = len - 1;
        for (let j = 0; j < len; j++) {
          k = this.OffsetPointNoRef(j, k, node.m_jointype);
        }
        this.m_destPolys.push(this.m_destPoly);
        this.m_destPoly = [];
        //re-build m_normals ...
        const n: DoublePoint = this.m_normals[len - 1];
        for (let j = len - 1; j > 0; j--) {
          this.m_normals[j] = { dX: -this.m_normals[j - 1].dX, dY: -this.m_normals[j - 1].dY };
        }
        this.m_normals[0] = { dX: -n.dX, dY: -n.dY };
        k = 0;
        for (let j = len - 1; j >= 0; j--) {
          k = this.OffsetPointNoRef(j, k, node.m_jointype);
        }
        this.m_destPolys.push(this.m_destPoly);
      }
      else {
        let k = 0;
        for (let j = 1; j < len - 1; ++j) {
          k = this.OffsetPointNoRef(j, k, node.m_jointype);
        }

        if (node.m_endtype === EndType.OpenButt) {
          let pt1: IntPoint;
          const j = len - 1;
          pt1 = this.newIntPoint(Round(this.m_srcPoly[j].x + this.m_normals[j].dX * delta), Round(this.m_srcPoly[j].y + this.m_normals[j].dY * delta));
          this.m_destPoly.push(pt1);
          pt1 = this.newIntPoint(Round(this.m_srcPoly[j].x - this.m_normals[j].dX * delta), Round(this.m_srcPoly[j].y - this.m_normals[j].dY * delta));
          this.m_destPoly.push(pt1); // no need to clone
        }
        else {
          const j = len - 1;
          k = len - 2;
          this.m_sinA = 0;
          this.m_normals[j] = { dX: -this.m_normals[j].dX, dY: -this.m_normals[j].dY };
          if (node.m_endtype === EndType.OpenSquare) {
            this.DoSquare(j, k);
          }
          else {
            this.DoRound(j, k);
          }
        }

        //re-build m_normals ...
        for (let j = len - 1; j > 0; j--) {
          this.m_normals[j] = { dX: -this.m_normals[j - 1].dX, dY: -this.m_normals[j - 1].dY };
        }

        this.m_normals[0] = { dX: -this.m_normals[1].dX, dY: -this.m_normals[1].dY };

        k = len - 1;
        for (let j = k - 1; j > 0; --j) {
          k = this.OffsetPointNoRef(j, k, node.m_jointype);
        }

        if (node.m_endtype === EndType.OpenButt) {
          let pt1: IntPoint;
          pt1 = this.newIntPoint(Round(this.m_srcPoly[0].x - this.m_normals[0].dX * delta), Round(this.m_srcPoly[0].y - this.m_normals[0].dY * delta));
          this.m_destPoly.push(pt1);
          pt1 = this.newIntPoint(Round(this.m_srcPoly[0].x + this.m_normals[0].dX * delta), Round(this.m_srcPoly[0].y + this.m_normals[0].dY * delta));
          this.m_destPoly.push(pt1); // no need to clone
        }
        else {
          k = 1;
          this.m_sinA = 0;
          if (node.m_endtype === EndType.OpenSquare) {
            this.DoSquare(0, 1);
          }
          else {
            this.DoRound(0, 1);
          }
        }
        this.m_destPolys.push(this.m_destPoly);
      }
    }
  }

  public executePaths(delta: number): Paths | undefined { // -> Paths | undefined
    this.FixOrientations();
    this.DoOffset(delta);
    //now clean up 'corners' ...
    const clpr = new Clipper();
    clpr.addPaths(this.m_destPolys!, PolyType.Subject, true);
    if (delta > 0) {
      return clpr.executePaths(ClipType.Union, PolyFillType.Positive, PolyFillType.Positive);
    }
    else {
      const r = ClipperBase.getBounds(this.m_destPolys!);
      const outer = [
        this.newIntPoint(r.left - 10, r.bottom + 10),
        this.newIntPoint(r.right + 10, r.bottom + 10),
        this.newIntPoint(r.right + 10, r.top - 10),
        this.newIntPoint(r.left - 10, r.top - 10)
      ];

      clpr.addPath(outer, PolyType.Subject, true);
      clpr.reverseSolution = true;
      const solution = clpr.executePaths(ClipType.Union, PolyFillType.Negative, PolyFillType.Negative);
      if (solution !== undefined && solution.length > 0) {
        solution.shift();
      }
      return solution;
    }
  }

  public executePolyTree(delta: number): PolyTree | undefined { // -> PolyTree | undefined
    this.FixOrientations();
    this.DoOffset(delta);

    //now clean up 'corners' ...
    const clpr = new Clipper();
    clpr.addPaths(this.m_destPolys!, PolyType.Subject, true);
    if (delta > 0) {
      return clpr.executePolyTree(ClipType.Union, PolyFillType.Positive, PolyFillType.Positive);
    }
    else {
      const r = ClipperBase.getBounds(this.m_destPolys!);
      const outer = [
        this.newIntPoint(r.left - 10, r.bottom + 10),
        this.newIntPoint(r.right + 10, r.bottom + 10),
        this.newIntPoint(r.right + 10, r.top - 10),
        this.newIntPoint(r.left - 10, r.top - 10)
      ];

      clpr.addPath(outer, PolyType.Subject, true);
      clpr.reverseSolution = true;
      const solution = clpr.executePolyTree(ClipType.Union, PolyFillType.Negative, PolyFillType.Negative);
      //remove the outer PolyNode rectangle ...
      if (solution === undefined) {
        return solution;
      }
      if (solution.childCount === 1 && solution.childs[0].childCount > 0) {
        const outerNode = solution.childs[0];
        //solution.Childs.Capacity = outerNode.ChildCount;
        solution.childs[0] = outerNode.childs[0];
        solution.childs[0].m_Parent = solution;
        for (let i = 1; i < outerNode.childCount; i++) {
          solution.AddChild(outerNode.childs[i]);
        }
      }
      else {
        solution.clear();
      }
      return solution;
    }
  }

  private OffsetPointNoRef(j: int, /* ref */ k: int, jointype: JoinType): int { // ref k -> in k: k
    //cross product ...
    this.m_sinA = this.m_normals[k].dX * this.m_normals[j].dY - this.m_normals[j].dX * this.m_normals[k].dY;

    if (Math.abs(this.m_sinA * this.m_delta) < 1.0) {
      //dot product ...
      const cosA: double = this.m_normals[k].dX * this.m_normals[j].dX + this.m_normals[j].dY * this.m_normals[k].dY;
      if (cosA > 0) { // angle ==> 0 degrees
        this.m_destPoly!.push(this.newIntPoint(
          Round(this.m_srcPoly![j].x + this.m_normals[k].dX * this.m_delta),
          Round(this.m_srcPoly![j].y + this.m_normals[k].dY * this.m_delta)
        ));
        return k;
      }
      //else angle ==> 180 degrees
    }
    else if (this.m_sinA > 1.0) {
      this.m_sinA = 1.0;
    }
    else if (this.m_sinA < -1.0) {
      this.m_sinA = -1.0;
    }

    if (this.m_sinA * this.m_delta < 0) {
      this.m_destPoly!.push(this.newIntPoint(
        Round(this.m_srcPoly![j].x + this.m_normals[k].dX * this.m_delta),
        Round(this.m_srcPoly![j].y + this.m_normals[k].dY * this.m_delta)
      ));
      this.m_destPoly!.push(this.m_srcPoly![j]);
      this.m_destPoly!.push(this.newIntPoint(
        Round(this.m_srcPoly![j].x + this.m_normals[j].dX * this.m_delta),
        Round(this.m_srcPoly![j].y + this.m_normals[j].dY * this.m_delta)
      ));
    }
    else {
      switch (jointype) {
        case JoinType.Miter:
          const r: double = 1 + (this.m_normals[j].dX * this.m_normals[k].dX + this.m_normals[j].dY * this.m_normals[k].dY);
          if (r >= this.m_miterLim) {
            this.DoMiter(j, k, r);
          }
          else {
            this.DoSquare(j, k);
          }
          break;
        case JoinType.Square:
          this.DoSquare(j, k);
          break;
        case JoinType.Round:
          this.DoRound(j, k);
          break;
        default: break;
      }
    }
    k = j;
    return k;
  }

  private DoSquare(j: int, k: int): void {
    const dx: double = Math.tan(Math.atan2(this.m_sinA, this.m_normals[k].dX * this.m_normals[j].dX + this.m_normals[k].dY * this.m_normals[j].dY) / 4);
    this.m_destPoly!.push(this.newIntPoint(
      Round(this.m_srcPoly![j].x + this.m_delta * (this.m_normals[k].dX - this.m_normals[k].dY * dx)),
      Round(this.m_srcPoly![j].y + this.m_delta * (this.m_normals[k].dY + this.m_normals[k].dX * dx))
    ));
    this.m_destPoly!.push(this.newIntPoint(
      Round(this.m_srcPoly![j].x + this.m_delta * (this.m_normals[j].dX + this.m_normals[j].dY * dx)),
      Round(this.m_srcPoly![j].y + this.m_delta * (this.m_normals[j].dY - this.m_normals[j].dX * dx))
    ));
  }

  private DoMiter(j: int, k: int, r: double): void {
    const q: double = this.m_delta / r;
    this.m_destPoly!.push(this.newIntPoint(
      Round(this.m_srcPoly![j].x + (this.m_normals[k].dX + this.m_normals[j].dX) * q),
      Round(this.m_srcPoly![j].y + (this.m_normals[k].dY + this.m_normals[j].dY) * q)
    ));
  }

  private DoRound(j: int, k: int): void {
    const a: double = Math.atan2(this.m_sinA, this.m_normals[k].dX * this.m_normals[j].dX + this.m_normals[k].dY * this.m_normals[j].dY);
    const steps: int = Math.max(Round(this.m_StepsPerRad * Math.abs(a)), 1);

    let X: double = this.m_normals[k].dX, Y: double = this.m_normals[k].dY, X2: double = 0;
    for (let i = 0; i < steps; ++i) {
      this.m_destPoly!.push(this.newIntPoint(
        Round(this.m_srcPoly![j].x + X * this.m_delta),
        Round(this.m_srcPoly![j].y + Y * this.m_delta)
      ));
      X2 = X;
      X = X * this.m_cos - this.m_sin * Y;
      Y = X2 * this.m_sin + Y * this.m_cos;
    }
    this.m_destPoly!.push(this.newIntPoint(
      Round(this.m_srcPoly![j].x + this.m_normals[j].dX * this.m_delta),
      Round(this.m_srcPoly![j].y + this.m_normals[j].dY * this.m_delta)
    ));
  }
}

