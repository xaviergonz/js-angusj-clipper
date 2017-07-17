import * as clipperLib from '../lib';
import * as geo from 'geojson';
import { ClipperLibWrapper, ClipType, EndType, JoinType, OffsetParams, Path, Paths, PolyFillType, ClipParams } from '../lib';
import { doubleArrayToNativePaths, doubleArrayToPaths, nativePathsToDoubleArray, pathsToDoubleArray } from '../lib/native/PathsToNativePaths';
import { NativeClipperLibInstance } from '../lib/native/NativeClipperLibInstance';

const scale2 = 10000;

const polygonToPaths = (polygon: geo.Position[][]): Paths => {
  const paths: Paths = [];

  for (const linearRig of polygon) {
    const path: Path = [];

    for (const point of linearRig) {
      path.push({
        x: Math.round(point[0] * scale2),
        y: -Math.round(point[1] * scale2)
      });
    }

    paths.push(path);
  }

  return paths;
};

const multiPolygonToPaths = (multiPolygon: geo.Position[][][]): Paths => {
  let paths: Paths = [];

  for (const polygon of multiPolygon) {
    paths = [...paths, ...polygonToPaths(polygon)];
  }

  return paths;
};

const mp = multiPolygonToPaths(require('../demos/isles').islesMultipolygon);
const cp = polygonToPaths([
  [[94.2626953125, 23.9501953125], [142.9443359375, -13.7548828125], [142.998046875, -13.2275390625],
    [138.955078125, 23.2470703125], [94.2626953125, 23.9501953125]]]);

export function testOffset(clipper: ClipperLibWrapper, polytree: boolean) {
  console.time('offset');

  const data: OffsetParams = {
    offsetInputs: [
      {
        data: mp,
        joinType: JoinType.Miter,
        endType: EndType.ClosedPolygon
      }
    ],
    delta: 10000
  };

  let result;
  if (!polytree) {
    result = clipper.offsetToPaths(data);
  }
  else {
    result = clipper.offsetToPolyTree(data);
  }
  console.timeEnd('offset');
  //console.log(result.length);
}

export function testClip(clipper: ClipperLibWrapper, polytree: boolean) {
  console.time('clip');

  const data: ClipParams = {
    subjectInputs: [
      {
        data: mp,
        closed: true
      }
    ],
    clipInputs: [
      {
        data: cp
      }
    ],
    clipType: ClipType.Intersection,
    subjectFillType: PolyFillType.EvenOdd,
    clipFillType: PolyFillType.EvenOdd
  };

  let result;
  if (!polytree) {
    result = clipper.clipToPaths(data);
  }
  else {
    result = clipper.clipToPolyTree(data);
  }
  console.timeEnd('clip');
}


/*for (let i = 0; i < 100; i++) {
  //clipper.testPathConversion(100000);
  clipper.testPathsConversion(100000);
}*/

function testPathsConversion(clipper: NativeClipperLibInstance, myPathLen: number) {
  myPathLen /= 2;
  const myPath = [];
  for (let j = 0; j < myPathLen; j++) {
    myPath.push({x: j, y: j + 1});
  }
  const myPaths = [myPath, myPath];

  console.time('paths to native paths');

  const array = pathsToDoubleArray(clipper, myPaths);
  const p = doubleArrayToNativePaths(clipper, array, true);

  console.timeEnd('paths to native paths');

  console.log(p.size());

  console.time('native paths to paths');
  const array2 = nativePathsToDoubleArray(clipper, p, true);
  const path2 = doubleArrayToPaths(clipper, array2, true);
  console.timeEnd('native paths to paths');

  // paths should be equal
  const sameSize = path2[0].length === myPathLen && path2[1].length === myPathLen;
  console.log('same size', sameSize);
  if (sameSize) {
    let same = true;
    for (let i = 0; i < myPathLen; i++) {
      if (myPath[i].x !== path2[0][i].x || myPath[i].y !== path2[0][i].y) {
        same = false;
      }
    }
    console.log('same data', same);
  }
}

const main = async () => {
  console.time('init time');
  const wrapper = (await clipperLib.loadNativeClipperLibInstanceAsync(clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback, '../wasm/'));
  console.timeEnd('init time');

  const test = (polyTree: boolean) => {
    console.log(polyTree ? 'polytree' : 'paths');
    testOffset(wrapper, polyTree);
    testOffset(wrapper, polyTree);

    testClip(wrapper, polyTree);
    testClip(wrapper, polyTree);
    testClip(wrapper, polyTree);
    testClip(wrapper, polyTree);
    testClip(wrapper, polyTree);
    testClip(wrapper, polyTree);
    testClip(wrapper, polyTree);
    testClip(wrapper, polyTree);
    testClip(wrapper, polyTree);
  };

  test(true);
  test(false);

  // create some polygons
  const poly1 = [
    {x: 0, y: 0},
    {x: 10, y: 0},
    {x: 10, y: 10},
    {x: 0, y: 10},
    {x: 0, y: 0}
  ];

  const poly2 = [
    {x: 10, y: 0},
    {x: 20, y: 0},
    {x: 20, y: 10},
    {x: 10, y: 10},
    {x: 10, y: 0}
  ];

  // get their union
  const polyResult = wrapper.clipToPaths({
    clipType: clipperLib.ClipType.Union,

    subjectInputs: [
      { data: poly1, closed: true },
      { data: poly2, closed: true }
    ],

    subjectFillType: clipperLib.PolyFillType.EvenOdd
  });

  console.log(polyResult);
};
main().catch((err) => {
  if (!err.ignore) {
    console.log(err.stack);
    throw err;
  }
});

/*import * as clipper from '../lib/index';

const test1 = () => {
  const cb = new clipper.Clipper();
  cb.addPath([
    {x: 0, y: 0},
    {x: 10, y: 0},
    {x: 10, y: 10},
    {x: 0, y: 10},
    {x: 0, y: 0},
  ], clipper.PolyType.Subject, true);

  cb.addPath([
    {x: 10, y: 0},
    {x: 20, y: 0},
    {x: 20, y: 10},
    {x: 10, y: 10},
    {x: 10, y: 0},
  ], clipper.PolyType.Subject, true);


  console.log('start');
  const result = cb.executePaths(clipper.ClipType.Union);
  console.log('end');
  console.log(result);
};

const test2 = () => {
  const cb = new clipper.ClipperOffset();
  cb.addPath([
    {x: 0, y: 0},
    {x: 10, y: 0},
    {x: 10, y: 10},
    {x: 0, y: 10},
    {x: 0, y: 0},
  ], clipper.JoinType.Miter, clipper.EndType.ClosedPolygon);


  console.log('start');
  const result = cb.executePaths(5);
  console.log('end');
  console.log(result);
};

//test1();
test2();
*/
