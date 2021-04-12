"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Middleware = Middleware;
exports.loadRoutesMiddlewares = loadRoutesMiddlewares;
exports.Middlewares = void 0;

var _globule = _interopRequireDefault(require("globule"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var Middlewares = [];
exports.Middlewares = Middlewares;

function Middleware() {
  var middlewares = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  if (middlewares instanceof Array) {} else middlewares = [middlewares];

  return function (target, name, descriptor) {
    if (name) {
      var original = descriptor.value;

      if (typeof original === "function") {
        descriptor.value = /*#__PURE__*/_asyncToGenerator(function* () {
          var _this = this;

          // console.log("args", args.length);
          try {
            var continuePlease = true;

            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            if (target._middlewaresByRoute && target._middlewaresByRoute[name]) {
              var _loop = function* _loop(iMid) {
                var middlewareName = target._middlewaresByRoute[name][iMid];
                var mid = Middlewares.find(m => m.name == middlewareName);

                if (mid) {
                  var isCalled = false;

                  var next = function next() {
                    isCalled = true;
                  };

                  yield mid.fn.apply(_this, [args[0], args[1], next]);
                  console.log("isCalled", isCalled);

                  if (!isCalled) {
                    continuePlease = false;
                    return "break";
                  }
                } else {
                  console.warn("Middleware '".concat(middlewareName, "' not found."));
                }
              };

              for (var iMid = 0; iMid < target._middlewaresByRoute[name].length; iMid++) {
                var _ret = yield* _loop(iMid);

                if (_ret === "break") break;
              }
            }

            if (continuePlease) yield original.apply(this, args);
          } catch (e) {
            throw e;
          }
        }); // console.log("target", target);

        if (!target._middlewaresByRoute) target._middlewaresByRoute = {};
        if (!target._middlewaresByRoute[name]) target._middlewaresByRoute[name] = [];
        target._middlewaresByRoute[name] = [...target._middlewaresByRoute[name], ...middlewares];
      }

      return descriptor;
    } else {
      if (!target.prototype._middlewares) target.prototype._middlewares = [];
      target.prototype._middlewares = [...target.prototype._middlewares, ...middlewares];
    }
  };
}

function loadRoutesMiddlewares() {
  return _loadRoutesMiddlewares.apply(this, arguments);
}

function _loadRoutesMiddlewares() {
  _loadRoutesMiddlewares = _asyncToGenerator(function* () {
    var middlewareFiles = _globule.default.find(process.cwd() + "/src/**/*.middleware.js"); // console.log("middlewareFiles", middlewareFiles);


    for (var i = 0; i < middlewareFiles.length; i++) {
      var middlewareFile = middlewareFiles[i];
      var obj = yield Promise.resolve("".concat(middlewareFile)).then(s => _interopRequireWildcard(require(s)));
      Object.entries(obj).forEach((_ref2, index) => {
        var [name, constructorFn] = _ref2;
        Middlewares.push({
          name,
          fn: constructorFn
        });
      });
    }
  });
  return _loadRoutesMiddlewares.apply(this, arguments);
}
//# sourceMappingURL=Middlewares.js.map