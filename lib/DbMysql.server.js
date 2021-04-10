"use strict"; // var _ = require("lodash");
// var async = require("async");
// var fs = require("fs-extra");

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var path = require("path");

var mysql = require("mysql2/promise"); // var request = require("request");


var globule = require("globule");

var DbTable = require("./DbTable.server");

var DbMysql = new class {
  init(config) {
    var _this = this;

    return _asyncToGenerator(function* () {
      _this.config = config; // console.log("this.config",this.config);
      // this.config.mysql.connection.debug = true ;
      // this.connection = mysql.createConnection(this.config.connection);
      // this.connection.connect();

      var pool = mysql.createPool(_this.config.connection);
      _this.connection = {
        pool: pool,
        query: function () {
          var _query = _asyncToGenerator(function* (sql) {
            var sqlData = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
            var connection;

            try {
              connection = yield this.pool.getConnection();

              try {
                var results = yield connection.query(sql, sqlData);
                connection.release(); // always put connection back in pool after last query

                return results[0];
              } catch (error) {
                console.warn("sql-error", error, sql, sqlData);
                return null;
              }
            } catch (error) {
              console.warn("connection-error", error);
            }
          });

          function query(_x) {
            return _query.apply(this, arguments);
          }

          return query;
        }()
      }; // await this.connection.query("CREATE DATABASE IF NOT EXISTS " + this.config.connection.database);

      var files = globule.find(process.cwd() + "/api/**/*.model.js");
      _this.models = {};
      files.forEach( /*#__PURE__*/function () {
        var _ref = _asyncToGenerator(function* (file) {
          file = file.substring(0, file.length - 3); // console.log("file", file);

          var def = require(file);

          if (def.useUpdatedAt === undefined) def.useUpdatedAt = true;
          if (def.useCreatedAt === undefined) def.useCreatedAt = true;
          if (def.useCreatedAt) def.attributes["createdAt"] = {
            type: "datetime",
            index: true
          };
          if (def.useUpdatedAt) def.attributes["updatedAt"] = {
            type: "datetime",
            index: true
          }; // if (!def.tableName) def.tableName = file.toLowerCase();

          def.modelname = path.basename(file);
          def.modelname = def.modelname.substring(0, def.modelname.length - 6); // console.log("def.modelname", def.modelname);

          def.debug = _this.config.debug;
          global[def.modelname] = _this.models[def.modelname] = new DbTable(def, _this);
        });

        return function (_x2) {
          return _ref.apply(this, arguments);
        };
      }());
      files.forEach( /*#__PURE__*/function () {
        var _ref2 = _asyncToGenerator(function* (file) {
          file = file.substring(0, file.length - 3);
          var modelname = path.basename(file);
          modelname = modelname.substring(0, modelname.length - 6);
          yield _this.synchronize(_this.models[modelname].def);
        });

        return function (_x3) {
          return _ref2.apply(this, arguments);
        };
      }());
    })();
  }

  createTable(def) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      var what = [];

      for (var [fieldName, field] of Object.entries(def.attributes)) {
        // console.log("field, fieldName", field, fieldName);
        if (field.model) {
          var f = _this2._getJoinedModel(field);

          if (f) what.push(fieldName + " " + _this2._ormTypeToDatabaseType(f[0], f[1]));
        } else {
          what.push(fieldName + " " + _this2._ormTypeToDatabaseType(field.type, field.length) + _this2._getNotnull(field) + _this2._getIndex(field) + _this2._getDefault(field));
        }
      }

      var q = "CREATE TABLE IF NOT EXISTS " + def.tableName + " (" + what.join(", ") + ")";
      console.warn("q", q);
      yield _this2.connection.query(q);
    })();
  }

  updateTable(def) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      var describe = yield _this3.connection.query("DESCRIBE " + def.tableName + ""); // console.log("describe", describe);

      for (var [fieldName, field] of Object.entries(def.attributes)) {
        var type1 = null;

        if (field.model) {
          var _f = _this3._getJoinedModel(field);

          if (_f) {
            type1 = _this3._ormTypeToDatabaseType(_f[0], _f[1]);
            field.type = _f[0];
            field.length = _f[1];
          }
        } else {
          type1 = _this3._ormTypeToDatabaseType(field.type, field.length);
        }

        var type2 = null,
            def2 = null;

        for (var iRow = 0; iRow < describe.length; iRow++) {
          var row = describe[iRow];

          if (row.Field == fieldName) {
            type2 = row.Type;
            def2 = row.Default;
          }
        } // console.log("type2", type2);


        if (type2 === null) {
          if (field.model) {
            var f = _this3._getJoinedModel(field);

            field.type = f[0];
            field.length = f[1];
          }

          var q = "ALTER TABLE " + def.tableName + " ADD " + fieldName + " " + _this3._ormTypeToDatabaseType(field.type, field.length) + _this3._getNotnull(field) + _this3._getIndex(field) + _this3._getDefault(field);

          console.warn("q", q);
          yield _this3.connection.query(q);
        } else if (type1 && type2 && (type1.toLowerCase() != type2.toLowerCase() || def2 != field.defaultsTo && type1.toLowerCase() != "text")) {
          var _q = "ALTER TABLE " + def.tableName + " CHANGE " + fieldName + " " + fieldName + " " + _this3._ormTypeToDatabaseType(field.type, field.length) + _this3._getNotnull(field) + _this3._getDefault(field);

          console.warn("q", _q);
          yield _this3.connection.query(_q);
        }
      }
    })();
  }

  synchronize(def) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      // console.log("model", model);
      // let def = model.def;
      var exists = true;
      var rows1 = yield _this4.connection.query("SELECT * FROM " + def.tableName + " LIMIT 0,1");
      if (rows1 && _this4.config.migrate == "recreate") yield _this4.connection.query("DROP TABLE IF EXISTS " + def.tableName + "");
      if (rows1 === null || _this4.config.migrate == "recreate") exists = false; // console.log("this.config.migrate", this.config.migrate);

      if (_this4.config.migrate == "alter") {
        if (!exists) yield _this4.createTable(def);else yield _this4.updateTable(def);
        var rows2 = yield _this4.connection.query("SHOW INDEX FROM " + def.tableName + "");

        for (var [fieldName, field] of Object.entries(def.attributes)) {
          var createIndex = false;

          if (field.model || field.index) {
            createIndex = true;

            for (var iRows = 0; iRows < rows2.length; iRows++) {
              var row2 = rows2[iRows];
              if (row2.Column_name == fieldName) createIndex = false; // console.log("row2.Column_name, fieldName", row2.Column_name, fieldName);
            }
          }

          if (createIndex) {
            var q = "ALTER TABLE " + def.tableName + " ADD INDEX (" + fieldName + ")";
            console.warn("q", q);
            yield _this4.connection.query(q);
          }
        }
      }
    })();
  }

  _ormTypeToDatabaseType(ormtype, length, info) {
    // console.log("ormtype,length", ormtype, length);
    if (!info) info = "type";
    var typeJS = "";
    ormtype = ormtype.toLowerCase();
    var res = "";

    if (ormtype == "int" || ormtype == "integer") {
      if (!length) length = 11;
      res = "INT(" + length + ")";
      typeJS = "number";
    } else if (ormtype == "tinyint") {
      if (!length) length = 4;
      res = "TINYINT(" + length + ")";
      typeJS = "number";
    } else if (ormtype == "smallint") {
      if (!length) length = 6;
      res = "SMALLINT(" + length + ")";
      typeJS = "number";
    } else if (ormtype == "mediumint") {
      if (!length) length = 9;
      res = "MEDIUMINT(" + length + ")";
      typeJS = "number";
    } else if (ormtype == "year") {
      if (!length) length = 4;
      res = "YEAR(" + length + ")";
      typeJS = "number";
    } else if (ormtype == "float") {
      res = "FLOAT";
      if (length) res += "(" + length + ")";
      typeJS = "number";
    } else if (ormtype == "double") {
      res = "DOUBLE";
      typeJS = "number"; // } else if (ormtype=='timestamp') {
      //     res = 'TIMESTAMP' ;
    } else if (ormtype == "date") {
      res = "DATE";
      typeJS = "date";
    } else if (ormtype == "datetime") {
      res = "DATETIME";
      typeJS = "date";
    } else if (ormtype == "char") {
      if (!length) length = 1;
      res = "CHAR(" + length + ")";
      typeJS = "string";
    } else if (ormtype == "varchar" || ormtype == "string") {
      if (!length) length = 255;
      res = "VARCHAR(" + length + ")";
      typeJS = "string";
    } else if (ormtype == "tinytext") {
      res = "TINYTEXT";
      typeJS = "string";
    } else if (ormtype == "mediumtext") {
      res = "MEDIUMTEXT";
      typeJS = "string";
    } else if (ormtype == "longtext") {
      res = "LONGTEXT";
      typeJS = "string";
    } else if (ormtype == "text" || ormtype == "json") {
      res = "TEXT";
      typeJS = "string";
    } else if (ormtype == "enum") {
      res = "ENUM";
      typeJS = "string";
    } else if (ormtype == "set") {
      res = "SET";
      typeJS = "string";
    } else if (ormtype == "decimal" || ormtype == "price") {
      if (!length) length = "10,2";
      res = "DECIMAL(" + length + ")";
      typeJS = "number";
    } else if (ormtype == "bigint") {
      if (!length) length = 20;
      res = "BIGINT(" + length + ")";
      typeJS = "number";
    } else if (ormtype == "time") {
      res = "TIME";
      typeJS = "number";
    } else if (ormtype == "tinyblob") {
      res = "TINYBLOB";
      typeJS = "string";
    } else if (ormtype == "mediumblob") {
      res = "MEDIUMBLOB";
      typeJS = "string";
    } else if (ormtype == "longblob") {
      res = "LONGBLOB";
      typeJS = "string";
    } else if (ormtype == "blob") {
      res = "BLOB";
      typeJS = "string";
    } else if (ormtype == "binary") {
      res = "BINARY";
      typeJS = "binary";
    } else if (ormtype == "varbinary") {
      res = "VARBINARY";
      typeJS = "binary";
    } else if (ormtype == "bit") {
      res = "BIT";
      typeJS = "boolean";
    } else if (ormtype == "boolean") {
      res = "TINYINT(4)";
      typeJS = "boolean";
    }

    if (info == "typejs") return typeJS;else return res;
  }

  _getIndex(field) {
    var res = "";
    if (field.primary) res += " PRIMARY KEY";
    if (field.autoincrement) res += " AUTO_INCREMENT";
    return res;
  }

  _getNotnull(field) {
    var res = "";
    if (field.notnull || typeof field.notnull == "undefined") res = " NOT NULL";else res = " NULL";
    return res;
  }

  _getDefault(field) {
    var defaultsTo = "";

    if (typeof field.defaultsTo !== "undefined") {
      defaultsTo = ' DEFAULT "' + field.defaultsTo + '"';
      if (field.type == "boolean" && (field.defaultsTo === true || field.defaultsTo === "true")) defaultsTo = " DEFAULT 1";
      if (field.type == "boolean" && (field.defaultsTo === false || field.defaultsTo === "false")) defaultsTo = " DEFAULT 0";
    }

    return defaultsTo;
  }

  _getJoinedModel(field) {
    // console.log("field",field);
    if (this.models[field.model]) {
      return [this.models[field.model].primaryType, this.models[field.model].primaryLength];
    } else {
      console.warn("Model " + field.model + " not found");
    }

    return null;
  }

}();
module.exports = DbMysql;