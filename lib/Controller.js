"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadControllers = loadControllers;
exports.Controller = void 0;

var _globule = _interopRequireDefault(require("globule"));

var _dayjs = _interopRequireDefault(require("dayjs"));

var _chalk = _interopRequireDefault(require("chalk"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _App = require("./App");

var _Services = require("./Services");

var _Middlewares = require("./Middlewares");

var _DbMysql = require("./DbMysql");

var _Config = require("./Config");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var createCsvWriter = require("csv-writer").createObjectCsvWriter; // pour  écrite des fichiers .csv
// function Crud(url) {
// 	return function decorator(target) {
// 		target.prototype.isCrud = url;
// 	};
// }


class Controller {
  constructor() {
    this.populateOnFind = true;
  }

  describeRoutes() {
    this._routes.forEach(route => {
      console.warn("- ".concat(route.method.toUpperCase(), " ").concat(route.url, " > ").concat(route.controllerName, " > ").concat(route.name, "()"));
    });
  }

  _addRoutes() {
    this._routes.forEach(route => {
      _App.App[route.method](route.url, (req, res, next) => {
        var timer = new Date();
        req.on("end", function () {
          var diff = (0, _dayjs.default)().diff(timer);
          if (diff > 1000) diff = diff / 1000 + "s";else diff += "ms"; // eslint-disable-next-line

          console.warn("".concat((0, _dayjs.default)().format("YYYY-MM-DD HH:mm:ss"), " - GET ").concat(route.url, " - ").concat(diff));
        });
        next();
      });

      if (this._middlewares) {
        this._middlewares.forEach(middlewareName => {
          var mid = _Middlewares.Middlewares.find(m => {
            return m.name == middlewareName;
          });

          if (mid) _App.App[route.method](route.url, mid.fn.bind(this));
        });
      }

      _App.App[route.method](route.url, route.fn.bind(this));
    });

    this.describeRoutes();
  }

  find(req, res) {
    var _this = this;

    return _asyncToGenerator(function* () {
      if (!_this.model) return _this.res.sendData("model_not_defined");
      var {
        rows,
        total
      } = yield _this.findExec();

      _this.res.sendData({
        data: rows,
        meta: {
          total: total
        }
      });
    })();
  }

  exportcsv(req, res) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      if (!_this2.model) return _this2.res.sendData("model_not_defined");
      var {
        rows
      } = yield _this2.findExec(); //, total

      var header = [];
      Object.entries(_this2.model.def.attributes).forEach((_ref, index) => {
        var [field, defField] = _ref;
        var title = field;
        var t = field.split("_");

        if (t.length > 1) {
          t.shift();
          title = t.join("_");
        } // fields not exported


        if (title === "password" || title === "accesstoken" || title === "accesstokenexpire" || title === "refreshtoken" || title === "forgetpassdate") return;
        if (defField.toExport === false) return;
        header.push({
          id: field,
          title
        });
      });
      var dest = process.cwd() + "/uploads/temp/";

      _fsExtra.default.ensureDirSync(dest);

      dest += "export-" + _this2.model.def.modelname + ".csv";
      var csvWriter = createCsvWriter({
        path: dest,
        header: header
      });
      csvWriter.writeRecords(rows) // returns a promise
      .then(() => {
        //console.log("...Done");
        res.header("content-disposition", "attachment; filename=export-csv-" + _this2.model.def.modelname + ".csv");

        var readStream = _fsExtra.default.createReadStream(dest);

        readStream.pipe(res);
      }); // this.res.sendData({ data: rows, meta: { total: total } });
    })();
  }

  findone(req, res) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      if (!_this3.model) return res.sendData(res, "model_not_defined");
      var row = yield _this3.findoneExec(req);
      if (!row) return res.sendData("not_found");
      res.sendData({
        data: row
      });
    })();
  }

  create(req, res) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      if (!_this4.model) return res.sendData("model_not_defined");
      var row = yield _this4.createExec();
      if (!row) return res.sendData("insert_error");
      res.sendData({
        data: row
      });
    })();
  }

  update(req, res) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      if (!_this5.model) return res.sendData("model_not_defined");
      var row = yield _this5.updateExec();
      if (!row) return res.sendData("not_found");
      res.sendData({
        data: row
      });
    })();
  }

  destroy(req, res) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      if (!_this6.model) return res.sendData({
        err: _Services.Services.err(501),
        data: null
      });
      var oldrow = yield _this6.destroyExec();
      if (!oldrow) return res.sendData("not_found");
      res.sendData({
        data: oldrow
      });
    })();
  }

  findCreateOrderBy(req) {
    return _asyncToGenerator(function* () {
      var orderby = "";

      if (req.query.sort) {
        var orderSort = "";
        if (req.query.order_sort) orderSort = req.query.order_sort.replace(/\\/g, "");
        orderby = " order by " + req.query.sort.replace(/\\/g, "") + " " + orderSort;
      }

      return orderby;
    })();
  }

  debug() {
    this.debugQuery = true;
    return this;
  }

  findCreateLimit(req) {
    return _asyncToGenerator(function* () {
      var limit = 0,
          skip = 0;

      if (req.query.skip && req.query.skip != "NaN" && typeof (req.query.skip * 1) === "number") {
        skip = req.query.skip * 1;
      }

      if (req.query.limit && req.query.limit != "NaN" && typeof (req.query.limit * 1) === "number") {
        limit = req.query.limit * 1;
      }

      if (skip > 0 && limit === 0) limit = 1844674407370955161;
      return {
        limit,
        skip
      };
    })();
  } // remplacer _update et _create par updateexec()


  findCreateWhere(req) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      var where = "1=1",
          whereData = [];

      function findCreateWhereForField(tx, field, value) {
        if (value.indexOf("contains:") === 0) {
          where += " && ".concat(tx, ".").concat(field, " like ?");
          whereData.push("%" + value.substring(9) + "%");
        } else if (value.indexOf("startwith:") === 0) {
          where += " && ".concat(tx, ".").concat(field, " like ?");
          whereData.push(value.substring(10) + "%");
        } else if (value.indexOf("endwith:") === 0) {
          where += " && ".concat(tx, ".").concat(field, " like ?");
          whereData.push("%" + value.substring(8));
        } else if (value.indexOf(">=") === 0) {
          where += " && ".concat(tx, ".").concat(field, " >= ?");
          whereData.push(value.substring(2));
        } else if (value.indexOf(">") === 0) {
          where += " && ".concat(tx, ".").concat(field, " > ?");
          whereData.push(value.substring(1));
        } else if (value.indexOf("<=") === 0) {
          where += " && ".concat(tx, ".").concat(field, " <= ?");
          whereData.push(value.substring(2));
        } else if (value.indexOf("<") === 0) {
          where += " && ".concat(tx, ".").concat(field, " < ?");
          whereData.push(value.substring(1));
        } else {
          where += " && ".concat(tx, ".").concat(field, " = ?");
          whereData.push(req.query[field]);
        }
      }

      Object.entries(_this7.model.def.attributes).forEach((_ref2, index) => {
        var [field, defField] = _ref2;
        if (req.query[field]) findCreateWhereForField("t1", field, req.query[field] + "");
        if (req.query[field + "_"]) findCreateWhereForField("t1", field, req.query[field + "_"]);
        if (req.query[field + "__"]) findCreateWhereForField("t1", field, req.query[field + "__"]);
        if (req.query[field + "___"]) findCreateWhereForField("t1", field, req.query[field + "___"]);
      });
      return {
        where,
        whereData
      };
    })();
  } // async findWhere(fn) {
  // 	this._findWhere = fn;
  // }
  // async findLimit(fn) {
  // 	this._findLimit = fn;
  // }
  // async findOrderBy(fn) {
  // 	this._findOrderBy = fn;
  // }


  findExec() {
    var _arguments = arguments,
        _this8 = this;

    return _asyncToGenerator(function* () {
      var what = _arguments.length > 0 && _arguments[0] !== undefined ? _arguments[0] : {};
      var req = _this8.req;
      var {
        where,
        whereData
      } = yield _this8.findCreateWhere(req);

      if (what.where) {
        var r = yield what.where(where, whereData);
        where = r.where;
        whereData = r.whereData;
      }

      var {
        limit,
        skip
      } = yield _this8.findCreateLimit(req);

      if (what.limit) {
        var _r = yield what.limit(limit, skip);

        limit = _r.limit;
        skip = _r.skip;
      }

      var limitreq = limit || skip ? " limit ".concat(skip, ",").concat(limit) : "";
      var orderby = yield _this8.findCreateOrderBy(req);
      if (what.orderBy) orderby = yield what.orderBy(orderby); // eslint-disable-next-line

      var toexec = _this8.model.find(where + orderby + limitreq, whereData);

      if (_this8.debugQuery) {
        console.warn("where + orderby + limitreq, whereData", where + orderby + limitreq, whereData);
        toexec.debug();
      } // if (this.populateOnFind) {
      // Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
      // 	if (defField.model) toexec.populate(defField.alias);
      // });
      // morePopulate.forEach((field) => {
      // 	toexec.populate(field);
      // });


      if (what.populate) {
        what.populate.forEach(field => {
          toexec.populate(field);
        });
      } else toexec.populateAll(); // }


      var rows = yield toexec.exec();
      var total = rows.length;

      if (limit) {
        var _toexec = _this8.model.count(where + orderby, whereData);

        if (_this8.populateOnFind) {
          Object.entries(_this8.model.def.attributes).forEach((_ref3, index) => {
            var [field, defField] = _ref3;
            if (defField.model) _toexec.populate(field);
          });
        }

        total = yield _toexec.exec();
      }

      return {
        rows,
        total
      };
    })();
  }

  createEmpty(req) {
    var row = this.model.createEmpty();
    row[this.model.primary] = "";
    return row;
  }

  findoneExec() {
    var _arguments2 = arguments,
        _this9 = this;

    return _asyncToGenerator(function* () {
      var what = _arguments2.length > 0 && _arguments2[0] !== undefined ? _arguments2[0] : {};
      var where = "",
          whereData = [],
          row,
          req = _this9.req,
          id = req.params.id || req.params[_this9.model.primary];

      if (id * 1 < 0) {
        row = _this9.createEmpty(req);
      } else {
        where += "t1.".concat(_this9.model.primary, "=?");
        whereData.push(id);

        var toexec = _this9.model.findone(where, whereData); // Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
        // 	if (defField.model) toexec.populate(field);
        // });
        // morePopulate.forEach((field) => {
        // 	toexec.populate(field);
        // });


        row = yield toexec.populateAll().exec();
      }

      return row;
    })();
  }

  _compareData(oldData, newData) {
    var compare = {};
    Object.entries(oldData).forEach((_ref4, index) => {
      var [keyoldval, oldval] = _ref4;
      if (keyoldval == "updatedAt") return;
      if (keyoldval == "createdAt") return;
      if (newData[keyoldval] == undefined) return;
      var newval = newData[keyoldval];
      if (!oldval && !newval) return;
      if (oldval && oldval instanceof Date && !isNaN(oldval.valueOf())) oldval = oldval.toString();
      if (newval && newval instanceof Date && !isNaN(newval.valueOf())) newval = newval.toString();
      if (Array.isArray(oldval)) oldval = JSON.stringify(oldval);
      if (Array.isArray(newval)) newval = JSON.stringify(newval);
      if (this.isObject(oldval)) oldval = JSON.stringify(oldval);
      if (this.isObject(newval)) newval = JSON.stringify(newval);

      if (newval != oldval) {
        compare[keyoldval + "_old"] = oldval;
        compare[keyoldval + "_new"] = newval;
      }
    });
    return compare;
  }

  isObject(o) {
    return Object.prototype.toString.call(o) === "[object Object]";
  }

  createExec() {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      var req = _this10.req;

      _this10._checkPopulateSended(req);

      var newrow = yield _this10.model.create(req.body).exec(true);
      if (!newrow) return null;
      req.params.id = newrow[_this10.model.primary]; // if (this.modellogevents) await this._log(req, "create", null, newrow);

      return yield _this10.findoneExec(req);
    })();
  }

  _checkPopulateSended(req) {
    Object.entries(this.model.def.attributes).forEach((_ref5, index) => {
      var [field, defField] = _ref5;

      if (defField.model) {
        // if (req.body[field] && this.isObject(req.body[field])) {
        // 	let modelToJoin = global[defField.model];
        // 	if (modelToJoin.primary) req.body[field] = req.body[field][modelToJoin.primary];
        // }
        if (req.body[defField.alias] && this.isObject(req.body[defField.alias])) {
          var modelToJoin = _DbMysql.Models[defField.model];
          if (modelToJoin.primary) req.body[field] = req.body[defField.alias][modelToJoin.primary];
        }
      }
    });
  }

  updateExec() {
    var _this11 = this;

    return _asyncToGenerator(function* () {
      var req = _this11.req,
          id = req.params.id || req.params[_this11.model.primary],
          where = "".concat(_this11.model.primary, "=?"),
          whereData = [id],
          oldrow;

      if (_this11.modellogevents) {
        oldrow = yield _this11.model.findone(where, whereData).exec();
        if (!oldrow) return null;
      }

      delete req.body[_this11.model.primary];

      _this11._checkPopulateSended(req);

      var row = yield _this11.model.updateone(where, whereData, req.body).exec();
      if (!row) return null; // if (row.length) newrow = row[0];
      // if (this.modellogevents) await this._log(req, "update", oldrow, newrow);

      return yield _this11.findoneExec(req);
    })();
  }

  destroyExec() {
    var _arguments3 = arguments,
        _this12 = this;

    return _asyncToGenerator(function* () {
      var updateDeleteField = _arguments3.length > 0 && _arguments3[0] !== undefined ? _arguments3[0] : false;
      var where = "",
          whereData = [],
          oldrow,
          id = _this12.req.params.id || _this12.req.params[_this12.model.primary];
      where = "".concat(_this12.model.primary, "=?");
      whereData = id;
      oldrow = yield _this12.model.findone(where, whereData).exec();
      if (!oldrow) return null; // if (this.modellogevents) await this._log(req, "destroy", oldrow, null);

      if (updateDeleteField === false) {
        yield _this12.model.destroy(where, whereData).exec();
      } else {
        var d = {};
        d[updateDeleteField] = true;
        yield _this12.model.update(where, whereData, d).exec();
      }

      return oldrow;
    })();
  } // async _log(req, modelEvent, oldrow, newrow) {
  // 	let id = req.params.id || req.params[this.model.primary];
  // 	let c = "";
  // 	if (modelEvent == "create") c = newrow;
  // 	else if (modelEvent == "destroy") c = oldrow;
  // 	else if (modelEvent == "update") c = this._compareData(oldrow, newrow);
  // 	await Logs.create({
  // 		us_id_user: req.user ? req.user.us_id : 0,
  // 		lg_model_event: modelEvent,
  // 		lg_model_name: this.modelname,
  // 		lg_model_id: id,
  // 		lg_data: c,
  // 	}).exec();
  // }


  before(req, res) {
    return _asyncToGenerator(function* () {})();
  }

  policy(req, res) {
    return _asyncToGenerator(function* () {
      return true;
    })();
  }

  render(page, params) {
    this.res.render(page, params);
  }

}

exports.Controller = Controller;

function loadControllers() {
  return _loadControllers.apply(this, arguments);
}

function _loadControllers() {
  _loadControllers = _asyncToGenerator(function* () {
    var where = "/src";
    if (_Config.Config.app.mode == "production") where = "/lib";

    var controllerFiles = _globule.default.find("".concat(process.cwd()).concat(where, "/**/*.controller.js"));

    console.warn(_chalk.default.yellow("@Info - Routes list :"));

    for (var i = 0; i < controllerFiles.length; i++) {
      // let d = new Date();
      var controllerFile = controllerFiles[i];
      var obj = yield Promise.resolve("".concat(controllerFile)).then(s => _interopRequireWildcard(require(s)));
      Object.entries(obj).forEach((_ref6, index) => {
        var [name, constructorFn] = _ref6;
        var c = new constructorFn();

        c._addRoutes();
      }); // console.log("d oooo", new Date() - d);
    }
  });
  return _loadControllers.apply(this, arguments);
}
//# sourceMappingURL=Controller.js.map