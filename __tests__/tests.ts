import * as clipperLib from '../src/lib';

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
  expect(clipperWasm.format).toEqual(clipperLib.NativeClipperLibLoadedFormat.Wasm);
});

test('asmjs instance must be loaded', () => {
  expect(clipperAsmJs.format).toEqual(clipperLib.NativeClipperLibLoadedFormat.AsmJs);
});

describe('operations over simple polygons', () => {
  // create some polygons (note that they MUST be integer coordinates)
  const poly1 = [
    { x: 0, y: 10 },
    { x: 30, y: 10 },
    { x: 30, y: 20 },
    { x: 0, y: 20 },
  ];

  const poly2 = [
    { x: 10, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 30 },
    { x: 10, y: 30 },
  ];

  for (const clipType of Object.values(clipperLib.ClipType)) {
    for (const polyFillType of [clipperLib.PolyFillType.EvenOdd]) {
      test(`clipType: ${clipType}, subjectFillType: ${polyFillType}`, () => {
        const data = {
          clipType: clipType,

          subjectInputs: [
            { data: poly1, closed: true },
          ],

          clipInputs: [
            { data: poly2 }
          ],

          subjectFillType: polyFillType
        };

        const polyResultWasm = clipperWasm.clipToPaths(data);
        const polyResultAsm = clipperAsmJs.clipToPaths(data);

        expect(polyResultWasm).toEqual(polyResultAsm);
        expect(polyResultWasm).toMatchSnapshot();
      });
    }
  }
});
