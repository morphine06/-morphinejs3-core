var _ = require("lodash");
var dayjs = require("dayjs");

module.exports = class DbTableExec {
	constructor(table) {
		this.DbMysql = table.DbMysql;
		this.table = table;
		this.def = table.def;
		this.modelname = this.def.modelname;
		this.selected = [];
		this.command = "SELECT";
		this.connection = table.connection;
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
		this.iscount = false;
		this.joinModels = [{ modelname: this.modelname, fieldJoin: null, modelnameto: null, modelalias: "t1" }];
		for (const [fieldName, field] of Object.entries(this.def.attributes)) {
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
		if (whereData === undefined) this.whereData = [];
		else this.whereData = whereData;
		return this;
	}
	count(where, whereData) {
		this.iscount = true;
		return this.find(where, whereData);
	}
	findone(where, whereData) {
		this.onlyOne = true;
		this.where = where;
		if (whereData === undefined) this.whereData = [];
		else this.whereData = whereData;
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
		// console.log("where,data", where, data);
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
	destroy(where, whereData = []) {
		this.whereData = whereData;
		this.onlyOne = false;
		this.command = "DELETE";
		this.where = where;
		return this;
	}
	_searchModelFromFieldName(fieldJoin, fromModelName) {
		var f = null;
		for (const [fieldName, field] of Object.entries(this.DbMysql.models[fromModelName].def.attributes)) {
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
	returnRow(returnCompleteRow) {
		this.returnCompleteRow = returnCompleteRow;
		return this;
	}
	populate(fieldJoin, fieldJoinName) {
		// console.log("this.table", this.table);
		let tabFieldsJoins = fieldJoin.split(".");
		let previousModelName = this.modelname;
		let previousModelAlias = "t1";
		let tabOrigin = [];
		tabFieldsJoins.forEach((join) => {
			tabOrigin.push(join);
			let modeltolink = this._searchModelFromFieldName(join, previousModelName);
			// console.log("modeltolink", modeltolink);
			let modelalias = "t1";
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
						fieldJoinName: fieldJoinName || modeltolink.alias || null,
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
		let where = "";
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
			Object.entries(this.where).forEach(([key, val], index) => {
				where += " && " + key + "=?";
				this.whereData.push(val);
			});
		}

		return where;
	}
	_createSelect() {
		var tabSelect = [];
		this.joinModels.forEach((model, num) => {
			for (const [fieldName] of Object.entries(this.DbMysql.models[model.modelname].def.attributes)) {
				let as = "";
				if (model.modelnameto) as = " AS " + model.modelalias + "_" + model.fieldJoin + "_" + fieldName;
				tabSelect.push(model.modelalias + "." + fieldName + as);
			}
		});
		if (this.selected.length) tabSelect = this.selected;
		return tabSelect.join(", ");
	}
	_createJoin() {
		let tabJoin = [];
		this.joinModels.forEach((model, num) => {
			if (!model.modelnameto) tabJoin.push(this.DbMysql.models[model.modelname].def.tableName + " " + model.modelalias);
			else
				tabJoin.push(
					"LEFT JOIN " +
						this.DbMysql.models[model.modelname].def.tableName +
						" " +
						model.modelalias +
						" ON " +
						model.modelalias +
						"." +
						this.DbMysql.models[model.modelname].primary +
						"=" +
						model.modelaliasto +
						"." +
						model.fieldJoin
				);
		});
		return tabJoin.join(" ");
	}
	_createOrder() {
		let order = "";
		if (this.order) order = " ORDER BY " + this.order;
		return order;
	}
	_createSelectQuery() {
		let query = "SELECT " + this._createSelect() + " FROM " + this._createJoin() + " WHERE " + this._createWhere() + this._createOrder();
		if (this.iscount) {
			query =
				"SELECT count(t1." + this.primary + ") as cmpt FROM " + this._createJoin() + " WHERE " + this._createWhere() + this._createOrder();
		}
		return query;
	}
	_createInsertQuery() {
		let fields = [],
			vals = [];
		for (const [key, val] of Object.entries(this.def.attributes)) {
			if (val.primary && val.autoincrement) continue;
			fields.push(key);
			vals.push("?");
			if (this.data.hasOwnProperty(key)) {
				this.whereData.push(this.data[key]);
			} else {
				if (val.defaultsTo) this.whereData.push(val.defaultsTo);
				else {
					if (
						val.type == "int" ||
						val.type == "integer" ||
						val.type == "tinyint" ||
						val.type == "smallint" ||
						val.type == "mediumint" ||
						val.type == "year" ||
						val.type == "float" ||
						val.type == "double" ||
						val.type == "boolean"
					)
						this.whereData.push(0);
					else this.whereData.push("");
				}
			}
		}
		let query = "INSERT INTO " + this.def.tableName + "(" + fields.join(", ") + ") VALUES (" + vals.join(", ") + ")";
		return query;
	}
	_createUpdateQuery() {
		let vals = [];
		for (const [key, val] of Object.entries(this.data)) {
			if (this.def.attributes[key]) {
				vals.push(key + "=?");
				this.whereData.push(val);
			}
		}
		let query = "UPDATE " + this.def.tableName + " SET " + vals.join(", ") + " WHERE " + this._createWhere(true);
		return query;
	}
	_createDestroyQuery() {
		let query = "DELETE FROM " + this.def.tableName + " WHERE " + this._createWhere();
		return query;
	}
	_preTreatment() {
		for (const [fieldName, field] of Object.entries(this.def.attributes)) {
			// console.log("fieldName,field.type",fieldName,field.type);
			if (this.data[fieldName] === undefined) return;
			let key = fieldName;
			let val = this.data[key];
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
					this.data[key] = JSON.parse(this.data[key]);
				} catch (e) {}
				try {
					this.data[key] = JSON.stringify(this.data[key]);
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
				let m = dayjs(new Date(this.data[fieldName]));
				if (this.data[fieldName] == "0000-00-00" || this.data[fieldName] == "" || !m.isValid()) this.data[fieldName] = "0000-00-00";
				else this.data[fieldName] = m.format("YYYY-MM-DD");
			}
			if (field.type == "datetime" && this.data[fieldName]) {
				let m = dayjs(new Date(this.data[fieldName]));
				if (
					this.data[fieldName] == "0000-00-00" ||
					this.data[fieldName] == "0000-00-00 00:00:00" ||
					this.data[fieldName] == "" ||
					!m.isValid()
				)
					this.data[fieldName] = "0000-00-00 00:00:00";
				else this.data[fieldName] = m.format("YYYY-MM-DD HH:mm:ss");
			}
		}
	}
	_postTreatment(rows) {
		rows.forEach((row) => {
			for (const [fieldName, field] of Object.entries(this.def.attributes)) {
				if (field.type == "json") {
					try {
						if (row[fieldName]) row[fieldName] = JSON.parse(row[fieldName]);
						else row[fieldName] = null;
					} catch (e) {
						console.warn(`json parse error - fieldName:"${fieldName}" - value:"${row[fieldName]}"`);
						row[fieldName] = null;
					}
				}
				if (field.type == "boolean") {
					if (row[fieldName] === true || row[fieldName] === "true" || row[fieldName] === 1 || row[fieldName] === "1") row[fieldName] = true;
					else row[fieldName] = false;
				}
			}
			this.joinModels.forEach((model, num) => {
				if (model.modelnameto) {
					let obj = {};

					for (const [fieldName, field] of Object.entries(this.DbMysql.models[model.modelname].def.attributes)) {
						// let f = DbMysql.models[model.modelname].def.tableName+'_'+model.fieldJoin+'_'+fieldName ;
						let f = model.modelalias + "_" + model.fieldJoin + "_" + fieldName;
						if (row.hasOwnProperty(f)) {
							if (field.type == "json") {
								try {
									if (row[f]) row[f] = JSON.parse(row[f]);
									else row[f] = null;
								} catch (e) {
									console.warn("json parse error", e, f, row[f]);
									row[f] = null;
								}
							}
							obj[fieldName] = row[f];
							delete row[f];
						}
					}
					if (model.fieldJoinName) {
						row[model.fieldJoinName] = obj;
					} else {
						if (!obj[this.DbMysql.models[model.modelname].primary]) {
							obj = null;
						}
						let tabFieldsJoins = model.origin.split(".");
						let previousObj = row;
						let lastO = null;
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
	async _beforeQuery() {
		let fn = null,
			fn2 = null;
		switch (this.command) {
			case "UPDATE":
				// if (this.def.useUpdatedAt && !this.data.updatedAt) this.data.updatedAt = new Date();
				if (this.def.useUpdatedAt) this.data.updatedAt = new Date();
				if (this.data.updatedAtForced) this.data.updatedAt = this.data.updatedAtForced;
				if (this.def.beforeUpdate) fn = this.def.beforeUpdate;
				break;
			case "DELETE":
				if (this.def.beforeDestroy) fn2 = this.def.beforeDestroy;
				break;
			case "INSERT":
				// if (this.def.useCreatedAt && !this.data.createdAt) this.data.createdAt = new Date();
				// if (this.def.useUpdatedAt && !this.data.updatedAt) this.data.updatedAt = new Date();
				if (this.def.useCreatedAt) this.data.createdAt = new Date();
				if (this.def.useUpdatedAt) this.data.updatedAt = new Date();
				if (this.data.createdAtForced) this.data.createdAt = this.data.createdAtForced;
				if (this.data.updatedAtForced) this.data.updatedAt = this.data.updatedAtForced;
				if (this.def.beforeCreate) fn = this.def.beforeCreate;
				break;
			// case 'REPLACE':
			// if (this.def.beforeCreate) fn = this.def.beforeCreate ;
			// break;
			default:
				if (this.def.beforeSelect) fn = this.def.beforeSelect;
		}
		if (fn) await fn(this.data);
		else if (fn2) await fn();
	}
	async exec(returnCompleteRow = true) {
		if (!this.returnCompleteRow) returnCompleteRow = false;
		this._beforeQuery();
		let query;
		switch (this.command) {
			case "QUERY":
				query = this.querySaved;
				break;
			case "INSERT":
				this._preTreatment();
				query = this._createInsertQuery();
				break;
			case "UPDATE":
				this._preTreatment();
				query = this._createUpdateQuery();
				break;
			case "DELETE":
				query = this._createDestroyQuery();
				break;
			default:
				query = this._createSelectQuery();
		}

		if (this.def.debug || this.logQuery) console.warn("query", query, this.whereData);
		let rows;
		try {
			rows = await this.connection.query(query, this.whereData, this.catchErr);
		} catch (error) {
			throw error;
		}
		let data = await this.postTreatmentMain(rows, returnCompleteRow);
		return data;
		// }
	}
	async postTreatmentMain(rows, returnCompleteRow) {
		let res;
		if (!rows) {
			res = {};
			switch (this.command) {
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
		switch (this.command) {
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
				if (res) this.data[this.primary] = rows.insertId;
				break;
			default:
				if (this.iscount) res = rows[0].cmpt;
				else {
					this._postTreatment(rows);
					if (this.onlyOne) {
						if (rows.length) res = rows[0];
						else res = null;
					} else res = rows;
				}
		}
		if (this.def.debug) console.warn("res", res);
		if (returnCompleteRow && (this.command == "UPDATE" || this.command == "INSERT")) {
			if (this.command == "UPDATE") {
				let rows2 = await this.table.find(this.original_where, this.original_whereData).exec();
				if (this.onlyOne) return rows2[0];
				return rows2;
			} else {
				let ftemp = {};
				ftemp[this.primary] = res;
				if (!res) {
					ftemp[this.primary] = this.data[this.primary];
				}
				let rows2 = await this.table.findone(ftemp).exec();
				return rows2;
			}
		} else return res;
	}
};
