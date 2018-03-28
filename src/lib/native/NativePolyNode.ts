import { NativeDeletable } from "./NativeDeletable";
import { NativePath } from "./NativePath";
import { NativeVector } from "./NativeVector";

export interface NativePolyNode extends NativeDeletable {
  contour: NativePath;
  childs: NativeVector<NativePolyNode>;
  getParent(): NativePolyNode | null;
  getNext(): NativePolyNode | null;
  isHole(): boolean;
  isOpen(): boolean;
  childCount(): number;
  index: number;
}
