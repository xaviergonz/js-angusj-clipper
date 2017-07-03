import * as clipper from '../lib/index';

const scale2 = 10000000;
const subj_paths = clipper.scalePaths([[{x: 10, y: 10}, {x: 110, y: 10}, {x: 110, y: 110}, {x: 10, y: 110}],
  [{x: 20, y: 20}, {x: 20, y: 100}, {x: 100, y: 100}, {x: 100, y: 20}]], scale2);
const clip_paths = clipper.scalePaths([[{x: 50, y: 50}, {x: 150, y: 50}, {x: 150, y: 150}, {x: 50, y: 150}],
  [{x: 60, y: 60}, {x: 60, y: 140}, {x: 140, y: 140}, {x: 140, y: 60}]], scale2);


let solution_paths: clipper.Paths | undefined;
const cpr = new clipper.Clipper();
cpr.addPaths(subj_paths, clipper.PolyType.Subject, true);  // true means closed path
cpr.addPaths(clip_paths, clipper.PolyType.Clip, true);

solution_paths = cpr.executePaths(clipper.ClipType.Union, clipper.PolyFillType.NonZero, clipper.PolyFillType.NonZero);
console.log((cpr as any).m_UseFullRange);

// console.log(JSON.stringify(solution_paths));

// Scale down coordinates and draw ...
let svg = '<svg style="background-color:#dddddd" width="160" height="160">';
svg += `<path stroke="black" fill="yellow" stroke-width="2" d="${paths2string(solution_paths!, scale2)}"/>`;
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
const paths = [[{x: 10, y: 10}, {x: 110, y: 10}, {x: 110, y: 110}, {x: 10, y: 110}]];
console.log(JSON.stringify(paths));
clipper.reversePaths(paths);
console.log(JSON.stringify(paths));

(window as any).test = () => {
  for (let i = 0; i < 100; i++) {
    console!.time('start');
    const cpr2 = new clipper.Clipper();
    cpr2.addPaths(subj_paths, clipper.PolyType.Subject, true);  // true means closed path
    cpr2.addPaths(clip_paths, clipper.PolyType.Clip, true);

    solution_paths = cpr2.executePaths(clipper.ClipType.Union, clipper.PolyFillType.NonZero, clipper.PolyFillType.NonZero);
    console!.timeEnd('start');
  }
};
