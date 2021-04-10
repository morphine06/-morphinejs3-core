"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Middleware = Middleware;
exports.Middlewares = void 0;

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var Middlewares = []; // function createMiddlewareDecorator(name, fn) {
// 	// Decorators.push({ fn });
// 	Decorators.middlewares.push(fn);
// 	console.log("création d'un décorateur middleware");
// }
// function createInjectionDecorator(name, fn) {
// 	// Decorators.push({ fn });
// 	Decorators.injections.push(fn);
// 	console.log("création d'un décorateur injecté");
// }

exports.Middlewares = Middlewares;

function Middleware() {
  var middlewares = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  return function (target, name, descriptor) {
    if (name) {
      var original = descriptor.value;

      if (typeof original === "function") {
        descriptor.value = /*#__PURE__*/_asyncToGenerator(function* () {
          // await applyController.apply(this, [url, original, args]);
          try {
            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            yield original.apply(this, args);
          } catch (e) {}
        }); // console.log("target", target);

        if (!target._routes) target._routes = [];
      }

      return descriptor;
    } else {
      if (!target.prototype._middlewares) target.prototype._middlewares = [];
      target.prototype._middlewares = [...target.prototype._middlewares, ...middlewares];
    }
  };
}