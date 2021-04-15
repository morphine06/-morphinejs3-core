"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "App", {
  enumerable: true,
  get: function get() {
    return _App.App;
  }
});
Object.defineProperty(exports, "Services", {
  enumerable: true,
  get: function get() {
    return _Services.Services;
  }
});
Object.defineProperty(exports, "Service", {
  enumerable: true,
  get: function get() {
    return _Services.Service;
  }
});
Object.defineProperty(exports, "loadServices", {
  enumerable: true,
  get: function get() {
    return _Services.loadServices;
  }
});
Object.defineProperty(exports, "Config", {
  enumerable: true,
  get: function get() {
    return _Config.Config;
  }
});
Object.defineProperty(exports, "Controller", {
  enumerable: true,
  get: function get() {
    return _Controller.Controller;
  }
});
Object.defineProperty(exports, "loadControllers", {
  enumerable: true,
  get: function get() {
    return _Controller.loadControllers;
  }
});
Object.defineProperty(exports, "Get", {
  enumerable: true,
  get: function get() {
    return _MethodDecorators.Get;
  }
});
Object.defineProperty(exports, "Post", {
  enumerable: true,
  get: function get() {
    return _MethodDecorators.Post;
  }
});
Object.defineProperty(exports, "Put", {
  enumerable: true,
  get: function get() {
    return _MethodDecorators.Put;
  }
});
Object.defineProperty(exports, "Delete", {
  enumerable: true,
  get: function get() {
    return _MethodDecorators.Delete;
  }
});
Object.defineProperty(exports, "Crud", {
  enumerable: true,
  get: function get() {
    return _MethodDecorators.Crud;
  }
});
Object.defineProperty(exports, "Middlewares", {
  enumerable: true,
  get: function get() {
    return _Middlewares.Middlewares;
  }
});
Object.defineProperty(exports, "Middleware", {
  enumerable: true,
  get: function get() {
    return _Middlewares.Middleware;
  }
});
Object.defineProperty(exports, "loadRoutesMiddlewares", {
  enumerable: true,
  get: function get() {
    return _Middlewares.loadRoutesMiddlewares;
  }
});
Object.defineProperty(exports, "DbMysql", {
  enumerable: true,
  get: function get() {
    return _DbMysql.DbMysql;
  }
});
Object.defineProperty(exports, "Model", {
  enumerable: true,
  get: function get() {
    return _DbMysql.Model;
  }
});
Object.defineProperty(exports, "Models", {
  enumerable: true,
  get: function get() {
    return _DbMysql.Models;
  }
});
Object.defineProperty(exports, "Migration", {
  enumerable: true,
  get: function get() {
    return _DbMysql.Migration;
  }
});
exports.MorphineJs = exports.rootDir = void 0;

var _App = require("./App");

var _Services = require("./Services");

var _Config = require("./Config");

var _Controller = require("./Controller");

var _MethodDecorators = require("./MethodDecorators");

var _Middlewares = require("./Middlewares");

var _DbMysql = require("./DbMysql");

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var rootDir = process.cwd();
exports.rootDir = rootDir;
var MorphineJs = class {
  constructor() {}

  initDb() {
    return _asyncToGenerator(function* () {
      yield _DbMysql.DbMysql.init(_Config.Config.mysql);
    })();
  }

  executeMigration() {
    return _asyncToGenerator(function* () {
      _DbMysql.Migration.update();
    })();
  }

  initExpress() {
    return _asyncToGenerator(function* () {})();
  }

  initMiddlewares() {
    return _asyncToGenerator(function* () {})();
  }

  initHttpServer() {
    return _asyncToGenerator(function* () {})();
  }

  initResSendData() {
    return function (req, res, next) {
      if (!_Services.Services.ErrorCodes) return next();

      res.sendData = function (errorKeyOrData) {
        var status = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 200;
        var data;
        errorKeyOrData = errorKeyOrData || {};

        if (errorKeyOrData && typeof errorKeyOrData === "string") {
          data = {
            err: _Services.Services.ErrorCodes.getErrorCode(errorKeyOrData)
          };
          status = data.err.status;
        } else {
          data = errorKeyOrData;
          data.err = null;
          if (!data.meta) data.meta = {};
        }

        res.status(status).send(data);
      };

      next();
    };
  }

  notFound() {
    return _asyncToGenerator(function* () {})();
  }

  start() {
    var _this = this;

    return _asyncToGenerator(function* () {
      yield _this.initDb();
      yield _this.executeMigration(); // await loadServices();

      yield _this.initExpress();
      yield _this.initMiddlewares(); // this.initResSendData();

      _this.httpserver = yield _this.initHttpServer();
    })();
  }

};
exports.MorphineJs = MorphineJs;
//# sourceMappingURL=main.js.map