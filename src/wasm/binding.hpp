#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;
using namespace ClipperLib;

#ifdef use_xyz
int coordsPerPoint = 3;
#else
int coordsPerPoint = 2;
#endif

typedef unsigned int intPtr;

size_t JS_DoublesForPath(Path &path) {
  return 1 + (path.size() * coordsPerPoint);
}

size_t JS_DoublesForPaths(Paths &paths) {
  size_t nofPaths = paths.size();
  int items = 1; // for path count
  for (size_t i = 0; i < nofPaths; i++) {
    items += JS_DoublesForPath(paths[i]);
  }
  return items;
}

double* JS_ToPathHelper(Path &dest, double* coords) {
  // first double in array is nof coords

  double* pointer = coords;
  size_t nofCoords = *pointer; pointer++;
  dest.clear();
  dest.resize(nofCoords);
  IntPoint p;
  for (size_t i = 0; i < nofCoords; ++i) {
    p.X = *pointer; pointer++;
    p.Y = *pointer; pointer++;
#ifdef use_xyz
    p.Z = *pointer; pointer++;
#endif
    dest[i] = p;
  }

  return pointer;
}

void JS_ToPath(Path &dest, intPtr coordsPtr) {
  JS_ToPathHelper(dest, reinterpret_cast<double*>(coordsPtr));
}

void JS_ToPathsHelper(Paths &dest, double* p) {
  // first double in array has nof paths
  // then each path

  size_t nofPaths = *p; ++p;
  dest.clear();
  dest.reserve(nofPaths);
  for (size_t i = 0; i < nofPaths; ++i) {
    Path path;
    p = JS_ToPathHelper(path, p);
    dest.push_back(path);
  }
}

void JS_ToPaths(Paths &dest, intPtr pathsPtr) {
  JS_ToPathsHelper(dest, reinterpret_cast<double*>(pathsPtr));
}

double* JS_WriteFromPath(Path &path, double* p) {
  // first double in array is nof coords

  size_t size = path.size();
  double* p2 = p;

  *p2 = size; p2++;
  for (size_t i = 0; i < size; ++i) {
    IntPoint *point = &path[i];
    *p2 = point->X; p2++;
    *p2 = point->Y; p2++;
#ifdef use_xyz
    *p2 = point->Z; p2++;
#endif
  }

  return p2;
}

double* JS_FromPathHelper(Path &path) {
  // first double in array is nof coords

  size_t size = path.size();
  size_t nofBytes = JS_DoublesForPath(path) * sizeof(double);
  double* p = (double*)malloc(nofBytes);
  JS_WriteFromPath(path, p);
  return p;
}

val JS_FromPath(Path &path) {
  double* p = JS_FromPathHelper(path);
  return val(typed_memory_view(JS_DoublesForPath(path), p));
}

double* JS_FromPathsHelper(Paths &paths) {
  // first double in array is nof paths

  size_t size = paths.size();
  size_t nofBytes = JS_DoublesForPaths(paths) * sizeof(double);
  double* p = (double*)malloc(nofBytes);
  double* p2 = p;

  *p2 = size; p2++;

  for (size_t i = 0; i < size; ++i) {
    p2 = JS_WriteFromPath(paths[i], p2);
  }

  return p;
}

val JS_FromPaths(Paths &paths) {
  return val(typed_memory_view(JS_DoublesForPaths(paths), JS_FromPathsHelper(paths)));
}



