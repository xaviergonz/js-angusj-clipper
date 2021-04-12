# CHANGELOG

## v1.1.0

- Compiled with the latest version of emscripten.

## v1.1.0

- Will now use `FinalizationRegistry` when provided by the runtime to avoid mem leaks whenever calling `dispose()` is forgotten.
