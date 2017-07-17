#### enum NativeClipperLibRequestedFormat

Format to use when loading the native library instance.

###### Values
* **WasmWithAsmJsFallback = 'wasmWithAsmJsFallback'**

    Try to load the WebAssembly version, if it fails try to load the Asm.js version.

* **WasmOnly = 'wasmOnly'**

    Load the WebAssembly version exclusively.

* **AsmJsOnly = 'asmJsOnly'**

    Load the Asm.js version exclusively.
