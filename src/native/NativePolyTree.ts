import { NativePolyNode } from "./NativePolyNode";

export interface NativePolyTree extends NativePolyNode {
  clear(): void;
  getFirst(): NativePolyNode;
  total(): number;
}
