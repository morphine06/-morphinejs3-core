"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadServices = loadServices;
exports.Services = void 0;

var _globule = _interopRequireDefault(require("globule"));

var _path = _interopRequireDefault(require("path"));

var _chalk = _interopRequireDefault(require("chalk"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var Services = {};
exports.Services = Services;

function loadServices() {
  return _loadServices.apply(this, arguments);
}

function _loadServices() {
  _loadServices = _asyncToGenerator(function* () {
    function getAllFuncs(toCheck) {
      var props = [];
      var obj = toCheck;
      var excludes = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];

      do {
        var p = Object.getOwnPropertyNames(obj);
        p = p.filter(prop => {
          return prop.indexOf("__") !== 0 && excludes.indexOf(prop) < 0;
        });
        props = props.concat(p);
      } while (obj = Object.getPrototypeOf(obj)); // props =  props.sort().filter(function (e, i, arr) {
      // 	if (e != arr[i + 1] && typeof toCheck[e] == "function") return true;
      // });


      props = props.map(el => {
        return el + "()";
      });
      return props;
    }

    console.warn(_chalk.default.yellow("@Info - Services availables :"));

    var serviceFiles = _globule.default.find(process.cwd() + "/src/**/*.service.js");

    var _loop = function* _loop(iService) {
      var serviceFile = serviceFiles[iService];

      var serviceName = _path.default.basename(serviceFile);

      serviceName = serviceName.substring(0, serviceName.length - 11);
      var obj = yield Promise.resolve("".concat(serviceFile)).then(s => _interopRequireWildcard(require(s)));
      Object.entries(obj).forEach((_ref, index) => {
        var [name, constructorFn] = _ref;
        Services[serviceName] = new constructorFn();
        console.warn("- ".concat(name, " : ").concat(getAllFuncs(Services[serviceName]).join(", ")));
      });
    };

    for (var iService = 0; iService < serviceFiles.length; iService++) {
      yield* _loop(iService);
    }
  });
  return _loadServices.apply(this, arguments);
}
//# sourceMappingURL=Services.js.map