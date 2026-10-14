import * as shelljs from "shelljs";
import * as path from "path";
import * as fs from "fs";
import commandLineArgs from "command-line-args";

const cmdLineOptions = commandLineArgs([{ name: "env", type: String, defaultValue: "universal" }]);

// bump deliberately; newer emscripten versions can break the build
const emsdkImage = "emscripten/emsdk:6.0.12";

const wasmDir = path.join(__dirname, "..", "src", "wasm");
console.log(`using "${wasmDir}" as wasm dir`);

if (shelljs.exec(`docker pull ${emsdkImage}`).code !== 0) {
  console.error(`could not pull ${emsdkImage}`);
  process.exit(1);
}

function build(environment: string) {
  const debug = false;

  const options = [
    "--no-entry",
    "-fwasm-exceptions", // native wasm exceptions, so clipper errors can be caught and reported
    "-s STRICT=1",
    "-s WASM=1",
    "-s ALLOW_MEMORY_GROWTH=1",
    "-s EXIT_RUNTIME=0",
    "-s SINGLE_FILE=1",
    "-s INVOKE_RUN=0",
    "-s NO_FILESYSTEM=1",
    "-s MODULARIZE=1",
    "-s STRICT_JS=0", // adds "use strict" and breaks module compilation
    "-s EXPORTED_FUNCTIONS=\"['_malloc', '_free']\"", // without this these functions are not exported
    "-s EXPORTED_RUNTIME_METHODS=\"['HEAPF64', 'HEAPU8']\"", // without this the heap views are not exported
    // no speed difference
    // "-s WASM_BIGINT=1",
    ...(debug
      ? ["-O0"]
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

  const output = `clipper-wasm.js`;

  const cmd = `docker run --rm -v ${wasmDir}:/src ${emsdkImage} em++ ${options.join(
    " "
  )} clipper.cpp -o ${output}`;
  const returnData = shelljs.exec(cmd);
  if (returnData.code !== 0) {
    console.error(`build failed with error code ${returnData.code}`);
    process.exit(returnData.code);
  }

  shelljs.mkdir("-p", "dist/wasm");
  shelljs.cp(`src/wasm/${output}`, `dist/wasm/${output}`);
}

console.log("building wasm version for env " + cmdLineOptions.env);
build(cmdLineOptions.env);
