import * as clipper from '../lib/index';
import { islesMultipolygon } from './isles';
import { Path, Paths } from '../lib';
import * as geo from 'geojson';

/*const scale2 = 100;
const subj_paths = clipper.scalePaths([[{x: 10, y: 10}, {x: 110, y: 10}, {x: 110, y: 110}, {x: 10, y: 110}],
  [{x: 20, y: 20}, {x: 20, y: 100}, {x: 100, y: 100}, {x: 100, y: 20}]], scale2);
const clip_paths = clipper.scalePaths([[{x: 50, y: 50}, {x: 150, y: 50}, {x: 150, y: 150}, {x: 50, y: 150}],
  [{x: 60, y: 60}, {x: 60, y: 140}, {x: 140, y: 140}, {x: 140, y: 60}]], scale2);*/

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

const subj_paths = multiPolygonToPaths(islesMultipolygon);
const clip_paths = polygonToPaths([[[94.2626953125, 23.9501953125],[142.9443359375, -13.7548828125],[142.998046875,-13.2275390625],[138.955078125,23.2470703125],[94.2626953125,23.9501953125]]]);

//console.log('sub', subj_paths);
//console.log('clip', clip_paths);
let solution_paths: clipper.Paths | undefined;


console.time('offset');
const off = new clipper.ClipperOffset({});
off.addPaths(subj_paths, clipper.JoinType.Miter, clipper.EndType.ClosedPolygon);  // true means closed path
solution_paths = off.executePaths(1 * scale2);
console.timeEnd('offset');


/*
console.time('asdf');
const cpr = new clipper.Clipper();
cpr.addPaths(subj_paths, clipper.PolyType.Subject, true);  // true means closed path
cpr.addPaths(clip_paths, clipper.PolyType.Clip, true);

solution_paths = cpr.executePaths(clipper.ClipType.Intersection, clipper.PolyFillType.NonZero, clipper.PolyFillType.NonZero);
console.timeEnd('asdf');
console.log((cpr as any).m_UseFullRange);*/

//console.log(JSON.stringify(solution_paths));

// Scale down coordinates and draw ...
let svg = '<svg style="background-color:#dddddd" width="800" height="500" viewBox="91 -20 50 50">';
svg += `<path fill="yellow" d="${paths2string(solution_paths!, scale2)}"/>`;
svg += '</svg>';
document!.getElementById('svgcontainer')!.innerHTML = svg;

// Converts Paths to SVG path string
// and scales down the coordinates
function paths2string(paths: clipper.Paths, scale: number = 1) {
  let svgpath = '', i, j;
  for (i = 0; i < paths.length; i++) {
    for (j = 0; j < paths[i].length; j++) {
      if (!j) svgpath += 'M';
      else svgpath += 'L';
      svgpath += `${paths[i][j].x / scale}, ${paths[i][j].y / scale}`;
    }
    svgpath += 'Z';
  }
  if (svgpath === '') svgpath = 'M0,0';
  return svgpath;
}

(window as any).test = () => {
  console!.time('start');
  /*for (let i = 0; i < 100; i++) {
    const cpr2 = new clipper.Clipper();
    cpr2.addPaths(subj_paths, clipper.PolyType.Subject, true);  // true means closed path
    cpr2.addPaths(clip_paths, clipper.PolyType.Clip, true);
    solution_paths = cpr2.executePaths(clipper.ClipType.Intersection, clipper.PolyFillType.NonZero, clipper.PolyFillType.NonZero);
  }*/

  const off = new clipper.ClipperOffset({});
  off.addPaths(subj_paths, clipper.JoinType.Miter, clipper.EndType.ClosedPolygon);  // true means closed path
  solution_paths = off.executePaths(1 * scale2);

  console!.timeEnd('start');
};
