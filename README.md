# js-angusj-clipper

#### _Polygon and line clipping and offsetting library for Javascript/Typescript_

_a port of Angus Johnson's clipper to WebAssembly/Asm.js_

[![npm version](https://badge.fury.io/js/js-angusj-clipper.svg)](https://badge.fury.io/js/js-angusj-clipper)
[![Build Status](https://travis-ci.org/xaviergonz/js-angusj-clipper.svg?branch=master)](https://travis-ci.org/xaviergonz/js-angusj-clipper)

---

Install it with `npm install --save js-angusj-clipper`

**To support this project star it on [github](https://github.com/xaviergonz/js-angusj-clipper)!**

---

### What is this?

A library to make polygon clipping (boolean operations) and offsetting **fast** on Javascript thanks
to WebAssembly with a fallback to Asm.js, based on the excellent Polygon Clipping (also known as Clipper) library by
Angus Johnson.

---

### Why?

Because sometimes performance does matter and I could not find a javascript library
as fast or as rock solid as the C++ version of [Clipper](https://sourceforge.net/projects/polyclipping/).

As an example, the results of the benchmarks included on the test suite when running on my machine (node 9.10) are:

_Note, pureJs is [jsclipper](https://sourceforge.net/projects/jsclipper/), a pure JS port of the same library_

```
500 boolean operations over two circles of 5000 points each
  clipType: intersection, subjectFillType: evenOdd
    √ wasm (553ms)
    √ asmJs (1862ms)
    √ pureJs (1045ms)
  clipType: union, subjectFillType: evenOdd
    √ wasm (694ms)
    √ asmJs (2157ms)
    √ pureJs (1463ms)
  clipType: difference, subjectFillType: evenOdd
    √ wasm (659ms)
    √ asmJs (1878ms)
    √ pureJs (1383ms)
  clipType: xor, subjectFillType: evenOdd
    √ wasm (808ms)
    √ asmJs (2220ms)
    √ pureJs (1622ms)

10000 boolean operations over two circles of 100 points each
  clipType: intersection, subjectFillType: evenOdd
    √ wasm (449ms)
    √ asmJs (1080ms)
    √ pureJs (500ms)
  clipType: union, subjectFillType: evenOdd
    √ wasm (538ms)
    √ asmJs (1232ms)
    √ pureJs (495ms)
  clipType: difference, subjectFillType: evenOdd
    √ wasm (518ms)
    √ asmJs (1143ms)
    √ pureJs (456ms)
  clipType: xor, subjectFillType: evenOdd
    √ wasm (589ms)
    √ asmJs (1243ms)
    √ pureJs (500ms)

100 offset operations over a circle of 5000 points
  joinType: miter, endType: closedPolygon, delta: 5
    √ wasm (286ms)
    √ asmJs (1079ms)
    √ pureJs (1913ms)

5000 offset operations over a circle of 100 points
  joinType: miter, endType: closedPolygon, delta: 5
    √ wasm (227ms)
    √ asmJs (518ms)
    √ pureJs (796ms)
```

More or less, the results for **boolean operations** over moderately big polygons are:

- Pure JS port of the Clipper library: **~1.0s, baseline**
- This library (_WebAssembly_): **~0.5s**
- This library (_Asm.js_): **~1.5s** (mostly due to the emulation of 64-bit integer operations)

and for small polygons are:

- Pure JS port of the Clipper library: **~1.0s, baseline**
- This library (_WebAssembly_): **~1.1s** (due to the overhead of copying structures to/from JS/C++)
- This library (_Asm.js_): **~2.0s** (mostly due to the emulation of 64-bit integer operations + the overhead of copying structures to/from JS/C++)

As for **offsetting**, the results for a moderately big polygon are:

- Pure JS port of the Clipper library: **~1s, baseline**
- This library (_WebAssembly_): **~0.15s**
- This library (_Asm.js_): **~0.56s**

and for small polygons are:

- Pure JS port of the Clipper library: **~1s, baseline**
- This library (_WebAssembly_): **~0.28s**
- This library (_Asm.js_): **~0.65s**

---

### Getting started

```js
// import it with
import * as clipperLib from "js-angusj-clipper"; // es6 / typescript
// or
const clipperLib = require("js-angusj-clipper"); // nodejs style require

// or if you want the non-universal web-only version (for example for angular 6+)
// import it with
import * as clipperLib from "js-angusj-clipper/web"; // es6 / typescript
// or
const clipperLib = require("js-angusj-clipper/web"); // nodejs style require

async function mainAsync() {
  // create an instance of the library (usually only do this once in your app)
  const clipper = await clipperLib.loadNativeClipperLibInstanceAsync(
    // let it autodetect which one to use, but also available WasmOnly and AsmJsOnly
    clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback
  );

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
