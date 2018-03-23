import * as clipperLib from '../src/lib';

let clipper: clipperLib.ClipperLibWrapper;

beforeAll(async () => {
    clipper = await clipperLib.loadNativeClipperLibInstanceAsync(
        clipperLib.NativeClipperLibRequestedFormat.WasmOnly
    );
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
                const polyResult = clipper.clipToPaths({
                    clipType: clipType,
            
                    subjectInputs: [
                        { data: poly1, closed: true },
                    ],

                    clipInputs: [
                        { data: poly2 }
                    ],
            
                    subjectFillType: polyFillType
                });
            
                expect(polyResult).toMatchSnapshot();
            });
        }
    }
});
