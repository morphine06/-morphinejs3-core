"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Config = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _json = _interopRequireDefault(require("json5"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var rootDir = process.cwd();
var Config = {};
exports.Config = Config;

function readConfig() {
  var f = _fs.default.readFileSync(rootDir + "/morphinejs.config.jsonc");

  exports.Config = Config = _json.default.parse(f);
  Config.package = _json.default.parse(_fs.default.readFileSync(rootDir + "/package.json"));

  try {
    var f2 = _fs.default.readFileSync(rootDir + "/others.config.jsonc");

    var Config2 = _json.default.parse(f2);

    mergeDeep(Config, Config2);
  } catch (error) {}
}

readConfig();

function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

function mergeDeep(target) {
  for (var _len = arguments.length, sources = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    sources[_key - 1] = arguments[_key];
  }

  if (!sources.length) return target;
  var source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (var key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, {
          [key]: {}
        });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, {
          [key]: source[key]
        });
      }
    }
  }

  return mergeDeep(target, ...sources);
}
//# sourceMappingURL=Config.js.map