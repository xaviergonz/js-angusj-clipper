const shelljs = require('shelljs');
const path = require('path');

const wasmDir = path.join(__dirname, '..', 'src', 'wasm');
console.log(`using "${wasmDir}" as wasm dir`);

function build(wasmMode) {
    const extraOptions = wasmMode ? `-s WASM=1 -O2` : `-O3`; // TODO: enable O3 for WASM once it works
    const output = wasmMode ? `clipper-wasm.js` : `clipper.js`;

    const cmd = `docker run --rm -v ${wasmDir}:/src trzeci/emscripten emcc --pre-js prefix.js --post-js postfix.js --bind -s ALLOW_MEMORY_GROWTH=1 -s NO_EXIT_RUNTIME=1 -s SINGLE_FILE=1 ${extraOptions} clipper.cpp -o ${output}`;
    const returnData = shelljs.exec(cmd);
    if (returnData.code !== 0) {
        console.error(`build failed with error code ${returnData.code}`);
        process.exit(returnData.code);
    }

    shelljs.mkdir('dist', 'dist/wasm');
    shelljs.mv(`src/wasm/${output}`, `dist/wasm/${output}`);
}

console.log('building asmjs version');
build(false);
console.log('building wasm version');
build(true);
