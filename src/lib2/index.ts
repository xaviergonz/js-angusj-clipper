import { Clipper, ClipperInitOptions } from './Clipper';
import { ClipperOffset } from './ClipperOffset';
import { hiRange } from './constants';
import { ClipType, EndType, JoinType, PolyFillType, PolyType } from './enums';
import {
  area,
  cleanPolygon,
  cleanPolygons,
  closedPathsFromPolyTree,
  minkowskiDiff,
  minkowskiSumPath,
  minkowskiSumPaths,
  openPathsFromPolyTree,
  orientation,
  pointInPolygon,
  PointInPolygonResult,
  polyTreeToPaths,
  reversePath,
  reversePaths,
  scalePath,
  scalePaths,
  simplifyPolygon,
  simplifyPolygons
} from './functions';
import { IntPoint } from './IntPoint';
import { IntRect } from './IntRect';
import { NativeClipperLibInstance } from './native/NativeClipperLibInstance';
import { Path } from './Path';
import { Paths } from './Paths';
import { PolyNode } from './PolyNode';
import { PolyTree } from './PolyTree';

export {
  Clipper, ClipperInitOptions, ClipType, PolyType,
  ClipperOffset, EndType, JoinType,
  area,
  cleanPolygon,
  cleanPolygons,
  closedPathsFromPolyTree,
  minkowskiDiff,
  minkowskiSumPath,
  minkowskiSumPaths,
  openPathsFromPolyTree,
  orientation,
  pointInPolygon,
  PointInPolygonResult,
  polyTreeToPaths,
  reversePath,
  reversePaths,
  scalePath,
  scalePaths,
  simplifyPolygon,
  simplifyPolygons,
  PolyNode,
  PolyTree,
  hiRange, IntPoint, IntRect, NativeClipperLibInstance, Path, Paths, PolyFillType
};

let wasmModule: NativeClipperLibInstance | undefined | Error;
let asmJsModule: NativeClipperLibInstance | undefined;

/**
 * Format to use when loading the nat ive library.
 */
export enum NativeClipperLibFormat {
  WasmWithAsmJsFallback = 'wasmWithAsmJsFallback',
  WasmOnly = 'wasmOnly',
  AsmJsOnly = 'asmJsOnly',
}

/**
 * Result of createNativeClipperLibAsync
 */
export interface CreateNativeClipperLibResult {
  /**
   * Native library instance
   */
  instance: NativeClipperLibInstance;
  /**
   * Native library format
   */
  format: 'wasm' | 'asmJs';
}

/**
 * Asynchronously loads a new native instance of the clipper library to be shared across all method invocations.
 *
 * @param format - Format to load, either WasmThenAsmJs, WasmOnly or AsmJsOnly.
 * @param resourceFilePrefixUrl - URL prefix to add when looking for the clipper-wasm.wasm file, defaults to ''.
 * @return {Promise<NativeClipperLibInstance>} - Promise that resolves with the instance.
 */
export const loadNativeClipperLibInstanceAsync = async (format: NativeClipperLibFormat, resourceFilePrefixUrl: string = ''): Promise<CreateNativeClipperLibResult> => {
  // TODO: in the future use these methods instead https://github.com/jedisct1/libsodium.js/issues/94

  let tryWasm, tryAsmJs;
  switch (format) {
    case NativeClipperLibFormat.WasmWithAsmJsFallback:
      tryWasm = true;
      tryAsmJs = true;
      break;
    case NativeClipperLibFormat.WasmOnly:
      tryWasm = true;
      tryAsmJs = false;
      break;
    case NativeClipperLibFormat.AsmJsOnly:
      tryWasm = false;
      tryAsmJs = true;
      break;
    default:
      throw new Error('unknown native clipper format');
  }

  function getModuleAsync(initModule: any): Promise<NativeClipperLibInstance> {
    return new Promise<NativeClipperLibInstance>((resolve, reject) => {
      let finalModule: NativeClipperLibInstance | undefined;

      //noinspection JSUnusedLocalSymbols
      const moduleOverrides = {
        noExitRuntime: true,
        locateFile(file: string) {
          return resourceFilePrefixUrl + file;
        },
        preRun() {
          if (finalModule) {
            resolve(finalModule);
          }
          else {
            setTimeout(() => {
              resolve(finalModule);
            }, 1);
          }
        },
        quit(code: number, err: Error) {
          reject(err);
        }
      };

      finalModule = initModule(moduleOverrides);
    });
  }

  if (tryWasm) {
    if (wasmModule instanceof Error) {
      // skip
    }
    else if (wasmModule === undefined) {
      try {
        const initModule = require('../wasm/clipper-wasm').init;
        wasmModule = await getModuleAsync(initModule);

        return {
          instance: wasmModule,
          format: 'wasm'
        };
      }
      catch (err) {
        wasmModule = err;
      }
    }
    else {
      return {
        instance: wasmModule,
        format: 'wasm'
      };
    }
  }

  if (tryAsmJs) {
    if (asmJsModule instanceof Error) {
      // skip
    }
    else if (asmJsModule === undefined) {
      try {
        const initModule = require('../wasm/clipper').init;
        asmJsModule = await getModuleAsync(initModule);

        return {
          instance: asmJsModule,
          format: 'asmJs'
        };
      }
      catch (err) {
        asmJsModule = err;
      }
    }
    else {
      return {
        instance: asmJsModule,
        format: 'asmJs'
      };
    }
  }

  throw new Error('could not load native clipper in the desired format');
};
