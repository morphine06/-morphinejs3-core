"use strict";

// warning : reactiver
module.exports = class {
	constructor(app, baseurl, model, methods = ["find", "findone", "create", "update", "destroy"]) {
		//["find", "findone", "create", "update", "destroy"]
		if (!methods) methods = [];
		this.app = app;
		this.baseurl = baseurl;
		this.model = model;
		this.populateOnFind = true;
		if (methods.indexOf("find") >= 0) app.get(this.baseurl + "", Policies.checkAccessTocken, this.find.bind(this));
		if (methods.indexOf("findone") >= 0) app.get(this.baseurl + "/:id", Policies.checkAccessTocken, this.findone.bind(this));
		if (methods.indexOf("create") >= 0) app.post(this.baseurl + "", Policies.checkAccessTocken, this.create.bind(this));
		if (methods.indexOf("update") >= 0) app.put(this.baseurl + "/:id", Policies.checkAccessTocken, this.update.bind(this));
		if (methods.indexOf("destroy") >= 0) app.delete(this.baseurl + "/:id", Policies.checkAccessTocken, this.destroy.bind(this));
	}
	// send(res,errorKeyOrData) {
	// 	let status = 200,
	// 		data = { err: null, data: null };
	// 	errorKeyOrData = errorKeyOrData || {};
	// 	if (_.isString(errorKeyOrData)) {
	// 		data.err = this.getErrorCode(errorKeyOrData);
	// 		status = data.err.status;
	// 	} else {
	// 		data = errorKeyOrData;
	// 		data.err = null;
	// 	}
	// 	// console.log("err :", err);
	// 	res.status(status).send(data);
	// }
	async find(req, res) {
		// if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
		if (!this.model) return Services.send(res, "model_not_defined");
		let { rows, total } = await this._find(req);
		Services.send(res, { data: rows, meta: { total: total } });
	}
	async findone(req, res) {
		// if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
		if (!this.model) return Services.send(res, "model_not_defined");
		let row = await this._findone(req);
		if (!row) return Services.send(res, "not_found");
		Services.send(res, { data: row });
	}
	async create(req, res) {
		// if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
		if (!this.model) return Services.send(res, "model_not_defined");
		let row = await this._create(req);
		Services.send(res, { data: row });
	}
	async update(req, res) {
		// if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
		if (!this.model) return Services.send(res, "model_not_defined");
		let row = await this._update(req);
		if (!row) return Services.send(res, "not_found");
		Services.send(res, { data: row });
	}
	async destroy(req, res) {
		// if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
		if (!this.model) return this.send(res, { err: Services.err(501), data: null });
		let oldrow = await this._destroy(req);
		Services.send(res, { data: oldrow });
	}

	async findCreateOrderBy(req) {
		let orderby = "";
		// @Marina je corrige ici, car il faut rajouter le orderSort, uniquement s'il y a un req.query.sort
		if (req.query.sort) {
			let orderSort = "";
			if (req.query.order_sort) orderSort = req.query.order_sort.replace(/\\/g, "");
			orderby = " order by " + req.query.sort.replace(/\\/g, "") + " " + orderSort;
		}
		return orderby;
	}
	async findCreateLimit(req) {
		let limit = "",
			skip = 0;
		if (req.query.skip != undefined && req.query.skip != "NaN" && typeof (req.query.skip * 1) === "number") {
			skip = req.query.skip * 1;
		}
		if (req.query.limit != undefined && typeof (req.query.limit * 1) === "number") {
			// if (!req.query.skip || !_.isNumber(req.query.skip * 1)) req.query.skip = 0;
			limit = " limit " + skip + "," + req.query.limit * 1;
		}
		return limit;
	}
	async findCreateWhere(req) {
		let where = "1=1",
			whereData = [];
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

		Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
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
			if (req.query[field + "___"]) findCreateWhereForField("t1", field, req.query[field + "___"]);
			// }
		});
		// console.log("where,whereData", where, whereData);
		return { where, whereData };
	}

	async _find(req) {
		// let model = this.model;

		let { where, whereData } = await this.findCreateWhere(req);
		// console.log("where,whereData", where, whereData);
		let limit = await this.findCreateLimit(req);
		let orderby = await this.findCreateOrderBy(req);
		let toexec = this.model.find(where + orderby + limit, whereData);
		// console.log("where + orderby + limit, whereData", where + orderby + limit, whereData);
		// if (this.populateOnFind) {
		if (this.populateOnFind) {
			Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
				if (defField.model) toexec.populate(field);
			});
		}
		// }
		// let t0;
		// t0 = moment();
		let rows = await toexec.exec();
		// console.log("rows", rows);
		// console.log("diff1", t0.diff(moment()));
		// t0 = moment();
		let total = rows.length;
		if (limit) {
			// console.log("where,whereData", where, whereData);
			let toexec = this.model.count(where + orderby, whereData);
			if (this.populateOnFind) {
				Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
					if (defField.model) toexec.populate(field);
				});
			}
			total = await toexec.exec();
			// console.log("rows_temp", rows_temp);
			// total = rows_temp.length;
		}
		// console.log("diff2", t0.diff(moment()));
		return { rows, total };
	}

	async createEmpty(req) {
		//Services.simpleSanitizeReq(req);
		let primary = this._getPrimary(this.model);
		let row = this.model.createEmpty();
		row[primary] = "";
		return row;
	}
	_getPrimary(model) {
		let primary = null;
		Object.entries(model.def.attributes).forEach(([field, defField], index) => {
			if (defField.primary) primary = field;
		});
		return primary;
	}

	async _findone(req, morePopulate = []) {
		//Services.simpleSanitizeReq(req);
		// let model = this.model;
		let where = "",
			whereData = [],
			primary = this._getPrimary(this.model),
			row,
			id = req.params.id || req.params[primary];

		if (id * 1 < 0) {
			// console.log("createempty");
			row = await this.createEmpty(req);
		} else {
			where += "t1." + primary + "=?";
			whereData.push(id);
			let toexec = this.model.findone(where, whereData);
			Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
				if (defField.model) toexec.populate(field);
			});
			morePopulate.forEach((field) => {
				toexec.populate(field);
			});
			row = await toexec.exec();
		}
		return row;
	}

	_compareData(oldData, newData) {
		// console.log("oldData, newData", oldData, newData);
		var compare = {};
		Object.entries(oldData).forEach(([keyoldval, oldval], index) => {
			// console.log("keyoldval, typeof ok[keyoldval]", keyoldval, typeof ok[keyoldval]);
			// if (_.isArray(ok[keyoldval])) return ;
			// if (_.isPlainObject(ok[keyoldval])) return ;
			if (keyoldval == "updatedAt") return;
			if (keyoldval == "createdAt") return;
			if (newData[keyoldval] == undefined) return;
			var newval = newData[keyoldval];
			// console.log("oldval, newval", keyoldval, oldval, newval, typeof oldval, typeof newval);
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

	async _create(req) {
		//Services.simpleSanitizeReq(req);
		this._checkPopulateSended(req);
		let newrow = await this.model.create(req.body).exec(true);
		req.params.id = newrow[this._getPrimary(this.model)];
		if (this.modellogevents) await this._log(req, "create", null, newrow);
		return await this._findone(req);
	}

	_checkPopulateSended(req) {
		Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
			if (defField.model) {
				// console.log("defField.model :", defField.model);
				if (req.body[field] && this.isObject(req.body[field])) {
					let modelToJoin = global[defField.model];
					let primaryToJoin = this._getPrimary(modelToJoin);
					if (primaryToJoin) req.body[field] = req.body[field][primaryToJoin];
				}
			}
		});
	}

	async _update(req, cb) {
		//Services.simpleSanitizeReq(req);
		let primary = this._getPrimary(this.model),
			id = req.params.id || req.params[primary],
			where = "" + primary + "=?",
			whereData = [id],
			oldrow,
			newrow;
		if (this.modellogevents) {
			oldrow = await this.model.findone(where, whereData).exec();
			if (!oldrow) return null;
		}
		delete req.body[primary];

		this._checkPopulateSended(req);

		let row = await this.model.update(where, whereData, req.body).exec();
		if (!row) return null;
		if (row.length) newrow = row[0];
		if (this.modellogevents) await this._log(req, "update", oldrow, newrow);

		return await this._findone(req);
	}

	async _destroy(req, updateDeleteField = false) {
		//Services.simpleSanitizeReq(req);
		let where = "",
			whereData = [],
			oldrow,
			log = this.modellogevents,
			id = req.params.id || req.params[this._getPrimary(this.model)];
		where = this._getPrimary(this.model) + "=?";
		whereData = id;

		oldrow = await this.model.findone(where, whereData).exec();
		if (!oldrow) return null;
		if (log) await this._log(req, "destroy", oldrow, null);

		if (updateDeleteField === false) {
			await this.model.destroy(where, whereData).exec();
		} else {
			let d = {};
			d[updateDeleteField] = true;
			await this.model.update(where, whereData, d).exec();
		}
		return oldrow;
	}
	async _log(req, modelEvent, oldrow, newrow) {
		let id = req.params.id || req.params[this._getPrimary(this.model)];
		let c = "";
		if (modelEvent == "create") c = newrow;
		else if (modelEvent == "destroy") c = oldrow;
		else if (modelEvent == "update") c = this._compareData(oldrow, newrow);
		await Logs.create({
			us_id_user: req.user ? req.user.us_id : 0,
			lg_model_event: modelEvent,
			lg_model_name: this.modelname,
			lg_model_id: id,
			lg_data: c,
		}).exec();
	}

	async before(req, res) {}
	async policy(req, res) {
		return true;
	}
	// policies(req, res, next) {
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
	// send(res, data) {
	// 	Services.send(res, data);
	// }
};
