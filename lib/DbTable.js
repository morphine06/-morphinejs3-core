"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// var DbMysql = require("./DbMysql.server");
var DbTableExec = require("./DbTableExec");

module.exports = class DbTable {
  constructor(def, DbMysql) {
    this.DbMysql = DbMysql;
    this.def = def;
    this.connection = DbMysql.connection;
    this.modelname = this.def.modelname;
    this.primary = "";
    this.primaryType = "integer";
    this.primaryLength = 11;

    for (var [fieldName, field] of Object.entries(this.def.attributes)) {
      if (field.primary) {
        this.primary = fieldName;
        this.primaryType = field.type;
        if (field.length) this.primaryLength = field.length;
      }
    }
  }

  createEmpty() {
    var row = {};

    for (var [fieldName, field] of Object.entries(this.def.attributes)) {
      if (field.model) return; // console.log("field",field);

      row[fieldName] = ""; // console.log("field.type 7", field.type);
      // console.log("ici7");

      var typejs = this.DbMysql._ormTypeToDatabaseType(field.type, "", "typejs");

      if (typejs == "number") row[fieldName] = 0;
      if (typejs == "date") row[fieldName] = null;
      if (typejs == "boolean") row[fieldName] = false;
      if (field.defaultsTo) row[fieldName] = field.defaultsTo;
    }

    return row;
  }

  use(connectionId) {
    var exec = new DbTableExec(this);
    return exec;
  }

  select(fields) {
    var exec = new DbTableExec(this); // console.log("exec.select", exec.select);

    return exec.select(fields);
  }

  find(where, whereData) {
    var exec = new DbTableExec(this);
    return exec.find(where, whereData);
  }

  count(where, whereData) {
    var exec = new DbTableExec(this);
    return exec.count(where, whereData);
  }

  findone(where, whereData) {
    var exec = new DbTableExec(this);
    return exec.findone(where, whereData);
  }

  create(data) {
    var exec = new DbTableExec(this);
    return exec.create(data);
  }

  update(where, whereData, data) {
    var exec = new DbTableExec(this);
    return exec.update(where, whereData, data);
  }

  updateone(where, whereData, data) {
    var exec = new DbTableExec(this);
    return exec.updateone(where, whereData, data);
  }

  cloneDeep(what) {
    return JSON.parse(JSON.stringify(what));
  }

  replace(where, whereData, data, returnCompleteRow) {
    var _this = this;

    return _asyncToGenerator(function* () {
      var where2 = _this.cloneDeep(where);

      var whereData2 = _this.cloneDeep(whereData);

      var _rowold = yield _this.findone(where, whereData).exec();

      if (!_rowold) {
        var idTemp = yield _this.create(data).exec();

        if (returnCompleteRow) {
          var _row = yield _this.findone(idTemp).exec();

          return {
            row: _row,
            rowold: null
          };
        } else return {
          id: idTemp,
          rowold: null
        };
      } else {
        var rows = yield _this.update(where2, whereData2, data).exec(returnCompleteRow);
        if (returnCompleteRow && rows.length) return {
          row: rows[0],
          rowold: _rowold
        };
        return {
          id: _rowold[_this.primary],
          rowold: _rowold
        };
      }
    })();
  }

  destroy(where, whereData) {
    var exec = new DbTableExec(this);
    return exec.destroy(where, whereData);
  }

  query(query, data) {
    var exec = new DbTableExec(this);
    return exec.query(query, data);
  }

};
//# sourceMappingURL=DbTable.js.map