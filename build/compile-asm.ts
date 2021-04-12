// tslint:disable: no-console
// tslint:disable: no-implicit-dependencies

import * as shelljs from "shelljs";
import * as path from "path";
import * as fs from "fs";
import * as commandLineArgs from "command-line-args";

const cmdLineOptions = commandLineArgs([{ name: "env", type: String, defaultValue: "universal" }]);

const wasmDir = path.join(__dirname, "..", "src", "wasm");
console.log(`using "${wasmDir}" as wasm dir`);

function build(wasmMode: boolean, environment: string) {
  const debug = false;

  const options = [
    "--bind",
    "--no-entry",
    "-s STRICT=1",
    "-s ALLOW_MEMORY_GROWTH=1",
    "-s NO_EXIT_RUNTIME=1",
    "-s SINGLE_FILE=1",
    "-s INVOKE_RUN=0",
    "-s NODEJS_CATCH_EXIT=0",
    "-s NO_FILESYSTEM=1",
    // '-s MODULARIZE=1',
    ...(debug
      ? ["-s DISABLE_EXCEPTION_CATCHING=0", "-O0"]
      : [
          // "-s ASSERTIONS=0",
          // "-s PRECISE_I64_MATH=0",
          // "-s ALIASING_FUNCTION_POINTERS=1",
          "-O3",
        ]),
  ];
  if (environment !== "universal") {
    options.push(`-s ENVIRONMENT=${environment}`);
  }

  if (wasmMode) {
    options.push("-s WASM=1");
  } else {
    options.push("-s WASM=0");
  }

  const output = wasmMode ? `clipper-wasm.js` : `clipper.js`;

  const cmd = `docker run --rm -v ${wasmDir}:/src emscripten/emsdk em++ ${options.join(
    " "
  )} clipper.cpp -o ${output}`;
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

console.log("building asmjs version for env " + cmdLineOptions.env);
build(false, cmdLineOptions.env);
console.log("building wasm version for env " + cmdLineOptions.env);
build(true, cmdLineOptions.env);
