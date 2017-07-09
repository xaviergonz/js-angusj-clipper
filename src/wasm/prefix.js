function init(_moduleOverrides) {
  var Module = {};
  Object.keys(_moduleOverrides).forEach(function (key) {
    Module[key] = _moduleOverrides[key];
  });

// here goes generated code
