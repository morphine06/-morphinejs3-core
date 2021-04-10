"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Crud = Crud;
exports.loadControllers = loadControllers;
exports.Controller = void 0;

var _globule = _interopRequireDefault(require("globule"));

var _dayjs = _interopRequireDefault(require("dayjs"));

var _App = require("./App");

var _Services = require("./Services");

var _Middlewares = require("./Middlewares");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// import { Config } from "./Config";
function Crud(url) {
  return function decorator(target) {
    // console.log("1");
    target.prototype.isCrud = url;
  };
}

class Controller {
  constructor() {
    this.populateOnFind = true;
  }

  describeRoutes() {
    this._routes.forEach(route => {
      // eslint-disable-next-line
      console.log("".concat(route.method.toUpperCase(), " ").concat(route.url, " > ").concat(route.controllerName, " > ").concat(route.name));
    });
  }

  _addRoutes() {
    // console.log("this._routes", this._routes);
    this._routes.forEach(route => {
      // console.log("this", this, route);
      // console.log("this._middlewares", this._middlewares, Middlewares);
      _App.App[route.method](route.url, (req, res, next) => {
        var timer = new Date();
        req.on("end", function () {
          // console.log("onend args", args);
          var diff = (0, _dayjs.default)().diff(timer);
          if (diff > 1000) diff = diff / 1000 + "s";else diff += "ms"; // eslint-disable-next-line

          console.log((0, _dayjs.default)().format("YYYY-MM-DD HH:mm:ss") + " - GET " + route.url + " - " + diff);
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
      // if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
      // console.log("find this.model", this.model);
      if (!_this.model) return res.sendData("model_not_defined");
      var {
        rows,
        total
      } = yield _this._find(req);
      res.sendData({
        data: rows,
        meta: {
          total: total
        }
      });
    })();
  }

  findone(req, res) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      // if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
      if (!_this2.model) return res.sendData(res, "model_not_defined");
      var row = yield _this2._findone(req);
      if (!row) return res.sendData("not_found");
      res.sendData({
        data: row
      });
    })();
  }

  create(req, res) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      // if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
      if (!_this3.model) return res.sendData("model_not_defined");
      var row = yield _this3._create(req);
      res.sendData({
        data: row
      });
    })();
  }

  update(req, res) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      // if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
      if (!_this4.model) return res.sendData("model_not_defined");
      var row = yield _this4._update(req);
      if (!row) return res.sendData("not_found");
      res.sendData({
        data: row
      });
    })();
  }

  destroy(req, res) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      // if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
      if (!_this5.model) return res.sendData({
        err: _Services.Services.err(501),
        data: null
      });
      var oldrow = yield _this5._destroy(req);
      res.sendData({
        data: oldrow
      });
    })();
  }

  findCreateOrderBy(req) {
    return _asyncToGenerator(function* () {
      var orderby = ""; // @Marina je corrige ici, car il faut rajouter le orderSort, uniquement s'il y a un req.query.sort

      if (req.query.sort) {
        var orderSort = "";
        if (req.query.order_sort) orderSort = req.query.order_sort.replace(/\\/g, "");
        orderby = " order by " + req.query.sort.replace(/\\/g, "") + " " + orderSort;
      }

      return orderby;
    })();
  }

  findCreateLimit(req) {
    return _asyncToGenerator(function* () {
      var limit = "",
          skip = 0;

      if (req.query.skip != undefined && req.query.skip != "NaN" && typeof (req.query.skip * 1) === "number") {
        skip = req.query.skip * 1;
      }

      if (req.query.limit != undefined && typeof (req.query.limit * 1) === "number") {
        // if (!req.query.skip || !_.isNumber(req.query.skip * 1)) req.query.skip = 0;
        limit = " limit " + skip + "," + req.query.limit * 1;
      }

      return limit;
    })();
  }

  findCreateWhere(req) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      var where = "1=1",
          whereData = [];
      var model = _this6.model;

      function findCreateWhereForField(tx, field, value) {
        // console.log("field", field);
        if (value.indexOf("contains:") === 0) {
          where += " && " + tx + "." + field + " like ?";
          whereData.push("%" + value.substring(9) + "%");
        } else if (value.indexOf("startwith:") === 0) {
          where += " && " + tx + "." + field + " like ?";
          whereData.push(value.substring(10) + "%");
        } else if (value.indexOf("endwith:") === 0) {
          where += " && " + tx + "." + field + " like ?";
          whereData.push("%" + value.substring(8));
        } else if (value.indexOf(">=") === 0) {
          where += " && " + tx + "." + field + " >= ?";
          whereData.push(value.substring(2));
        } else if (value.indexOf(">") === 0) {
          where += " && " + tx + "." + field + " > ?";
          whereData.push(value.substring(1));
        } else if (value.indexOf("<=") === 0) {
          where += " && " + tx + "." + field + " <= ?";
          whereData.push(value.substring(2));
        } else if (value.indexOf("<") === 0) {
          where += " && " + tx + "." + field + " < ?";
          whereData.push(value.substring(1));
        } else {
          where += " && " + tx + "." + field + "=?";
          whereData.push(req.query[field]);
        }
      }

      Object.entries(model.def.attributes).forEach((_ref, index) => {
        var [field, defField] = _ref;
        // console.log("field", field, req.query[field]);
        // if (defField.model) {
        // 	let modelJoin = global[defField.model];
        // 	_.each(modelJoin.def.attributes, (defFieldJoin, fieldJoin) => {
        // 		if (req.query[fieldJoin]) findCreateWhereForField("t1",fieldJoin, req.query[fieldJoin]);
        // 		if (req.query[fieldJoin + "__"]) findCreateWhereForField("t1",fieldJoin, req.query[fieldJoin + "__"]);
        // 	});
        // } else {
        if (req.query[field]) findCreateWhereForField("t1", field, req.query[field] + "");
        if (req.query[field + "_"]) findCreateWhereForField("t1", field, req.query[field + "_"]);
        if (req.query[field + "__"]) findCreateWhereForField("t1", field, req.query[field + "__"]);
        if (req.query[field + "___"]) findCreateWhereForField("t1", field, req.query[field + "___"]); // }
      }); // console.log("where,whereData", where, whereData);

      return {
        where,
        whereData
      };
    })();
  }

  _find(req) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      var model = _this7.model;
      var {
        where,
        whereData
      } = yield _this7.findCreateWhere(req); // console.log("where,whereData", where, whereData);

      var limit = yield _this7.findCreateLimit(req);
      var orderby = yield _this7.findCreateOrderBy(req);
      var toexec = model.find(where + orderby + limit, whereData); // console.log("where + orderby + limit, whereData", where + orderby + limit, whereData);
      // if (this.populateOnFind) {

      if (_this7.populateOnFind) {
        Object.entries(model.def.attributes).forEach((_ref2, index) => {
          var [field, defField] = _ref2;
          if (defField.model) toexec.populate(field);
        });
      } // }
      // let t0;
      // t0 = moment();


      var rows = yield toexec.exec(); // console.log("rows", rows);
      // console.log("diff1", t0.diff(moment()));
      // t0 = moment();

      var total = rows.length;

      if (limit) {
        // console.log("where,whereData", where, whereData);
        var _toexec = model.count(where + orderby, whereData);

        if (_this7.populateOnFind) {
          Object.entries(model.def.attributes).forEach((_ref3, index) => {
            var [field, defField] = _ref3;
            if (defField.model) _toexec.populate(field);
          });
        }

        total = yield _toexec.exec(); // console.log("rows_temp", rows_temp);
        // total = rows_temp.length;
      } // console.log("diff2", t0.diff(moment()));


      return {
        rows,
        total
      };
    })();
  }

  createEmpty(req) {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      //Services.simpleSanitizeReq(req);
      var model = _this8.model;

      var primary = _this8._getPrimary(model);

      var row = model.createEmpty();
      row[primary] = "";
      return row;
    })();
  }

  _getPrimary(model) {
    var primary = null;
    Object.entries(model.def.attributes).forEach((_ref4, index) => {
      var [field, defField] = _ref4;
      if (defField.primary) primary = field;
    });
    return primary;
  }

  _findone(req) {
    var _arguments = arguments,
        _this9 = this;

    return _asyncToGenerator(function* () {
      var morePopulate = _arguments.length > 1 && _arguments[1] !== undefined ? _arguments[1] : [];
      //Services.simpleSanitizeReq(req);
      var model = _this9.model;

      var where = "",
          whereData = [],
          primary = _this9._getPrimary(model),
          row,
          id = req.params.id || req.params[primary];

      if (id * 1 < 0) {
        // console.log("createempty");
        row = yield _this9.createEmpty(req);
      } else {
        where += "t1." + primary + "=?";
        whereData.push(id);
        var toexec = model.findone(where, whereData);
        Object.entries(model.def.attributes).forEach((_ref5, index) => {
          var [field, defField] = _ref5;
          if (defField.model) toexec.populate(field);
        });
        morePopulate.forEach(field => {
          toexec.populate(field);
        });
        row = yield toexec.exec();
      }

      return row;
    })();
  }

  _compareData(oldData, newData) {
    // console.log("oldData, newData", oldData, newData);
    var compare = {};
    Object.entries(oldData).forEach((_ref6, index) => {
      var [keyoldval, oldval] = _ref6;
      // console.log("keyoldval, typeof ok[keyoldval]", keyoldval, typeof ok[keyoldval]);
      // if (_.isArray(ok[keyoldval])) return ;
      // if (_.isPlainObject(ok[keyoldval])) return ;
      if (keyoldval == "updatedAt") return;
      if (keyoldval == "createdAt") return;
      if (newData[keyoldval] == undefined) return;
      var newval = newData[keyoldval]; // console.log("oldval, newval", keyoldval, oldval, newval, typeof oldval, typeof newval);

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

  _create(req) {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      //Services.simpleSanitizeReq(req);
      var model = _this10.model,
          log = _this10.modellogevents,
          primary = _this10._getPrimary(model),
          newrow; // console.log("req.body", req.body);


      _this10._checkPopulateSended(req); // console.log("req.body2 :", req.body);


      newrow = yield model.create(req.body).exec(true); // console.log("newrow :", newrow);
      // console.log("newrow", newrow);

      req.params.id = newrow[primary];
      if (log) yield _this10._log(req, "create", null, newrow);
      return yield _this10._findone(req);
    })();
  }

  _checkPopulateSended(req) {
    var model = this.model;
    Object.entries(model.def.attributes).forEach((_ref7, index) => {
      var [field, defField] = _ref7;

      if (defField.model) {
        // console.log("defField.model :", defField.model);
        if (req.body[field] && this.isObject(req.body[field])) {
          var modelToJoin = global[defField.model];

          var primaryToJoin = this._getPrimary(modelToJoin);

          if (primaryToJoin) req.body[field] = req.body[field][primaryToJoin];
        }
      }
    });
  }

  _update(req, cb) {
    var _this11 = this;

    return _asyncToGenerator(function* () {
      //Services.simpleSanitizeReq(req);
      var model = _this11.model,
          primary = _this11._getPrimary(model),
          id = req.params.id || req.params[primary],
          where = "" + primary + "=?",
          whereData = [id],
          log = _this11.modellogevents,
          oldrow,
          newrow;

      if (log) {
        oldrow = yield model.findone(where, whereData).exec();
        if (!oldrow) return null;
      }

      delete req.body[primary];

      _this11._checkPopulateSended(req);

      var row = yield model.update(where, whereData, req.body).exec(log);
      if (!row) return null;
      if (row.length) newrow = row[0];
      if (log) yield _this11._log(req, "update", oldrow, newrow);
      return yield _this11._findone(req);
    })();
  }

  _destroy(req) {
    var _arguments2 = arguments,
        _this12 = this;

    return _asyncToGenerator(function* () {
      var updateDeleteField = _arguments2.length > 1 && _arguments2[1] !== undefined ? _arguments2[1] : false;

      //Services.simpleSanitizeReq(req);
      var model = _this12.model,
          where = "",
          whereData = [],
          primary = _this12._getPrimary(model),
          oldrow,
          log = _this12.modellogevents,
          id = req.params.id || req.params[primary];

      where = primary + "=?";
      whereData = id;
      oldrow = yield model.findone(where, whereData).exec();
      if (!oldrow) return null;
      if (log) yield _this12._log(req, "destroy", oldrow, null);

      if (updateDeleteField === false) {
        yield model.destroy(where, whereData).exec();
      } else {
        var d = {};
        d[updateDeleteField] = true;
        yield model.update(where, whereData, d).exec();
      }

      return oldrow;
    })();
  }

  _log(req, modelEvent, oldrow, newrow) {
    var _this13 = this;

    return _asyncToGenerator(function* () {
      var model = _this13.model,
          primary = _this13._getPrimary(model),
          id = req.params.id || req.params[primary];

      var c = "";
      if (modelEvent == "create") c = newrow;else if (modelEvent == "destroy") c = oldrow;else if (modelEvent == "update") c = _this13._compareData(oldrow, newrow);
      yield Logs.create({
        us_id_user: req.user ? req.user.us_id : 0,
        lg_model_event: modelEvent,
        lg_model_name: _this13.modelname,
        lg_model_id: id,
        lg_data: c
      }).exec();
    })();
  }

  before(req, res) {
    return _asyncToGenerator(function* () {})();
  }

  policy(req, res) {
    return _asyncToGenerator(function* () {
      return true;
    })();
  } // policies(req, res, next) {
  // 	console.log("iciciicci");
  // 	let ok = true;
  // 	async.eachSeries(
  // 		req.policies,
  // 		(policy, nextPolicy) => {
  // 			if (!Policies[policy]) {
  // 				console.warn("Policy " + policy + " not found");
  // 				ok = false;
  // 				return nextPolicy();
  // 			}
  // 			Policies[policy](req, res, ok => {
  // 				if (!ok) ok = false;
  // 				nextPolicy();
  // 			});
  // 		},
  // 		() => {
  // 			next(ok);
  // 		}
  // 	);
  // }


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
    var controllerFiles = _globule.default.find(process.cwd() + "/src/**/*.controller.js");

    for (var i = 0; i < controllerFiles.length; i++) {
      var controllerFile = controllerFiles[i];
      var obj = yield Promise.resolve("".concat(controllerFile)).then(s => _interopRequireWildcard(require(s)));
      Object.entries(obj).forEach((_ref8, index) => {
        var [name, constructorFn] = _ref8;
        var c = new constructorFn();

        c._addRoutes();
      });
    } // last route is not found
    // App.use(async (req, res, next) => {
    // 	if (Services.Middlewares.notFound) {
    // 		await Services.Middlewares.notFound(req, res, next);
    // 	} else {
    // 		if (req.accepts("html")) return res.status(404).render("404", { Config, cache: Config.app.mode != "development" });
    // 		if (req.accepts("json")) return res.status(404).json({ error: "Not found" });
    // 		res.status(404).type("txt").send("Not found");
    // 	}
    // });

  });
  return _loadControllers.apply(this, arguments);
}
//# sourceMappingURL=Controller.js.map