EMSCRIPTEN_BINDINGS(ClipperLib) {
  function("toPath", &JS_ToPath);
  function("toPaths", &JS_ToPaths);
  function("fromPath", &JS_FromPath);
  function("fromPaths", &JS_FromPaths);

  enum_<ClipType>("ClipType")
    .value("Intersection", ctIntersection)
    .value("Union", ctUnion)
    .value("Difference", ctDifference)
    .value("Xor", ctXor)
    ;

  enum_<PolyType>("PolyType")
    .value("Subject", ptSubject)
    .value("Clip", ptClip)
    ;

  enum_<PolyFillType>("PolyFillType")
    .value("EvenOdd", pftEvenOdd)
    .value("NonZero", pftNonZero)
    .value("Positive", pftPositive)
    .value("Negative", pftNegative)
    ;

  class_<IntPoint>("IntPoint")
    .property("x", &IntPoint::JS_GetX, &IntPoint::JS_SetX)
    .property("y", &IntPoint::JS_GetY, &IntPoint::JS_SetY)
#ifdef use_xyz
    .property("z", &IntPoint::JS_GetZ, &IntPoint::JS_SetZ)
#endif
    ;

  function("newIntPoint", &NewIntPoint);

  register_vector<IntPoint>("Path");
  register_vector<Path>("Paths");

#ifdef use_xyz
  // TODO: ZFillCallback?
#endif

  enum_<InitOptions>("InitOptions")
    .value("ReverseSolution", ioReverseSolution)
    .value("StrictlySimple", ioStrictlySimple)
    .value("PreserveCollinear", ioPreserveCollinear)
    ;

  enum_<JoinType>("JoinType")
    .value("Square", jtSquare)
    .value("Round", jtRound)
    .value("Miter", jtMiter)
    ;

  enum_<EndType>("EndType")
    .value("ClosedPolygon", etClosedPolygon)
    .value("ClosedLine", etClosedLine)
    .value("OpenButt", etOpenButt)
    .value("OpenSquare", etOpenSquare)
    .value("OpenRound", etOpenRound)
    ;

  class_<PolyNode>("PolyNode")
    .constructor<>()
    .property("contour", &PolyNode::Contour)
    .property("childs", &PolyNode::Childs)
    //.property("parent", &PolyNode::Parent)
    .function("getParent", &PolyNode::JS_GetParent, allow_raw_pointers())
    .function("getNext", &PolyNode::GetNext, allow_raw_pointers())
    .function("isHole", &PolyNode::IsHole)
    .function("isOpen", &PolyNode::IsOpen)
    .function("childCount", &PolyNode::ChildCount)
    ;

  register_vector<PolyNode*>("PolyNodes");

  class_<PolyTree, base<PolyNode>>("PolyTree")
    .constructor<>()
    .function("getFirst", &PolyTree::GetFirst, allow_raw_pointers())
    .function("clear", &PolyTree::Clear)
    .function("total", &PolyTree::Total)
    ;

  function("orientation", &Orientation);
  function("area", select_overload<double(const Path&)>(&Area));
  function("pointInPolygon", select_overload<int(const IntPoint &, const Path &)>(&PointInPolygon));

  function("simplifyPolygon", &SimplifyPolygon);
  function("simplifyPolygonsInOut", select_overload<void(const Paths &, Paths &, PolyFillType)>(&SimplifyPolygons));
  function("simplifyPolygonsOverwrite", select_overload<void(Paths &, PolyFillType)>(&SimplifyPolygons));

  function("cleanPolygon", select_overload<void(const Path&, Path&, double)>(&CleanPolygon));
  function("cleanPolygon", select_overload<void(Path&, double)>(&CleanPolygon));
  function("cleanPolygons", select_overload<void(const Paths&, Paths&, double)>(&CleanPolygons));
  function("cleanPolygons", select_overload<void(Paths&, double)>(&CleanPolygons));

  function("minkowskiSumPath", select_overload<void(const Path&, const Path&, Paths&, bool)>(&MinkowskiSum));
  function("minkowskiSumPaths", select_overload<void(const Path&, const Paths&, Paths&, bool)>(&MinkowskiSum));
  function("minkowskiDiff", &MinkowskiDiff);

  function("polyTreeToPaths", &PolyTreeToPaths);
  function("closedPathsFromPolyTree", &ClosedPathsFromPolyTree);
  function("openPathsFromPolyTree", &OpenPathsFromPolyTree);

  function("reversePath", &ReversePath);
  function("reversePaths", &ReversePaths);

  class_<IntRect>("IntRect")
    .property("left", &IntRect::JS_GetLeft, &IntRect::JS_SetLeft)
    .property("top", &IntRect::JS_GetTop, &IntRect::JS_SetTop)
    .property("right", &IntRect::JS_GetRight, &IntRect::JS_SetRight)
    .property("bottom", &IntRect::JS_GetBottom, &IntRect::JS_SetBottom)
    ;

  class_<ClipperBase>("ClipperBase")
    //.constructor<>()
    .function("addPath", &ClipperBase::AddPath)
    .function("addPaths", &ClipperBase::AddPaths)
    .function("clear", &ClipperBase::Clear)
    .function("getBounds", &ClipperBase::GetBounds)
    .property("preserveCollinear",
      &ClipperBase::JS_GetPreserveCollinear,
      &ClipperBase::JS_SetPreserveCollinear
    )
    ;

  class_<Clipper, base<ClipperBase>>("Clipper")
    .constructor<int>()
    .function("executePaths", select_overload<bool(ClipType, Paths &, PolyFillType)>(&Clipper::Execute))
    .function("executePathsWithFillTypes", select_overload<bool(ClipType clipType, Paths &solution, PolyFillType, PolyFillType)>(&Clipper::Execute))
    .function("executePolyTree", select_overload<bool(ClipType, PolyTree &, PolyFillType)>(&Clipper::Execute))
    .function("executePolyTreeWithFillTypes", select_overload<bool(ClipType clipType, PolyTree &polytree, PolyFillType, PolyFillType)>(&Clipper::Execute))
    .property("reverseSolution",
      &Clipper::JS_GetReverseSolution,
      &Clipper::JS_SetReverseSolution
    )
    .property("strictlySimple",
      &Clipper::JS_GetStrictlySimple,
      &Clipper::JS_SetStrictlySimple
    )
#ifdef use_xyz
    .function("zFillFunction", &Clipper::ZFillFunction)
#endif
    ;

  class_<ClipperOffset>("ClipperOffset")
    .constructor<double, double>()
    .function("addPath", &ClipperOffset::AddPath)
    .function("addPaths", &ClipperOffset::AddPaths)
    .function("executePaths", select_overload<void(Paths&, double)>(&ClipperOffset::Execute))
    .function("executePolyTree", select_overload<void(PolyTree&, double)>(&ClipperOffset::Execute))
    .function("clear", &ClipperOffset::Clear)
    .property("miterLimit", &ClipperOffset::MiterLimit)
    .property("arcTolerance", &ClipperOffset::ArcTolerance)
    ;
}
