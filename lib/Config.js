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
}

readConfig();
//# sourceMappingURL=Config.js.map