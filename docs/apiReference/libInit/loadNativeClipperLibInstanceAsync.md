#### async loadNativeClipperLibInstanceAsync(format: [NativeClipperLibRequestedFormat](./NativeClipperLibRequestedFormat.md)): Promise<[ClipperLibWrapper](../shared/ClipperLibWrapper.md)>

Asynchronously tries to load a new native instance of the clipper library to be shared across all method invocations.

###### Parameters

- **format: [NativeClipperLibRequestedFormat](./NativeClipperLibRequestedFormat.md)**

  Format to load, either WasmThenAsmJs, WasmOnly or AsmJsOnly.

###### Returns

- **Promise<[ClipperLibWrapper](../shared/ClipperLibWrapper.md)>**

  Promise that resolves with the wrapper instance.
