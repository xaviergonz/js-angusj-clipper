# CHANGELOG

## v2.0.0 (unreleased)

### Breaking changes

- Removed the Asm.js version of the library, only the WebAssembly version is available now. Asm.js was only a fallback for environments without WebAssembly, which nowadays is supported everywhere, and it is being deprecated by emscripten. As a bonus the package is about a third of its previous size.
- `loadNativeClipperLibInstanceAsync` no longer takes a format parameter.
- Removed the `NativeClipperLibRequestedFormat` and `NativeClipperLibLoadedFormat` enums, as well as the `ClipperLibWrapper.format` property.
- If the WebAssembly module fails to load, `loadNativeClipperLibInstanceAsync` now rejects with the underlying error instead of a generic `ClipperError`.
- The compiled output now targets ES2020 instead of ES5.
- Removed the `ClipperLibWrapper.instance` property, which exposed the raw native module.
- `ClipParams.reverseSolution` now works as documented (it was being ignored before), so solutions are returned with reversed orientation when it is set.
- Invalid inputs that make the native library fail (for example coordinates out of range) now throw a `ClipperError` with the native error message (or make the offset functions return `undefined`) instead of aborting the WebAssembly module with a `RuntimeError`.
- Requires support for WebAssembly exceptions (Chrome 95+, Firefox 100+, Safari 15.2+, Node 17+).

### Other changes

- Rewrote the bridge between JS and WebAssembly so each operation is a single native call over a reused memory buffer, instead of many calls creating and destroying native objects. Operations over small polygons are about 1.3-1.5x faster, and the WebAssembly bundle is about 30% smaller.
- Native memory buffers bigger than 1 MiB are now released after each operation instead of being kept around, so very big operations leave more room for later ones and the WebAssembly memory grows less (note that WebAssembly memory itself can never shrink).
- Made it work with the latest version of emscripten.
- Now using yarn v4.
- Updated all dependencies.

### Migrating from v1

1. Remove the format argument when loading the library:

   ```js
   // v1
   const clipper = await clipperLib.loadNativeClipperLibInstanceAsync(
     clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback // or WasmOnly / AsmJsOnly
   );

   // v2
   const clipper = await clipperLib.loadNativeClipperLibInstanceAsync();
   ```

2. Remove any checks of `clipper.format` (or uses of `NativeClipperLibLoadedFormat`), the library is always the WebAssembly version now. Also remove any uses of `clipper.instance`.

3. If you need to support environments where WebAssembly is unavailable or disabled (for example iOS / macOS Lockdown Mode, some browser enhanced security modes, or a Content-Security-Policy without `'wasm-unsafe-eval'`), stay on v1.

4. If you need to support runtimes older than ES2020, transpile the package with your bundler.

The rest of the API (clipping, offsetting and the helper functions) is unchanged.

## v1.3.1

- Fixed `scalePath`/`scalePaths` from reversing the path.
- Fixed the type definitions of `clipToPaths` and `clipToPolyTree`. The did not return undefined.

## v1.3.0

- Made it work with the latest version of emscripten
- Now using yarn v3
- Updated all dependencies
- Exported the `SubjectInput` type.

## v1.2.1

- Use direct requires so bundlers have an easier time.

## v1.2.0

- Updated dependencies.
- Compiled with the latest version of emscripten and in modularize mode (which should be more compatible with node).

## v1.1.0

- Compiled with the latest version of emscripten.
- Will now use `FinalizationRegistry` when provided by the runtime to avoid mem leaks whenever calling `dispose()` is forgotten.
