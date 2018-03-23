# js-angusj-clipper
#### *Polygon and line clipping and offsetting library for Javascript/Typescript*

*a port of Angus Johnson's clipper to WebAssembly/Asm.js*

[![npm version](https://badge.fury.io/js/js-angusj-clipper.svg)](https://badge.fury.io/js/js-angusj-clipper)
[![Build Status](https://travis-ci.org/xaviergonz/js-angusj-clipper.svg?branch=master)](https://travis-ci.org/xaviergonz/js-angusj-clipper)

---

Install it with ```npm install --save js-angusj-clipper```

__To support this project star it on [github](https://github.com/xaviergonz/js-angusj-clipper)!__

---

### What is this?

A library to make polygon clipping (boolean operations) and offsetting **fast** on Javascript thanks 
to WebAssembly / Asm.js, based on the excellent Polygon Clipping (also known as Clipper) library by 
Angus Johnson.

---

### Why?

Because sometimes performance does matter and I could not find a javascript library
as fast or as rock solid as the C++ version of [Clipper](https://sourceforge.net/projects/polyclipping/).

As an example, the (totally unscientific) benchmarks on my machine for offsetting a big polygon are:
* Pure JS port of the Clipper library: **~11 seconds**
* This library (*Asm.js*): **~7.3 seconds** (mostly due to the lack of support for 64-bit integers)
* This library (*WebAssembly*): **~2.8 seconds** 

---

### Getting started

```js
// import it with
import * as clipperLib from 'js-angusj-clipper'; // es6 / typescript
// or
const clipperLib = require('js-angusj-clipper'); // nodejs style require

async function mainAsync() {
  
  // create an instance of the library (usually only do this once in your app)
  const clipper = await clipperLib.loadNativeClipperLibInstanceAsync(
    // let it autodetect which one to use, but also available WasmOnly and AsmJsOnly
    clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback    
  );
  
  // create some polygons (note that they MUST be integer coordinates)
  const poly1 = [
    {x: 0, y: 0},
    {x: 10, y: 0},
    {x: 10, y: 10},
    {x: 0, y: 10},
  ];
  
  const poly2 = [
    {x: 10, y: 0},
    {x: 20, y: 0},
    {x: 20, y: 10},
    {x: 10, y: 10},
  ];
  
  // get their union
  const polyResult = clipper.clipToPaths({
    clipType: clipperLib.ClipType.Union,

    subjectInputs: [
      { data: poly1, closed: true },
    ],

    clipInputs: [
      { data: poly2 }
    ],

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

* [Overview](./docs/overview/index.md)
* [API Reference](./docs/apiReference/index.md)
* [FAQ](./docs/faq/index.md)
