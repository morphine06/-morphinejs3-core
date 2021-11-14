"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Migration = exports.DbMysql = void 0;
exports.Model = Model;
exports.Models = void 0;
exports.loadModels = loadModels;

var _Config = require("./Config");

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var path = require("path");

var mysql = require("mysql2/promise");

var chalk = require("chalk");

var globule = require("globule");

var DbTable = require("./DbTable");

var DbMysql = new class {
  constructor() {
    this.models = {};
  }

  init(config) {
    var _this = this;

    return _asyncToGenerator(function* () {
      _this.config = config;
      var pool = mysql.createPool(_this.config.connection);
      _this.connection = {
        pool: pool,
        query: function () {
          var _query = _asyncToGenerator(function* (sql) {
            var sqlData = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
            var catchError = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
            var connection;

            try {
              connection = yield this.pool.getConnection();
            } catch (error) {
              console.warn("connection-error", error);
              return null;
            }

            try {
              var results = yield connection.query(sql, sqlData); // console.log("sql, sqlData", sql, sqlData); //, results

              connection.release();
              return results[0];
            } catch (error) {
              connection.release();
              if (catchError) throw error;
              console.warn(chalk.red("sql-error"), error, sql, sqlData);
              return null; // } finally {
              // 	connection.release(); // always put connection back in pool after last query
            }
          });

          function query(_x) {
            return _query.apply(this, arguments);
          }

          return query;
        }()
      };
    })();
  }

  constraints(model) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      var toLink = [];

      for (var [fieldName, field] of Object.entries(model.def.attributes)) {
        if (field.model) toLink.push({
          key: fieldName,
          val: field
        });
      } // console.log("toLink", toLink);


      if (toLink.length) {
        var q = "select * from information_schema.KEY_COLUMN_USAGE where TABLE_NAME='".concat(model.def.tableName, "' && TABLE_SCHEMA='").concat(_this2.config.connection.database, "'"); //COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_COLUMN_NAME, REFERENCED_TABLE_NAME

        var actualConstraints = yield _this2.connection.query(q);

        for (var iLink = 0; iLink < toLink.length; iLink++) {
          var link = toLink[iLink];
          var tocreate = true,
              todelete = false;

          for (var iActualConstraint = 0; iActualConstraint < actualConstraints.length; iActualConstraint++) {
            var actualConstraint = actualConstraints[iActualConstraint];
            var q2 = "select * from information_schema.referential_constraints where `CONSTRAINT_NAME` like '".concat(actualConstraint.CONSTRAINT_NAME, "'");
            var actualConstraintBis = (yield _this2.connection.query(q2))[0];

            if (!_this2.models[link.val.model]) {
              console.warn("Model not found : ".concat(link.val.model));
              continue;
            }

            if (actualConstraint.COLUMN_NAME == link.key && actualConstraint.REFERENCED_TABLE_NAME == _this2.models[link.val.model].def.tableName) {
              if (actualConstraintBis.UPDATE_RULE == link.val.onUpdate && actualConstraintBis.DELETE_RULE == link.val.onDelete) {
                tocreate = false;
              } else {
                todelete = actualConstraint.CONSTRAINT_NAME;
                tocreate = true;
              }
            }
          }

          if (todelete) {
            var _q = "ALTER TABLE `".concat(model.def.tableName, "` DROP FOREIGN KEY `").concat(todelete, "`");

            console.warn(_q);
            yield _this2.connection.query(_q);
          }

          if (tocreate && (link.val.onDelete || link.val.onUpdate)) {
            var _q2 = "ALTER TABLE `".concat(model.def.tableName, "` ADD CONSTRAINT `").concat(model.def.tableName, "_").concat(_this2.models[link.val.model].def.tableName, "_").concat(link.key, "_fk` FOREIGN KEY (`").concat(link.key, "`) REFERENCES `").concat(_this2.models[link.val.model].def.tableName, "`(`").concat(_this2.models[link.val.model].primary, "`)");

            if (link.val.onDelete) _q2 += " ON DELETE ".concat(link.val.onDelete);
            if (link.val.onUpdate) _q2 += " ON UPDATE ".concat(link.val.onUpdate);
            console.warn(_q2);
            yield _this2.connection.query(_q2);
          }
        }
      }
    })();
  }

  createTable(def) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      var what = [];

      for (var [fieldName, field] of Object.entries(def.attributes)) {
        if (field.model) {
          var f = _this3._getJoinedModel(field);

          if (f) what.push(fieldName + " " + _this3._ormTypeToDatabaseType(f[0], f[1]) + _this3._getNotnull(field));
        } else {
          what.push(fieldName + " " + _this3._ormTypeToDatabaseType(field.type, field.length) + _this3._getNotnull(field) + _this3._getIndex(field) + _this3._getDefault(field, fieldName));
        }
      }

      var q = "CREATE TABLE IF NOT EXISTS " + def.tableName + " (" + what.join(", ") + ")";
      console.warn("q", q);
      yield _this3.connection.query(q);
    })();
  }

  updateTable(def) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      var describe = yield _this4.connection.query("DESCRIBE " + def.tableName + "");

      for (var [fieldName, field] of Object.entries(def.attributes)) {
        var type1 = null;

        if (field.model) {
          var f = _this4._getJoinedModel(field);

          if (f) {
            type1 = _this4._ormTypeToDatabaseType(f[0], f[1]);
            field.type = f[0];
            field.length = f[1];
          }
        } else {
          type1 = _this4._ormTypeToDatabaseType(field.type, field.length);
        }

        var type2 = null,
            def2 = null;
        var nullChanged = false;

        for (var iRow = 0; iRow < describe.length; iRow++) {
          var row = describe[iRow]; // console.log("row", row);

          if (row.Field == fieldName) {
            if (field.notnull === false && row.Null == "NO") nullChanged = true;
            if (field.notnull !== false && row.Null == "YES") nullChanged = true;
            type2 = row.Type;
            def2 = row.Default;
          }
        } // console.log("nullChanged", nullChanged, def.tableName, fieldName);
        // if (nullChanged)


        if (type2 === null) {
          if (field.model) {
            var _f = _this4._getJoinedModel(field);

            field.type = _f[0];
            field.length = _f[1];
          }

          var q = "ALTER TABLE " + def.tableName + " ADD " + fieldName + " " + _this4._ormTypeToDatabaseType(field.type, field.length) + _this4._getNotnull(field) + _this4._getIndex(field) + _this4._getDefault(field, fieldName);

          console.warn("q", q);
          yield _this4.connection.query(q);
        } else if (type1 && type2 && (type1.toLowerCase() != type2.toLowerCase() || def2 != field.defaultsTo && type1.toLowerCase() != "text")) {
          var _q3 = "ALTER TABLE " + def.tableName + " CHANGE " + fieldName + " " + fieldName + " " + _this4._ormTypeToDatabaseType(field.type, field.length) + _this4._getNotnull(field) + _this4._getDefault(field, fieldName);

          console.warn("q", _q3);
          yield _this4.connection.query(_q3);
        } else if (nullChanged && !field.model) {
          var _q4 = "ALTER TABLE " + def.tableName + " CHANGE " + fieldName + " " + fieldName + " " + _this4._ormTypeToDatabaseType(field.type, field.length) + _this4._getNotnull(field) + _this4._getIndex(field) + _this4._getDefault(field, fieldName);

          console.warn("q", _q4);
          yield _this4.connection.query(_q4);
        }
      }
    })();
  }

  synchronize(def) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      var exists = true;
      var rows1 = yield _this5.connection.query("SELECT * FROM " + def.tableName + " LIMIT 0,1");
      if (rows1 && _this5.config.migrate == "recreate") yield _this5.connection.query("DROP TABLE IF EXISTS " + def.tableName + "");
      if (rows1 === null || _this5.config.migrate == "recreate") exists = false;

      if (_this5.config.migrate == "alter") {
        if (!exists) yield _this5.createTable(def);else yield _this5.updateTable(def);
        var rows2 = yield _this5.connection.query("SHOW INDEX FROM " + def.tableName + "");

        for (var [fieldName, field] of Object.entries(def.attributes)) {
          var createIndex = false; //let createUnique = false;

          if (field.model || field.index) {
            createIndex = true;

            for (var iRows = 0; iRows < rows2.length; iRows++) {
              var row2 = rows2[iRows];
              if (row2.Column_name == fieldName) createIndex = false;
            }
          } // if (field.unique) {
          // 	createUnique = true;
          // 	for (let iRows = 0; iRows < rows2.length; iRows++) {
          // 		const row2 = rows2[iRows];
          // 		if (row2.Column_name == fieldName) createIndex = false;
          // 	}
          // }


          if (createIndex) {
            var q = "ALTER TABLE " + def.tableName + " ADD INDEX (" + fieldName + ")";
            console.warn("q", q);
            yield _this5.connection.query(q);
          } // if (createUnique) {
          // 	let q = "ALTER TABLE " + def.tableName + " ADD UNIQUE (" + fieldName + ")";
          // 	console.warn("q", q);
          // 	await this.connection.query(q);
          // }

        }
      }
    })();
  }

  _ormTypeToDatabaseType(ormtype, length, info) {
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
    var res = ""; // if (field.notnull || typeof field.notnull == "undefined") res = " NOT NULL";
    // else res = " NULL";

    if (field.notnull === false) res = " NULL";else res = " NOT NULL";
    return res;
  }

  _getDefault(field) {
    var fieldName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
    var defaultsTo = "";

    if (typeof field.defaultsTo !== "undefined") {
      defaultsTo = ' DEFAULT "' + field.defaultsTo + '"';
      if (field.type == "boolean" && (field.defaultsTo === true || field.defaultsTo === "true")) defaultsTo = " DEFAULT 1";
      if (field.type == "boolean" && (field.defaultsTo === false || field.defaultsTo === "false")) defaultsTo = " DEFAULT 0";

      if (field.type == "json") {
        try {
          if (typeof field.defaultsTo == "object") {
            defaultsTo = ' DEFAULT "' + JSON.stringify(field.defaultsTo).replace(/"/g, '\\"') + '"';
          } else {
            defaultsTo = ' DEFAULT "' + JSON.stringify(JSON.parse(field.defaultsTo)).replace(/"/g, '\\"') + '"';
          }
        } catch (error) {
          defaultsTo = "";
          console.warn(chalk.red("defaultsTo '".concat(fieldName, "' must be a valid Json object")));
        }
      }
    }

    return defaultsTo;
  }

  _getJoinedModel(field) {
    if (this.models[field.model]) {
      return [this.models[field.model].primaryType, this.models[field.model].primaryLength];
    } else {
      console.warn("Model " + field.model + " not found");
    }

    return null;
  }

  getModels() {
    return this.models;
  }

}();
exports.DbMysql = DbMysql;

function Model() {
  var models = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  if (models instanceof Array) {} else models = [models];

  return function decorator(target) {
    if (!target.prototype._models) target.prototype._models = [];
    target.prototype._models = [...target.prototype._models, ...models];
  };
}

function loadModels() {
  return _loadModels.apply(this, arguments);
}

function _loadModels() {
  _loadModels = _asyncToGenerator(function* () {
    // let d = new Date();
    var where = "/src";
    if (_Config.Config.app.mode == "production") where = "/lib";
    var files = globule.find(process.cwd() + where + "/**/*.model.js");
    console.warn(chalk.yellow("@Info - Models availables :")); // console.log("d1b = ", new Date() - d);
    // d = new Date();

    for (var iFile = 0; iFile < files.length; iFile++) {
      var file = files[iFile];
      file = file.substring(0, file.length - 3);

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
      };
      def.modelname = path.basename(file);
      def.modelname = def.modelname.substring(0, def.modelname.length - 6);
      def.debug = DbMysql.config.debug; // global[def.modelname] =

      def.tableName = def.modelname;
      DbMysql.models[def.modelname] = new DbTable(def, DbMysql);
      console.warn("- ".concat(def.modelname));
    }

    if (_Config.Config.mysql.migrate == "alter") {
      // console.log("d2b = ", new Date() - d);
      // d = new Date();
      for (var model of Object.values(DbMysql.models)) {
        yield DbMysql.synchronize(model.def);
      } // console.log("d3b = ", new Date() - d);
      // d = new Date();


      for (var _model of Object.values(DbMysql.models)) {
        yield DbMysql.constraints(_model);
      } // console.log("d4b = ", new Date() - d);
      // d = new Date();

    }
  });
  return _loadModels.apply(this, arguments);
}

var Migration = new class {
  dropTable(tableName) {}

  dropField(tableName, fieldName) {}

  renameField(model, oldField, newField) {}

  exec() {}

}();
exports.Migration = Migration;
var Models = DbMysql.models;
exports.Models = Models;
//# sourceMappingURL=DbMysql.js.map