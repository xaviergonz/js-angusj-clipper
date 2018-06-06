import { NativeDeletable } from "./NativeDeletable";
import { NativeEndType, NativeJoinType } from "./nativeEnums";
import { NativePath } from "./NativePath";
import { NativePaths } from "./NativePaths";
import { NativePolyTree } from "./NativePolyTree";

export interface NativeClipperOffset extends NativeDeletable {
  addPath(outPath: NativePath, joinType: NativeJoinType, endType: NativeEndType): void;
  addPaths(outPaths: NativePaths, joinType: NativeJoinType, endType: NativeEndType): void;
  executePaths(outPaths: NativePaths, delta: number): void;
  executePolyTree(outPolyTree: NativePolyTree, delta: number): void;
  clear(): void;
  miterLimit: number;
  arcTolerance: number;
}
