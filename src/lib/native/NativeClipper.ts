import { NativeClipType, NativePolyFillType } from './nativeEnums';
import { NativeClipperBase } from './NativeClipperBase';
import { NativePaths } from './NativePaths';
import { NativePolyTree } from './NativePolyTree';

export interface NativeClipper extends NativeClipperBase {
  executePaths(clipType: NativeClipType, outPaths: NativePaths, polyFillType: NativePolyFillType): boolean;
  executePathsWithFillTypes(clipType: NativeClipType, outPaths: NativePaths, subjPolyFillType: NativePolyFillType, clipPolyFillType: NativePolyFillType): boolean;
  executePolyTree(clipType: NativeClipType, outPolyTree: NativePolyTree, polyFillType: NativePolyFillType): boolean;
  executePolyTreeWithFillTypes(clipType: NativeClipType, outPolyTree: NativePolyTree, subjPolyFillType: NativePolyFillType, clipPolyFillType: NativePolyFillType): boolean;
  reverseSolution: boolean;
  strictlySimple: boolean;
}
