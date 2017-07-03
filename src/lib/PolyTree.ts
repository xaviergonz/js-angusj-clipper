import { PolyNode } from './PolyNode';

export class PolyTree extends PolyNode {
  m_AllPolys: (PolyNode | undefined)[] = []; // internal

  public clear(): void {
    for (let i = 0; i < this.m_AllPolys.length; i++) {
      this.m_AllPolys[i] = undefined;
    }
    this.m_AllPolys.length = 0;
    this.m_Childs.length = 0;
  }

  public getFirst(): PolyNode | undefined {
    if (this.m_Childs.length > 0)
      return this.m_Childs[0];
    else
      return undefined;
  }

  public get total(): number {
    let result = this.m_AllPolys.length;
    //with negative offsets, ignore the hidden outer polygon ...
    if (result > 0 && this.m_Childs[0] !== this.m_AllPolys[0]) result--;
    return result;
  }
}
