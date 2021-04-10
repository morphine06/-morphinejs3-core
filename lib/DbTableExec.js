"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// var DbMysql = require("./DbMysql.server");
var _ = require("lodash");

var dayjs = require("dayjs"); // console.log("DbMysql", DbMysql);


module.exports = class DbTableExec {
  constructor(table) {
    this.DbMysql = table.DbMysql;
    this.table = table;
    this.def = table.def;
    this.modelname = this.def.modelname;
    this.selected = [];
    this.command = "SELECT";
    this.connection = table.connection;
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
    this.iscount = false;
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
    this.data = data;
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
    var f = null;

    for (var [fieldName, field] of Object.entries(this.DbMysql.models[fromModelName].def.attributes)) {
      if (fieldName == fieldJoin && field.model) f = field;
    }

    return f;
  }

  log() {
    this.logQuery = true;
    return this;
  }

  catchError() {
    this.catchErr = true;
    return this;
  }

  populate(fieldJoin, fieldJoinName) {
    // console.log("this.table", this.table);
    var tabFieldsJoins = fieldJoin.split(".");
    var previousModelName = this.modelname;
    var previousModelAlias = "t1";
    var tabOrigin = [];
    tabFieldsJoins.forEach(join => {
      tabOrigin.push(join);

      var modeltolink = this._searchModelFromFieldName(join, previousModelName); // console.log("modeltolink", modeltolink);


      var modelalias = "t1";

      if (modeltolink) {
        if (!this.tabAlreadyIncluded[modeltolink.model + "__" + tabOrigin.join("_")]) {
          modelalias = "t" + (this.joinModels.length + 1);
          this.joinModels.push({
            modelname: modeltolink.model,
            modelalias: modelalias,
            fieldJoin: join,
            modelnameto: previousModelName,
            modelaliasto: previousModelAlias,
            origin: tabOrigin.join("."),
            fieldJoinName: fieldJoinName || modeltolink.alias || null
          });
          this.tabAlreadyIncluded[modeltolink.model + "__" + tabOrigin.join("_")] = modelalias;
        } else {
          modelalias = this.tabAlreadyIncluded[modeltolink.model + "__" + tabOrigin.join("_")];
        }
      }

      previousModelName = modeltolink.model;
      previousModelAlias = modelalias;
    });
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
    var where = "";

    if (!this.where) {
      where = "1=1";
    } else if (Number.isInteger(this.where)) {
      where += this.primary + "=?";
      this.whereData.push(this.where);
    } else if (typeof this.where === "string") {
      var isKey = true;
      if (this.where.indexOf(" ") !== -1) isKey = false;
      if (this.where.indexOf(">") !== -1) isKey = false;
      if (this.where.indexOf("<") !== -1) isKey = false;
      if (this.where.indexOf("=") !== -1) isKey = false;

      if (isKey) {
        where += this.primary + "=?";
        this.whereData.push(this.where);
      } else {
        where = this.where;

        if (fromUpdate) {
          this.whereData = this.whereData.concat(this.original_whereData);
        }
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

    _.each(this.joinModels, (model, num) => {
      for (var [fieldName] of Object.entries(this.DbMysql.models[model.modelname].def.attributes)) {
        var as = "";
        if (model.modelnameto) as = " AS " + model.modelalias + "_" + model.fieldJoin + "_" + fieldName;
        tabSelect.push(model.modelalias + "." + fieldName + as);
      }
    }); // console.log("tabSelect", tabSelect);


    if (this.selected.length) tabSelect = this.selected;
    return tabSelect.join(", ");
  }

  _createJoin() {
    var tabJoin = [];

    _.each(this.joinModels, (model, num) => {
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
      query = "SELECT count(t1." + this.primary + ") as cmpt FROM " + this._createJoin() + " WHERE " + this._createWhere() + this._createOrder(); // console.log("query", query);
    } // console.log("query", query);


    return query;
  }

  _createInsertQuery() {
    var fields = [],
        vals = []; // _.each(this.data, (val, key) => {
    // 	if (this.def.attributes[key]) {
    // 		fields.push(key);
    // 		vals.push("?");
    // 		this.whereData.push(val);
    // 	}
    // });

    for (var [key, val] of Object.entries(this.def.attributes)) {
      if (val.primary && val.autoincrement) return;
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

    var query = "INSERT INTO " + this.def.tableName + "(" + fields.join(", ") + ") VALUES (" + vals.join(", ") + ")"; // console.log("query", query, this.data);

    return query;
  }

  _createUpdateQuery() {
    var vals = [];

    _.each(this.data, (val, key) => {
      if (this.def.attributes[key]) {
        vals.push(key + "=?");
        this.whereData.push(val);
      }
    }); // this.original_where, this.original_whereData


    var query = "UPDATE " + this.def.tableName + " SET " + vals.join(", ") + " WHERE " + this._createWhere(true);

    return query;
  }

  _createDestroyQuery() {
    var query = "DELETE FROM " + this.def.tableName + " WHERE " + this._createWhere();

    return query;
  }

  _preTreatment() {
    // console.log("this.data",this.data);
    for (var [fieldName, field] of Object.entries(this.def.attributes)) {
      // console.log("fieldName,field.type",fieldName,field.type);
      if (this.data[fieldName] === undefined) return;
      var key = fieldName;
      var val = this.data[key];

      if (field.type == "json" && _.isObject(val)) {
        try {
          this.data[key] = JSON.stringify(this.data[key]);
        } catch (e) {
          console.warn("json stringify error", e);
          this.data[key] = "";
        }
      }

      if (field.type == "json" && !_.isObject(val)) {
        try {
          this.data[key] = JSON.parse(this.data[key]); // console.log("this.data[key]",this.data[key]);
        } catch (e) {// console.log("json stringify error",e);
        }

        try {
          this.data[key] = JSON.stringify(this.data[key]); // console.log("this.data[key]",this.data[key]);
        } catch (e) {
          console.warn("json stringify error", e);
          this.data[key] = "";
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
      } // if (field.type == "datetime") {
      // 	if (_.isDate(this.data[fieldName])) this.data[fieldName] = moment(this.data[fieldName]).format("YYYY-MM-DD HH:mm:ss");
      // }
      // if (field.type == "date") {
      // 	if (_.isDate(this.data[fieldName])) this.data[fieldName] = moment(this.data[fieldName]).format("YYYY-MM-DD");
      // }

    }
  }

  _postTreatment(rows) {
    // if (this.iscount) console.log("rows", rows);
    _.each(rows, row => {
      for (var [fieldName, field] of Object.entries(this.def.attributes)) {
        if (field.type == "json") {
          try {
            if (row[fieldName]) row[fieldName] = JSON.parse(row[fieldName]);else row[fieldName] = null;
          } catch (e) {
            console.warn("json parse error - fieldName:\"".concat(fieldName, "\" - value:\"").concat(row[fieldName], "\""));
            row[fieldName] = null;
          }
        }

        if (field.type == "boolean") {
          if (row[fieldName] === true || row[fieldName] === "true" || row[fieldName] === 1 || row[fieldName] === "1") row[fieldName] = true;else row[fieldName] = false;
        }
      } // let alreadyOrigins = [];


      _.each(this.joinModels, (model, num) => {
        if (model.modelnameto) {
          // this._setObjectToRow(row, row, model.modelname, model.modelnameto, model.fieldJoin) ;
          var obj = {};

          for (var [_fieldName, _field] of Object.entries(this.DbMysql.models[model.modelname].def.attributes)) {
            // let f = DbMysql.models[model.modelname].def.tableName+'_'+model.fieldJoin+'_'+fieldName ;
            var f = model.modelalias + "_" + model.fieldJoin + "_" + _fieldName;

            if (row.hasOwnProperty(f)) {
              if (_field.type == "json") {
                try {
                  if (row[f]) row[f] = JSON.parse(row[f]);else row[f] = null;
                } catch (e) {
                  console.warn("json parse error", e, f, row[f]);
                  row[f] = null;
                }
              }

              obj[_fieldName] = row[f];
              delete row[f];
            }
          } // console.log("model.fieldJoinName", model.fieldJoinName);


          if (model.fieldJoinName) {
            row[model.fieldJoinName] = obj;
          } else {
            if (!obj[this.DbMysql.models[model.modelname].primary]) {
              // console.log("M_Db.models[model.modelname].primary",M_Db.models[model.modelname].primary, obj);
              obj = null;
            }

            var tabFieldsJoins = model.origin.split(".");
            var previousObj = row;
            var lastO = null;

            _.each(tabFieldsJoins, (o, index) => {
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
  } // async aexec(returnCompleteRow) {
  // 	return new Promise((resolve, reject) => {
  // 		this.exec(data => {
  // 			resolve(data);
  // 		}, returnCompleteRow);
  // 	});
  // }


  exec(cb, returnCompleteRow) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      if (_.isBoolean(cb) || cb === undefined) {
        returnCompleteRow = cb;
        cb = null;
      } // console.log("cb", cb);
      // console.log("this.command,this.data",this.command,this.data);


      _this2._beforeQuery(); // console.log("after");


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

      var data = _this2.postTreatmentMain(rows, returnCompleteRow);

      return data; // }
    })();
  }

  postTreatmentMain(rows, returnCompleteRow, cb) {
    // if (returnCompleteRow) console.log("postTreatmentMain", rows);
    var res; // console.log("rows", rows);

    if (!rows) {
      // console.log('query',query);
      // console.log('whereData',this.whereData);
      // console.warn("err", rows);
      res = {};

      switch (this.command) {
        case "QUERY":
          res = [];
          break;

        case "UPDATE":
          res = 0;
          if (returnCompleteRow) res = {};
          break;

        case "DELETE":
          res = 0;
          break;

        case "INSERT":
          this.data[this.primary] = rows.insertId; // res = this.data ;

          res = "";
          if (returnCompleteRow) res = {};
          break;

        default:
          res = {};
          break;
      }

      return res;
    }

    switch (this.command) {
      case "QUERY":
        res = rows;
        break;

      case "UPDATE":
        res = rows.affectedRows; // console.log("rows",rows);

        break;

      case "DELETE":
        res = rows.affectedRows;
        break;

      case "INSERT":
        // this.data[this.primary] = rows.insertId;
        // res = this.data ;
        res = rows.insertId;
        if (res) this.data[this.primary] = rows.insertId;
        break;

      default:
        if (this.iscount) res = rows[0].cmpt;else {
          this._postTreatment(rows);

          if (this.onlyOne) {
            if (rows.length) res = rows[0];else res = null;
          } else res = rows;
        }
    } // console.log("res",res);


    if (this.def.debug) console.warn("res", res); // console.log('The solution is: ', rows);

    if (returnCompleteRow && (this.command == "UPDATE" || this.command == "INSERT")) {
      // console.log("this.command",this.command);
      if (this.command == "UPDATE") {
        this.table.find(this.original_where, this.original_whereData).exec(rows2 => {
          // if (errsql) console.warn("errsql", errsql);
          if (this.onlyOne) return rows2[0];
          return rows2;
        });
      } else {
        var ftemp = {};
        ftemp[this.primary] = res;

        if (!res) {
          // console.log("res", res, this.primary, this.data);
          ftemp[this.primary] = this.data[this.primary];
        }

        this.table.findone(ftemp).exec(rows2 => {
          // if (errsql) console.warn("errsql", errsql);
          return rows2;
        });
      }
    } else return res;
  }

};
//# sourceMappingURL=DbTableExec.js.map