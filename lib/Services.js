"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadServices = loadServices;
exports.Services = void 0;

var _globule = _interopRequireDefault(require("globule"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var Services = {}; // function Service(services = []) {
// 	if (services instanceof Array) {
// 	} else services = [services];
// 	return function decorator(target, name, descriptor) {
// 		// console.log("target", target, name, descriptor);
// 		if (name) {
// 			if (!target._services) target._services = [];
// 			target._services = [...target._services, ...services];
// 		} else {
// 			if (!target.prototype._services) target.prototype._services = [];
// 			target.prototype._services = [...target.prototype._services, ...services];
// 		}
// 	};
// }

exports.Services = Services;

function loadServices() {
  return _loadServices.apply(this, arguments);
}

function _loadServices() {
  _loadServices = _asyncToGenerator(function* () {
    var serviceFiles = _globule.default.find(process.cwd() + "/src/**/*.service.js");

    var _loop = function* _loop(iService) {
      var serviceFile = serviceFiles[iService];

      var serviceName = _path.default.basename(serviceFile);

      serviceName = serviceName.substring(0, serviceName.length - 11); // global[serviceName] = require(serviceFile);

      var obj = yield Promise.resolve("".concat(serviceFile)).then(s => _interopRequireWildcard(require(s)));
      Object.entries(obj).forEach((_ref, index) => {
        var [name, constructorFn] = _ref;
        // console.log("serviceName", serviceName);
        Services[serviceName] = new constructorFn();
      });
    };

    for (var iService = 0; iService < serviceFiles.length; iService++) {
      yield* _loop(iService);
    } // console.log("Services2", Services);

  });
  return _loadServices.apply(this, arguments);
} //Service,
//# sourceMappingURL=Services.js.map