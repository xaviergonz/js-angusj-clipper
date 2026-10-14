// Flat C API used by the JS side.
//
// Inputs are passed as a pointer to an array of doubles that JS writes directly into the wasm heap
// (a scratch buffer that JS reuses between calls). Results are written into a single output buffer
// owned by this file (also reused between calls), and a pointer to it is returned. A null pointer
// means an error, which can be queried with getErrorCode / getErrorMessage.
//
// Encodings (all values are doubles):
// - path:     nofPoints, x0, y0, x1, y1, ...
// - paths:    nofPaths, path0, path1, ...
// - polyNode: isOpen, contour (as a path), nofChilds, polyNode0, polyNode1, ...
// - polyTree: total, root polyNode

#include <emscripten/emscripten.h>
#include <string>

using namespace ClipperLib;

namespace {

enum ErrorCode {
  ecNone = 0,
  ecInvalidPath = 1,
  ecInvalidPaths = 2,
  ecExecuteFailed = 3,
  ecException = 4,
};

std::vector<double> outBuffer;
int errorCode = ecNone;
std::string errorMessage;

const double* readPath(const double* in, Path& path) {
  size_t nofPoints = (size_t)*in++;
  path.resize(nofPoints);
  for (size_t i = 0; i < nofPoints; ++i) {
    path[i].X = (cInt)*in++;
    path[i].Y = (cInt)*in++;
  }
  return in;
}

const double* readPaths(const double* in, Paths& paths) {
  size_t nofPaths = (size_t)*in++;
  paths.resize(nofPaths);
  for (size_t i = 0; i < nofPaths; ++i) {
    in = readPath(in, paths[i]);
  }
  return in;
}

size_t pathSize(const Path& path) {
  return 1 + path.size() * 2;
}

size_t pathsSize(const Paths& paths) {
  size_t size = 1;
  for (size_t i = 0; i < paths.size(); ++i) {
    size += pathSize(paths[i]);
  }
  return size;
}

size_t polyNodeSize(const PolyNode& node) {
  size_t size = 1 + pathSize(node.Contour) + 1;
  for (size_t i = 0; i < node.Childs.size(); ++i) {
    size += polyNodeSize(*node.Childs[i]);
  }
  return size;
}

double* writePath(double* out, const Path& path) {
  size_t nofPoints = path.size();
  *out++ = (double)nofPoints;
  for (size_t i = 0; i < nofPoints; ++i) {
    *out++ = (double)path[i].X;
    *out++ = (double)path[i].Y;
  }
  return out;
}

double* writePaths(double* out, const Paths& paths) {
  *out++ = (double)paths.size();
  for (size_t i = 0; i < paths.size(); ++i) {
    out = writePath(out, paths[i]);
  }
  return out;
}

double* writePolyNode(double* out, const PolyNode& node) {
  *out++ = node.IsOpen() ? 1 : 0;
  out = writePath(out, node.Contour);
  *out++ = (double)node.Childs.size();
  for (size_t i = 0; i < node.Childs.size(); ++i) {
    out = writePolyNode(out, *node.Childs[i]);
  }
  return out;
}

void prepareOutput(size_t size) {
  // grow to the exact size (rather than doubling), so the JS side can tell from the output size
  // whether the buffer is bigger than what it wants to keep around
  if (size > outBuffer.capacity()) {
    outBuffer.reserve(size);
  }
  outBuffer.resize(size);
}

double* outputPaths(const Paths& paths) {
  prepareOutput(pathsSize(paths));
  writePaths(outBuffer.data(), paths);
  return outBuffer.data();
}

double* outputPolyTree(const PolyTree& polyTree) {
  prepareOutput(1 + polyNodeSize(polyTree));
  double* out = outBuffer.data();
  *out++ = (double)polyTree.Total();
  writePolyNode(out, polyTree);
  return outBuffer.data();
}

double* fail(int code, const char* message = "") {
  errorCode = code;
  errorMessage = message;
  return nullptr;
}

void resetError() {
  errorCode = ecNone;
  errorMessage.clear();
}

bool hasCleanDistance(double cleanDistance) {
  // NaN means no cleaning
  return cleanDistance == cleanDistance;
}

} // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE int getErrorCode() {
  return errorCode;
}

EMSCRIPTEN_KEEPALIVE const char* getErrorMessage() {
  return errorMessage.c_str();
}

// frees the output buffer, so a big output does not keep its memory reserved after it has been read
EMSCRIPTEN_KEEPALIVE void releaseOutput() {
  std::vector<double>().swap(outBuffer);
}

