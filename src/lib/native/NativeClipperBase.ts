import { NativeDeletable } from "./NativeDeletable";
import { NativePolyType } from "./nativeEnums";
import { NativeIntRect } from "./NativeIntRect";
import { NativePath } from "./NativePath";
import { NativePaths } from "./NativePaths";

export interface NativeClipperBase extends NativeDeletable {
  addPath(path: NativePath, polyType: NativePolyType, closed: boolean): boolean;
  addPaths(paths: NativePaths, polyType: NativePolyType, closed: boolean): boolean;
  clear(): void;
  getBounds(): NativeIntRect;
  preserveCollinear: boolean;
}
