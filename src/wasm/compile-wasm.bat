call "C:\Program Files\Emscripten\emsdk_env.bat"
emcc --pre-js prefix.js --post-js postfix.js --bind -O3 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s NO_EXIT_RUNTIME=1 clipper.cpp -o clipper-wasm.js
