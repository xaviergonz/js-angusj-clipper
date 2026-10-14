# js-angusj-clipper

#### _Polygon and line clipping and offsetting library for Javascript/Typescript_

_a port of Angus Johnson's clipper to WebAssembly_

[![npm version](https://badge.fury.io/js/js-angusj-clipper.svg)](https://badge.fury.io/js/js-angusj-clipper)
[![CI](https://github.com/xaviergonz/js-angusj-clipper/actions/workflows/ci.yml/badge.svg)](https://github.com/xaviergonz/js-angusj-clipper/actions/workflows/ci.yml)

---

Install it with `npm install --save js-angusj-clipper`

**To support this project star it on [github](https://github.com/xaviergonz/js-angusj-clipper)!**

---

### What is this?

A library to make polygon clipping (boolean operations) and offsetting **fast** on Javascript thanks
to WebAssembly, based on the excellent Polygon Clipping (also known as Clipper) library by
Angus Johnson.

---

### Why?

Because sometimes performance does matter and I could not find a javascript library
as fast or as rock solid as the C++ version of [Clipper](https://sourceforge.net/projects/polyclipping/).

As an example, the results of the benchmarks included on the test suite when running on my machine (Node 26.10.0, Apple M1 Max, median of 3 runs) are:

_Note, pureJs is [jsclipper](https://sourceforge.net/projects/jsclipper/), a pure JS port of the same library_

```
    500 boolean operations over two circles of 5000 points each
      clipType: intersection, subjectFillType: evenOdd
        ✓ wasm (183 ms)
        ✓ pureJs (564 ms)
      clipType: union, subjectFillType: evenOdd
        ✓ wasm (230 ms)
        ✓ pureJs (602 ms)
      clipType: difference, subjectFillType: evenOdd
        ✓ wasm (198 ms)
        ✓ pureJs (563 ms)
      clipType: xor, subjectFillType: evenOdd
        ✓ wasm (249 ms)
        ✓ pureJs (642 ms)
    10000 boolean operations over two circles of 100 points each
      clipType: intersection, subjectFillType: evenOdd
        ✓ wasm (93 ms)
        ✓ pureJs (247 ms)
      clipType: union, subjectFillType: evenOdd
        ✓ wasm (123 ms)
        ✓ pureJs (277 ms)
      clipType: difference, subjectFillType: evenOdd
        ✓ wasm (103 ms)
        ✓ pureJs (253 ms)
      clipType: xor, subjectFillType: evenOdd
        ✓ wasm (132 ms)
        ✓ pureJs (280 ms)
    100 offset operations over a circle of 5000 points
      joinType: miter, endType: closedPolygon, delta: 5
        ✓ wasm (112 ms)
        ✓ pureJs (997 ms)
      joinType: miter, endType: closedPolygon, delta: 0
        ✓ wasm (28 ms)
        ✓ pureJs (142 ms)
      joinType: miter, endType: closedPolygon, delta: -5
        ✓ wasm (128 ms)
        ✓ pureJs (1116 ms)
    5000 offset operations over a circle of 100 points
      joinType: miter, endType: closedPolygon, delta: 5
        ✓ wasm (49 ms)
        ✓ pureJs (475 ms)
      joinType: miter, endType: closedPolygon, delta: 0
        ✓ wasm (45 ms)
        ✓ pureJs (242 ms)
      joinType: miter, endType: closedPolygon, delta: -5
        ✓ wasm (87 ms)
        ✓ pureJs (1132 ms)
```

More or less, the results for **boolean operations** over moderately big polygons are:

- Pure JS port of the Clipper library: **~1.0s, baseline**
- This library (_WebAssembly_): **~0.36s**

and for small polygons are:

- Pure JS port of the Clipper library: **~1.0s, baseline**
- This library (_WebAssembly_): **~0.43s** (due to the overhead of copying structures to/from JS/C++)

As for **offsetting**, the results for a moderately big polygon are:

- Pure JS port of the Clipper library: **~1s, baseline**
- This library (_WebAssembly_): **~0.12s**

and for small polygons are:

- Pure JS port of the Clipper library: **~1s, baseline**
- This library (_WebAssembly_): **~0.10s**

---

### Getting started

```js
// universal version
// import it with
import * as clipperLib from "js-angusj-clipper"; // es6 / typescript
// or
const clipperLib = require("js-angusj-clipper"); // nodejs style require

// web-only version (for example for angular 6+)
// import it with
import * as clipperLib from "js-angusj-clipper/web"; // es6 / typescript
// or
const clipperLib = require("js-angusj-clipper/web"); // nodejs style require

async function mainAsync() {
  // create an instance of the library (usually only do this once in your app)
  const clipper = await clipperLib.loadNativeClipperLibInstanceAsync();

  // create some polygons (note that they MUST be integer coordinates)
  const poly1 = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];

  const poly2 = [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 10 }];

  // get their union
  const polyResult = clipper.clipToPaths({
    clipType: clipperLib.ClipType.Union,

    subjectInputs: [{ data: poly1, closed: true }],

    clipInputs: [{ data: poly2 }],

    subjectFillType: clipperLib.PolyFillType.EvenOdd
  });

  /* polyResult will be:
  [
    [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 0, y: 10 }
    ]
  ]
 */
}

mainAsync();
```

---

For an in-depth description of the library see:

- [Overview](./docs/overview/index.md)
- [API Reference](./docs/apiReference/index.md)
- [FAQ](./docs/faq/index.md)

---

## Development

Building requires [Docker](https://www.docker.com/), which is used to run the emscripten compiler.

- `yarn build` compiles the TypeScript sources and the native clipper library (`src/wasm/*.js` are generated and not committed)
- `yarn test` runs the unit tests (run `yarn build` first so the native library exists)
- `yarn ci` runs lint, build and tests, as CI does
