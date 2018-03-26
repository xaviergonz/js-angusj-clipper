import * as clipperLib from '../src/lib';
import { pathsToPureJs, pathToPureJs, pureJsClipperLib, pureJsTestPolyOperation } from './pureJs';
import { circlePath } from './utils';

let clipperWasm: clipperLib.ClipperLibWrapper;
let clipperAsmJs: clipperLib.ClipperLibWrapper;

beforeAll(async () => {
  clipperWasm = await clipperLib.loadNativeClipperLibInstanceAsync(
    clipperLib.NativeClipperLibRequestedFormat.WasmOnly
  );
  clipperAsmJs = await clipperLib.loadNativeClipperLibInstanceAsync(
    clipperLib.NativeClipperLibRequestedFormat.AsmJsOnly
  );
}, 60000);

test('wasm instance must be loaded', () => {
  expect(clipperWasm).toBeDefined();
  expect(clipperWasm.instance).toBeDefined();
  expect(clipperWasm.format).toEqual(clipperLib.NativeClipperLibLoadedFormat.Wasm);
});

test('asmjs instance must be loaded', () => {
  expect(clipperAsmJs).toBeDefined();
  expect(clipperAsmJs.instance).toBeDefined();
  expect(clipperAsmJs.format).toEqual(clipperLib.NativeClipperLibLoadedFormat.AsmJs);
});

test('pureJs instance must be loaded', () => {
  expect(pureJsClipperLib).toBeDefined();
  expect(new pureJsClipperLib.Clipper()).toBeDefined();
});

describe('operations over simple polygons', () => {
  // create some polygons (note that they MUST be integer coordinates)
  const poly1 = [
    { x: 0, y: 10 },
    { x: 30, y: 10 },
    { x: 30, y: 20 },
    { x: 0, y: 20 },
  ];
  const pureJsPoly1 = pathToPureJs(poly1);

  const poly2 = [
    { x: 10, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 30 },
    { x: 10, y: 30 },
  ];
  const pureJsPoly2 = pathToPureJs(poly2);

  for (const clipType of [
    clipperLib.ClipType.Intersection,
    clipperLib.ClipType.Union,
    clipperLib.ClipType.Difference,
    clipperLib.ClipType.Xor,
  ]) {
    for (const polyFillType of [
      clipperLib.PolyFillType.EvenOdd
    ]) {
      test(`clipType: ${clipType}, subjectFillType: ${polyFillType}`, () => {
        const res = testPolyOperation(clipType, polyFillType, poly1, poly2, {
          wasm: true,
          asm: true,
        });

        const pureJsRes = pureJsTestPolyOperation(clipType, polyFillType, 'path', pureJsPoly1, pureJsPoly2);

        expect(res.asmResult).toEqual(res.wasmResult);
        expect(pureJsRes).toEqual(pathsToPureJs(res.wasmResult));
        expect(res.wasmResult).toMatchSnapshot();
      });
    }
  }
});

for (const benchmark of [{ ops: 500, points: 5000 }, { ops: 10000, points: 100 }]) {
  describe(`benchmark ${benchmark.ops} operations over two circles (${benchmark.points} points)`, () => {
    const poly1 = circlePath({ x: 1000, y: 1000 }, 1000, benchmark.points);
    const poly2 = circlePath({ x: 2500, y: 1000 }, 1000, benchmark.points);
    const pureJsPoly1 = pathToPureJs(poly1);
    const pureJsPoly2 = pathToPureJs(poly2);
    const scale = 100;
    pureJsClipperLib.JS.ScaleUpPaths(pureJsPoly1, scale);
    pureJsClipperLib.JS.ScaleUpPaths(pureJsPoly2, scale);

    for (const clipType of [
      clipperLib.ClipType.Intersection,
      clipperLib.ClipType.Union,
      clipperLib.ClipType.Difference,
      clipperLib.ClipType.Xor,
    ]) {
      for (const polyFillType of [
        clipperLib.PolyFillType.EvenOdd
      ]) {
        describe(`clipType: ${clipType}, subjectFillType: ${polyFillType}`, () => {
          for (const mode of ['wasm', 'asmJs', 'pureJs']) {
            test(`${mode}`, () => {
              for (let i = 0; i < benchmark.ops; i++) {
                if (mode === 'wasm' || mode === 'asmJs') {
                  const res = testPolyOperation(clipType, polyFillType, poly1, poly2, {
                    wasm: mode === 'wasm',
                    asm: mode === 'asmJs',
                  });
                }
                else if (mode === 'pureJs') {
                  const res = pureJsTestPolyOperation(clipType, polyFillType, 'path', pureJsPoly1, pureJsPoly2);
                }
              }
            });
          }
        });
      }
    }

  });
}

function testPolyOperation(
  clipType: clipperLib.ClipType,
  subjectFillType: clipperLib.PolyFillType,
  subjectInput: clipperLib.Path | clipperLib.Paths,
  clipInput: clipperLib.Path | clipperLib.Paths,
  format: { wasm: boolean, asm: boolean },
) {
  const data = {
    clipType: clipType,

    subjectInputs: [
      { data: subjectInput, closed: true },
    ],

    clipInputs: [
      { data: clipInput }
    ],

    subjectFillType: subjectFillType
  };

  return {
    wasmResult: format.wasm ? clipperWasm.clipToPaths(data) : undefined,
    asmResult: format.asm ? clipperAsmJs.clipToPaths(data) : undefined,
  };
}
