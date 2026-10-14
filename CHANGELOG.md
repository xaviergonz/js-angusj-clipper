# CHANGELOG

## v2.0.0 (unreleased)

### Breaking changes

- Removed the Asm.js version of the library, only the WebAssembly version is available now. Asm.js was only a fallback for environments without WebAssembly, which nowadays is supported everywhere, and it is being deprecated by emscripten. As a bonus the package is about a third of its previous size.
- `loadNativeClipperLibInstanceAsync` no longer takes a format parameter.
- Removed the `NativeClipperLibRequestedFormat` and `NativeClipperLibLoadedFormat` enums, as well as the `ClipperLibWrapper.format` property.
- If the WebAssembly module fails to load, `loadNativeClipperLibInstanceAsync` now rejects with the underlying error instead of a generic `ClipperError`.
- The compiled output now targets ES2020 instead of ES5.

### Other changes

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

2. Remove any checks of `clipper.format` (or uses of `NativeClipperLibLoadedFormat`), the library is always the WebAssembly version now.

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
