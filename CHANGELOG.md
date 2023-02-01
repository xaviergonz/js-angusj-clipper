# CHANGELOG

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
