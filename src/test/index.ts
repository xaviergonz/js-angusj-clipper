import * as clipper from '../lib/index';

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

test1();
