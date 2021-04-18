"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var dayjs = require("dayjs");

var chalk = require("chalk");

module.exports = class DbTableExec {
  constructor(table) {
    this.table = table;
    this.DbMysql = table.DbMysql;
    this.connection = table.connection;
    this.def = table.def;
    this.modelname = this.def.modelname;
    this.selected = [];
    this.command = "SELECT";
    this.returnCompleteRow = true;
    this.primary = "id";
    this.primaryType = "integer";
    this.primaryLength = 11;
    this.where = "";
    this.whereData = [];
    this.onlyOne = false;
    this.order = "";
    this.having = "";
    this.groupby = "";
    this.tabAlreadyIncluded = {};
    this.logQuery = false;
    this.catchErr = false;
    this.iscount = false; // this.swallowerror = false;

    this.joinModels = [{
      modelname: this.modelname,
      fieldJoin: null,
      modelnameto: null,
      modelalias: "t1"
    }];

    for (var [fieldName, field] of Object.entries(this.def.attributes)) {
      if (field.primary) {
        this.primary = fieldName;
        this.primaryType = field.type;
        this.primaryLength = field.length;
      }
    }
  }

  select(fields) {
    this.selected = fields;
    return this;
  }

  find(where, whereData) {
    this.command = "SELECT";
    this.onlyOne = false;
    this.where = where;
    if (whereData === undefined) this.whereData = [];else this.whereData = whereData;
    return this;
  }

  count(where, whereData) {
    this.iscount = true;
    return this.find(where, whereData);
  }

  findone(where, whereData) {
    this.onlyOne = true;
    this.where = where;
    if (whereData === undefined) this.whereData = [];else this.whereData = whereData;
    return this;
  }

  create(data) {
    this.onlyOne = false;
    this.command = "INSERT";
    this.data = data;
    return this;
  }

  cloneDeep(what) {
    return JSON.parse(JSON.stringify(what));
  }

  update(where, whereData, data) {
    if (data === undefined) {
      data = whereData;
      this.whereData = [];
    } else {
      this.whereData = whereData;
    }

    this.original_where = this.cloneDeep(where);
    this.original_whereData = this.cloneDeep(this.whereData);
    this.whereData = [];
    this.onlyOne = false;
    this.command = "UPDATE";
    this.where = where;
    this.data = data; // console.log("where,data", where, data);

    return this;
  }

  replace(data) {
    // this.original_where = this.cloneDeep(where);
    // this.original_whereData = this.cloneDeep(this.whereData);
    this.whereData = [];
    this.onlyOne = false;
    this.command = "REPLACE";
    this.where = "";
    this.data = data; // console.log("where,data", where, data);

    return this;
  }

  updateone(where, whereData, data) {
    this.update(where, whereData, data);
    this.onlyOne = true;
    return this;
  }

  query(query, data) {
    this.command = "QUERY";
    this.whereData = data;
    this.querySaved = query;
    return this;
  }

  destroy(where) {
    var whereData = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    this.whereData = whereData;
    this.onlyOne = false;
    this.command = "DELETE";
    this.where = where;
    return this;
  }

  _searchModelFromFieldName(fieldJoin, fromModelName) {
    // console.log("fieldJoin, fromModelName", fieldJoin, fromModelName);
    var f = null,
        n = "",
        isNotAlias = false;

    for (var [fieldName, field] of Object.entries(this.DbMysql.models[fromModelName].def.attributes)) {
      if (field.model && (field.alias == fieldJoin || fieldName == fieldJoin)) {
        f = field;
        n = fieldName;
        if (fieldName == fieldJoin) isNotAlias = true;
      }
    }

    return {
      modeltolink: f,
      modeltolinkname: n,
      isNotAlias
    };
  }

  log() {
    this.logQuery = true;
    return this;
  }

  swallowError() {
    this.catchErr = false;
    return this;
  }

  catchError() {
    this.catchErr = true;
    return this;
  }

  returnRow(returnCompleteRow) {
    this.returnCompleteRow = returnCompleteRow;
    return this;
  }

  populateAll() {
    var exclude = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var me = this;

    function populateThis(table, origins) {
      // eslint-disable-next-line
      for (var [field, defField] of Object.entries(table.def.attributes)) {
        if (defField.model) {
          if (exclude.indexOf(origins + defField.alias) >= 0) continue;
          me.populate(origins + defField.alias);
          populateThis(me.DbMysql.models[defField.model], origins + defField.alias + ".");
        }
      }
    }

    populateThis(this.table, ""); //origins=[]

    return this;
  }

  populate(fieldJoin) {
    // console.log("fieldJoin, fieldJoinName", fieldJoin);
    var tabFieldsJoins = fieldJoin.split(".");
    var previousModelName = this.modelname;
    var previousModelAlias = "t1";
    var tabOrigin = [];

    for (var iJoin = 0; iJoin < tabFieldsJoins.length; iJoin++) {
      var join = tabFieldsJoins[iJoin];

      var {
        modeltolink,
        modeltolinkname,
        isNotAlias
      } = this._searchModelFromFieldName(join, previousModelName);

      if (!modeltolink) {
        console.warn(chalk.red("The alias ".concat(join, " not found in table ").concat(previousModelName, ". Can't populate ").concat(fieldJoin, ".")));
        break;
      }

      if (!modeltolink.alias) {
        console.warn(chalk.red("Alias name is mandatory for field ".concat(modeltolinkname)));
        break;
      }

      if (isNotAlias) {
        console.warn(chalk.magenta("It's better to indicate alias name '".concat(modeltolink.alias, "' rather field name ").concat(join, " to populate")));
        join = modeltolink.alias;
      } // console.log("modeltolink", modeltolink);


      var modelalias = "t1";
      tabOrigin.push(join);

      if (!this.tabAlreadyIncluded[modeltolink.model + "__" + tabOrigin.join("_")]) {
        modelalias = tabOrigin.join("__"); //+ modeltolink.alias

        this.joinModels.push({
          modelname: modeltolink.model,
          modelalias: modelalias,
          fieldJoin: modeltolinkname,
          modelnameto: previousModelName,
          modelaliasto: previousModelAlias,
          origin: tabOrigin.join("."),
          fieldJoinName: modeltolink.alias || null
        });
        this.tabAlreadyIncluded[modeltolink.model + "__" + tabOrigin.join("_")] = modelalias;
      } else {
        modelalias = this.tabAlreadyIncluded[modeltolink.model + "__" + tabOrigin.join("_")];
      }

      previousModelName = modeltolink.model;
      previousModelAlias = modelalias;
    }

    return this;
  }

  orderBy(order) {
    this.order = order;
    return this;
  }

  groupBy(groupby) {
    this.groupby = groupby;
    return this;
  }

  having(having) {
    this.having = having;
    return this;
  }

  _createWhere(fromUpdate) {
    // console.log("this.joinModels", this.joinModels);
    var where = "";

    if (!this.where) {
      where = "1=1";
    } else if (Number.isInteger(this.where)) {
      where += this.primary + "=?";
      this.whereData.push(this.where);
    } else if (typeof this.where === "string") {
      where = this.where;
      this.joinModels.forEach((model, num) => {
        if (model.origin) {
          var reg = new RegExp(model.origin, "gi");
          where = where.replace(reg, model.modelalias);
        }
      });

      if (fromUpdate) {
        this.whereData = this.whereData.concat(this.original_whereData);
      }
    } else {
      where += "1";
      Object.entries(this.where).forEach((_ref, index) => {
        var [key, val] = _ref;
        where += " && " + key + "=?";
        this.whereData.push(val);
      });
    }

    return where;
  }

  _createSelect() {
    var tabSelect = [];
    this.joinModels.forEach((model, num) => {
      for (var [fieldName] of Object.entries(this.DbMysql.models[model.modelname].def.attributes)) {
        var as = "";
        if (model.modelnameto) as = " AS " + model.modelalias + "_" + model.fieldJoin + "_" + fieldName;
        tabSelect.push(model.modelalias + "." + fieldName + as);
      }
    });
    if (this.selected.length) tabSelect = this.selected;
    return tabSelect.join(", ");
  }

  _createJoin() {
    var tabJoin = [];
    this.joinModels.forEach((model, num) => {
      if (!model.modelnameto) tabJoin.push(this.DbMysql.models[model.modelname].def.tableName + " " + model.modelalias);else tabJoin.push("LEFT JOIN " + this.DbMysql.models[model.modelname].def.tableName + " " + model.modelalias + " ON " + model.modelalias + "." + this.DbMysql.models[model.modelname].primary + "=" + model.modelaliasto + "." + model.fieldJoin);
    });
    return tabJoin.join(" ");
  }

  _createOrder() {
    var order = "";
    if (this.order) order = " ORDER BY " + this.order;
    return order;
  }

  _createSelectQuery() {
    var query = "SELECT " + this._createSelect() + " FROM " + this._createJoin() + " WHERE " + this._createWhere() + this._createOrder();

    if (this.iscount) {
      query = "SELECT count(t1." + this.primary + ") as cmpt FROM " + this._createJoin() + " WHERE " + this._createWhere() + this._createOrder();
    }

    return query;
  }

  _createInsertQuery() {
    var fields = [],
        vals = [];

    for (var [key, val] of Object.entries(this.def.attributes)) {
      if (val.primary && val.autoincrement) continue;
      fields.push(key);
      vals.push("?");

      if (this.data.hasOwnProperty(key)) {
        this.whereData.push(this.data[key]);
      } else {
        if (val.defaultsTo) this.whereData.push(val.defaultsTo);else {
          if (val.type == "int" || val.type == "integer" || val.type == "tinyint" || val.type == "smallint" || val.type == "mediumint" || val.type == "year" || val.type == "float" || val.type == "double" || val.type == "boolean") this.whereData.push(0);else this.whereData.push("");
        }
      }
    }

    var query = "INSERT INTO " + this.def.tableName + "(" + fields.join(", ") + ") VALUES (" + vals.join(", ") + ")";
    return query;
  }

  _createUpdateQuery() {
    var vals = [];

    for (var [key, val] of Object.entries(this.data)) {
      if (this.def.attributes[key]) {
        vals.push(key + "=?");
        this.whereData.push(val);
      }
    }

    var query = "UPDATE " + this.def.tableName + " SET " + vals.join(", ") + " WHERE " + this._createWhere(true);

    return query;
  } // _createReplaceQuery() {
  // 	let vals = [];
  // 	for (const [key, val] of Object.entries(this.data)) {
  // 		if (this.def.attributes[key]) {
  // 			vals.push(key + "=?");
  // 			this.whereData.push(val);
  // 		}
  // 	}
  // 	let query = "UPDATE " + this.def.tableName + " SET " + vals.join(", ") + " WHERE " + this._createWhere(true);
  // 	return query;
  // }


  _createDestroyQuery() {
    var query = "DELETE FROM " + this.def.tableName + " WHERE " + this._createWhere();

    return query;
  }

  _preTreatment() {
    for (var [fieldName, field] of Object.entries(this.def.attributes)) {
      // console.log("fieldName,field.type",fieldName,field.type);
      if (this.data[fieldName] === undefined) return;

      if (field.type == "json" && typeof this.data[fieldName] == "object") {
        try {
          this.data[fieldName] = JSON.stringify(this.data[fieldName]);
        } catch (e) {
          console.warn("json stringify error", e);
          this.data[fieldName] = "";
        }
      }

      if (field.type == "json" && typeof this.data[fieldName] !== "object") {
        try {
          this.data[fieldName] = JSON.parse(this.data[fieldName]);
        } catch (e) {}

        try {
          this.data[fieldName] = JSON.stringify(this.data[fieldName]);
        } catch (e) {
          console.warn("json stringify error", e);
          this.data[fieldName] = "";
        }
      }

      if (field.type == "boolean") {
        if (this.data[fieldName] === false) this.data[fieldName] = 0;
        if (this.data[fieldName] === true) this.data[fieldName] = 1;
        if (this.data[fieldName] === "false") this.data[fieldName] = 0;
        if (this.data[fieldName] === "true") this.data[fieldName] = 1;
      }

      if (field.type == "datetime" && this.data[fieldName]) {
        this.data[fieldName] = dayjs(new Date(this.data[fieldName])).format("YYYY-MM-DD HH:mm:ss");
      }

      if (field.type == "date" && this.data[fieldName]) {
        var m = dayjs(new Date(this.data[fieldName]));
        if (this.data[fieldName] == "0000-00-00" || this.data[fieldName] == "" || !m.isValid()) this.data[fieldName] = "0000-00-00";else this.data[fieldName] = m.format("YYYY-MM-DD");
      }

      if (field.type == "datetime" && this.data[fieldName]) {
        var _m = dayjs(new Date(this.data[fieldName]));

        if (this.data[fieldName] == "0000-00-00" || this.data[fieldName] == "0000-00-00 00:00:00" || this.data[fieldName] == "" || !_m.isValid()) this.data[fieldName] = "0000-00-00 00:00:00";else this.data[fieldName] = _m.format("YYYY-MM-DD HH:mm:ss");
      }
    }
  }

  _postTreatment(rows) {
    rows.forEach(row => {
      for (var [fieldName, field] of Object.entries(this.def.attributes)) {
        if (field.type == "json") {
          try {
            if (row[fieldName]) row[fieldName] = JSON.parse(row[fieldName]);else row[fieldName] = null;
          } catch (e) {
            console.warn(chalk.red("json parse error - fieldName:\"".concat(fieldName, "\" - value:\"").concat(row[fieldName], "\"")));
            row[fieldName] = null;
          }
        }

        if (field.type == "boolean") {
          if (row[fieldName] === true || row[fieldName] === "true" || row[fieldName] === 1 || row[fieldName] === "1") row[fieldName] = true;else row[fieldName] = false;
        }
      }

      this.joinModels.forEach((model, num) => {
        // console.log("model", model);
        if (model.modelnameto) {
          var obj = {};

          for (var [_fieldName, _field] of Object.entries(this.DbMysql.models[model.modelname].def.attributes)) {
            // let f = DbMysql.models[model.modelname].def.tableName+'_'+model.fieldJoin+'_'+fieldName ;
            var f = model.modelalias + "_" + model.fieldJoin + "_" + _fieldName;

            if (row.hasOwnProperty(f)) {
              if (_field.type == "json") {
                try {
                  if (row[f]) row[f] = JSON.parse(row[f]);else row[f] = null;
                } catch (e) {
                  console.warn(chalk.red("json parse error"), e, f, row[f]);
                  row[f] = null;
                }
              }

              obj[_fieldName] = row[f];
              delete row[f];
            }
          } // console.log("model.fieldJoinName", model.fieldJoinName);


          if (model.fieldJoinName && model.modelaliasto == "t1") {
            row[model.fieldJoinName] = obj;
          } else {
            if (!obj[this.DbMysql.models[model.modelname].primary]) {
              obj = null;
            }

            var tabFieldsJoins = model.origin.split(".");
            var previousObj = row; // console.log("previousObj", previousObj);

            var lastO = null;
            tabFieldsJoins.forEach((o, index) => {
              lastO = o;
              if (index >= tabFieldsJoins.length - 1) return;
              previousObj = previousObj[o];
            });
            if (previousObj) previousObj[lastO] = obj;
          }
        }
      });
    });
  }

  _beforeQuery() {
    var _this = this;

    return _asyncToGenerator(function* () {
      var fn = null,
          fn2 = null;

      switch (_this.command) {
        case "UPDATE":
          // if (this.def.useUpdatedAt && !this.data.updatedAt) this.data.updatedAt = new Date();
          if (_this.def.useUpdatedAt) _this.data.updatedAt = new Date();
          if (_this.data.updatedAtForced) _this.data.updatedAt = _this.data.updatedAtForced;
          if (_this.def.beforeUpdate) fn = _this.def.beforeUpdate;
          break;

        case "DELETE":
          if (_this.def.beforeDestroy) fn2 = _this.def.beforeDestroy;
          break;

        case "INSERT":
          // if (this.def.useCreatedAt && !this.data.createdAt) this.data.createdAt = new Date();
          // if (this.def.useUpdatedAt && !this.data.updatedAt) this.data.updatedAt = new Date();
          if (_this.def.useCreatedAt) _this.data.createdAt = new Date();
          if (_this.def.useUpdatedAt) _this.data.updatedAt = new Date();
          if (_this.data.createdAtForced) _this.data.createdAt = _this.data.createdAtForced;
          if (_this.data.updatedAtForced) _this.data.updatedAt = _this.data.updatedAtForced;
          if (_this.def.beforeCreate) fn = _this.def.beforeCreate;
          break;
        // case 'REPLACE':
        // if (this.def.beforeCreate) fn = this.def.beforeCreate ;
        // break;

        default:
          if (_this.def.beforeSelect) fn = _this.def.beforeSelect;
      }

      if (fn) yield fn(_this.data);else if (fn2) yield fn();
    })();
  }

  exec() {
    var _arguments = arguments,
        _this2 = this;

    return _asyncToGenerator(function* () {
      var returnCompleteRow = _arguments.length > 0 && _arguments[0] !== undefined ? _arguments[0] : true;

      if (_this2.command == "REPLACE") {
        var w = "0",
            wData = [];

        if (_this2.data[_this2.primary]) {
          w = _this2.primary + "=?";
          wData.push(_this2.data[_this2.primary]);
        }

        var _query = "SELECT " + _this2.primary + " FROM " + _this2.def.tableName + " WHERE " + w;

        rows = yield _this2.connection.query(_query, wData, _this2.catchErr);

        if (rows.length) {
          _this2.command = "UPDATE";
          _this2.where = _this2.primary + "=?";
          _this2.whereData = [];
          _this2.original_where = _this2.primary + "=?";
          _this2.original_whereData = [rows[0][_this2.primary]];
        } else {
          _this2.command = "INSERT";
          delete _this2.data[_this2.primary];
        }
      }

      _this2._beforeQuery();

      var query;

      switch (_this2.command) {
        case "QUERY":
          query = _this2.querySaved;
          break;

        case "INSERT":
          _this2._preTreatment();

          query = _this2._createInsertQuery();
          break;

        case "UPDATE":
          _this2._preTreatment();

          query = _this2._createUpdateQuery();
          break;

        case "DELETE":
          query = _this2._createDestroyQuery();
          break;

        default:
          query = _this2._createSelectQuery();
      }

      if (_this2.def.debug || _this2.logQuery) console.warn("query", query, _this2.whereData);
      var rows;

      try {
        rows = yield _this2.connection.query(query, _this2.whereData, _this2.catchErr);
      } catch (error) {
        throw error;
      }

      var data = yield _this2.postTreatmentMain(rows, returnCompleteRow);
      return data; // }
    })();
  }

  postTreatmentMain(rows, returnCompleteRow) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      var res;

      if (!rows) {
        res = {};

        switch (_this3.command) {
          case "QUERY":
            res = [];
            break;

          case "UPDATE":
            res = null;
            break;

          case "DELETE":
            res = 0;
            break;

          case "INSERT":
            res = null;
            break;

          default:
            res = {};
            break;
        }

        return res;
      }

      switch (_this3.command) {
        case "QUERY":
          res = rows;
          break;

        case "UPDATE":
          res = rows.affectedRows;
          break;

        case "DELETE":
          res = rows.affectedRows;
          break;

        case "INSERT":
          res = rows.insertId;
          if (res) _this3.data[_this3.primary] = rows.insertId;
          break;

        default:
          if (_this3.iscount) res = rows[0].cmpt;else {
            _this3._postTreatment(rows);

            if (_this3.onlyOne) {
              if (rows.length) res = rows[0];else res = null;
            } else res = rows;
          }
      }

      if (_this3.def.debug) console.warn("res", res);

      if (returnCompleteRow && (_this3.command == "UPDATE" || _this3.command == "INSERT")) {
        if (_this3.command == "UPDATE") {
          var rows2 = yield _this3.table.find(_this3.original_where, _this3.original_whereData).exec();
          if (_this3.onlyOne) return rows2[0];
          return rows2;
        } else {
          var ftemp = {};
          ftemp[_this3.primary] = res;

          if (!res) {
            ftemp[_this3.primary] = _this3.data[_this3.primary];
          }

          var _rows = yield _this3.table.findone(ftemp).exec();

          return _rows;
        }
      } else return res;
    })();
  }

};
//# sourceMappingURL=DbTableExec.js.map