"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Get = Get;

var _dayjs = _interopRequireDefault(require("dayjs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function Get(value) {
  return function (target, name, descriptor) {
    var original = descriptor.value;
    console.log("target, name", target, name);

    if (typeof original === "function") {
      descriptor.value = /*#__PURE__*/_asyncToGenerator(function* () {
        try {
          var d = new Date();

          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          yield original.apply(this, args);
          var diff = (0, _dayjs.default)().diff(d);
          if (diff > 1000) diff = diff / 1000 + "s";else diff += "ms"; // eslint-disable-next-line

          console.log((0, _dayjs.default)().format("YYYY-MM-DD HH:mm:ss") + " - GET " + value + " - " + diff);
        } catch (e) {
          console.warn("Error in controller : ".concat(e));
          throw e;
        }
      });
      App.get(value, descriptor.value);
    }

    return descriptor;
  };
}