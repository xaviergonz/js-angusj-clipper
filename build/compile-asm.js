const shelljs = require("shelljs");
const path = require("path");
const fs = require("fs");

const wasmDir = path.join(__dirname, "..", "src", "wasm");
console.log(`using "${wasmDir}" as wasm dir`);

function build(wasmMode) {
  const options = [
    "--bind",
    "-s ALLOW_MEMORY_GROWTH=1",
    "-s NO_EXIT_RUNTIME=1",
    "-s SINGLE_FILE=1",
    "-O3"
    // '-s MODULARIZE=1',
  ];

  if (wasmMode) {
    options.push("-s WASM=1");
  }

  const output = wasmMode ? `clipper-wasm.js` : `clipper.js`;

  const cmd = `docker run --rm -v ${wasmDir}:/src trzeci/emscripten emcc ${options.join(" ")} clipper.cpp -o ${output}`;
  const returnData = shelljs.exec(cmd);
  if (returnData.code !== 0) {
    console.error(`build failed with error code ${returnData.code}`);
    process.exit(returnData.code);
  }

  const outFile = path.join(wasmDir, output);
  // we add this here since if we use pre-js or post-js parameter then O3 compilation fails in WASM mode
  const fileContent = fs.readFileSync(outFile);
  fs.writeFileSync(
    outFile,
    `
function init(_moduleOverrides) {
  var Module = {};
  Object.keys(_moduleOverrides).forEach(function (key) {
    Module[key] = _moduleOverrides[key];
  });

${fileContent};

  return Module;
}

module.exports = { init: init };
`
  );

  shelljs.mkdir("dist", "dist/wasm");
  shelljs.cp(`src/wasm/${output}`, `dist/wasm/${output}`);
}

console.log("building asmjs version");
build(false);
console.log("building wasm version");
build(true);
