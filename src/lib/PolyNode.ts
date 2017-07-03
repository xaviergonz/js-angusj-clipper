import { EndType, JoinType, Path } from './types';
import { int } from './_types';

export class PolyNode {
  m_Parent?: PolyNode; // internal, can be undefined
  m_polygon: Path = []; // internal
  private m_Index: int = 0; // internal
  m_jointype: JoinType = JoinType.Square; // internal
  m_endtype: EndType = EndType.ClosedPolygon; // internal
  m_Childs: PolyNode[] = []; // internal

  private IsHoleNode(): boolean {
    let result = true;
    let node: PolyNode | undefined = this.m_Parent;
    while (node !== undefined) {
      result = !result;
      node = node.m_Parent;
    }
    return result;
  }

  public get childCount(): number {
    return this.m_Childs.length;
  }

  public get contour(): Path {
    return this.m_polygon;
  }

  AddChild(Child: PolyNode): void { // internal
    const cnt: int = this.m_Childs.length;
    this.m_Childs.push(Child);
    Child.m_Parent = this;
    Child.m_Index = cnt;
  }

  public getNext(): PolyNode | undefined {
    if (this.m_Childs.length > 0)
      return this.m_Childs[0];
    else
      return this.GetNextSiblingUp();
  }

  private GetNextSiblingUp(): PolyNode | undefined {
    if (this.m_Parent === undefined)
      return undefined;
    else if (this.m_Index === this.m_Parent.m_Childs.length - 1) {
      //noinspection TailRecursionJS
      return this.m_Parent.GetNextSiblingUp();
    }
    else
      return this.m_Parent.m_Childs[this.m_Index + 1];
  }

  public get childs(): PolyNode[] {
    return this.m_Childs;
  }

  public get parent(): PolyNode | undefined {
    return this.m_Parent;
  }

  public get isHole(): boolean {
    return this.IsHoleNode();
  }

  public isOpen: boolean = false;
}
