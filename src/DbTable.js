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
		for (const [fieldName, field] of Object.entries(this.def.attributes)) {
			if (field.primary) {
				this.primary = fieldName;
				this.primaryType = field.type;
				if (field.length) this.primaryLength = field.length;
			}
		}
	}
	createEmpty() {
		var row = {};
		for (const [fieldName, field] of Object.entries(this.def.attributes)) {
			if (field.model) return;
			row[fieldName] = "";
			let typejs = this.DbMysql._ormTypeToDatabaseType(field.type, "", "typejs");
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
		var exec = new DbTableExec(this);
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
	async replace(where, whereData, data, returnCompleteRow) {
		let where2 = this.cloneDeep(where);
		let whereData2 = this.cloneDeep(whereData);
		let _rowold = await this.findone(where, whereData).exec();
		if (!_rowold) {
			let idTemp = await this.create(data).exec();
			if (returnCompleteRow) {
				let _row = await this.findone(idTemp).exec();
				return { row: _row, rowold: null };
			} else return { id: idTemp, rowold: null };
		} else {
			let rows = await this.update(where2, whereData2, data).exec(returnCompleteRow);
			if (returnCompleteRow && rows.length) return { row: rows[0], rowold: _rowold };
			return { id: _rowold[this.primary], rowold: _rowold };
		}
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