// in: nofInputs, then for each input: polyType, closed, isPaths, paths
EMSCRIPTEN_KEEPALIVE double* clip(
  const double* in,
  int clipType,
  int subjFillType,
  int clipFillType,
  int initOptions,
  int polyTreeMode,
  double cleanDistance
) {
  resetError();
  try {
    Clipper clipper(initOptions);
    Paths paths;

    size_t nofInputs = (size_t)*in++;
    for (size_t i = 0; i < nofInputs; ++i) {
      PolyType polyType = (PolyType)*in++;
      bool closed = *in++ != 0;
      bool isPaths = *in++ != 0;
      in = readPaths(in, paths);
      if (isPaths) {
        if (!clipper.AddPaths(paths, polyType, closed)) {
          return fail(ecInvalidPaths);
        }
      } else if (!clipper.AddPath(paths[0], polyType, closed)) {
        return fail(ecInvalidPath);
      }
    }

    if (polyTreeMode) {
      PolyTree polyTree;
      if (!clipper.Execute((ClipType)clipType, polyTree, (PolyFillType)subjFillType, (PolyFillType)clipFillType)) {
        return fail(ecExecuteFailed);
      }
      return outputPolyTree(polyTree);
    }

    Paths solution;
    if (!clipper.Execute((ClipType)clipType, solution, (PolyFillType)subjFillType, (PolyFillType)clipFillType)) {
      return fail(ecExecuteFailed);
    }
    if (hasCleanDistance(cleanDistance)) {
      CleanPolygons(solution, cleanDistance);
    }
    return outputPaths(solution);
  } catch (const std::exception& e) {
    return fail(ecException, e.what());
  }
}

// in: nofInputs, then for each input: joinType, endType, paths
EMSCRIPTEN_KEEPALIVE double* offset(
  const double* in,
  double miterLimit,
  double arcTolerance,
  double delta,
  int polyTreeMode,
  double cleanDistance
) {
  resetError();
  try {
    ClipperOffset clipperOffset(miterLimit, arcTolerance);
    Paths paths;

    size_t nofInputs = (size_t)*in++;
    for (size_t i = 0; i < nofInputs; ++i) {
      JoinType joinType = (JoinType)*in++;
      EndType endType = (EndType)*in++;
      in = readPaths(in, paths);
      clipperOffset.AddPaths(paths, joinType, endType);
    }

    if (polyTreeMode) {
      PolyTree polyTree;
      clipperOffset.Execute(polyTree, delta);
      return outputPolyTree(polyTree);
    }

    Paths solution;
    clipperOffset.Execute(solution, delta);
    if (hasCleanDistance(cleanDistance)) {
      CleanPolygons(solution, cleanDistance);
    }
    return outputPaths(solution);
  } catch (const std::exception& e) {
    return fail(ecException, e.what());
  }
}

// in: paths
EMSCRIPTEN_KEEPALIVE double* cleanPolygons(const double* in, double distance) {
  resetError();
  try {
    Paths paths;
    readPaths(in, paths);
    CleanPolygons(paths, distance);
    return outputPaths(paths);
  } catch (const std::exception& e) {
    return fail(ecException, e.what());
  }
}

// in: paths
EMSCRIPTEN_KEEPALIVE double* simplifyPolygons(const double* in, int fillType) {
  resetError();
  try {
    Paths paths;
    readPaths(in, paths);
    SimplifyPolygons(paths, (PolyFillType)fillType);
    return outputPaths(paths);
  } catch (const std::exception& e) {
    return fail(ecException, e.what());
  }
}

// in: pattern path, path
EMSCRIPTEN_KEEPALIVE double* minkowskiSumPath(const double* in, int pathIsClosed) {
  resetError();
  try {
    Path pattern, path;
    in = readPath(in, pattern);
    readPath(in, path);
    Paths solution;
    MinkowskiSum(pattern, path, solution, pathIsClosed != 0);
    return outputPaths(solution);
  } catch (const std::exception& e) {
    return fail(ecException, e.what());
  }
}

// in: pattern path, paths
EMSCRIPTEN_KEEPALIVE double* minkowskiSumPaths(const double* in, int pathIsClosed) {
  resetError();
  try {
    Path pattern;
    Paths paths;
    in = readPath(in, pattern);
    readPaths(in, paths);
    Paths solution;
    MinkowskiSum(pattern, paths, solution, pathIsClosed != 0);
    return outputPaths(solution);
  } catch (const std::exception& e) {
    return fail(ecException, e.what());
  }
}

// in: path1, path2
EMSCRIPTEN_KEEPALIVE double* minkowskiDiff(const double* in) {
  resetError();
  try {
    Path poly1, poly2;
    in = readPath(in, poly1);
    readPath(in, poly2);
    Paths solution;
    MinkowskiDiff(poly1, poly2, solution);
    return outputPaths(solution);
  } catch (const std::exception& e) {
    return fail(ecException, e.what());
  }
}

} // extern "C"
