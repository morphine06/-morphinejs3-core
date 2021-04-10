import globule from "globule";
import dayjs from "dayjs";

import { App } from "./App";
import { Services } from "./Services";
// import { DbMysql, Model, Models } from "./DbMysql";
import { Middlewares } from "./Middlewares";
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
		this._routes.forEach((route) => {
			// eslint-disable-next-line
			console.log(`${route.method.toUpperCase()} ${route.url} > ${route.controllerName} > ${route.name}`);
		});
	}
	_addRoutes() {
		// console.log("this._routes", this._routes);
		this._routes.forEach((route) => {
			// console.log("this", this, route);
			// console.log("this._middlewares", this._middlewares, Middlewares);
			App[route.method](route.url, (req, res, next) => {
				let timer = new Date();
				req.on("end", (...args) => {
					// console.log("onend args", args);
					let diff = dayjs().diff(timer);
					if (diff > 1000) diff = diff / 1000 + "s";
					else diff += "ms";
					// eslint-disable-next-line
					console.log(dayjs().format("YYYY-MM-DD HH:mm:ss") + " - GET " + route.url + " - " + diff);
				});
				next();
			});
			if (this._middlewares) {
				this._middlewares.forEach((middlewareName) => {
					let mid = Middlewares.find((m) => {
						return m.name == middlewareName;
					});
					if (mid) App[route.method](route.url, mid.fn.bind(this));
				});
			}
			App[route.method](route.url, route.fn.bind(this));
		});
		this.describeRoutes();
	}

	async find(req, res) {
		// if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
		// console.log("find this.model", this.model);
		if (!this.model) return res.sendData("model_not_defined");
		let { rows, total } = await this._find(req);
		res.sendData({ data: rows, meta: { total: total } });
	}
	async findone(req, res) {
		// if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
		if (!this.model) return res.sendData(res, "model_not_defined");
		let row = await this._findone(req);
		if (!row) return res.sendData("not_found");
		res.sendData({ data: row });
	}
	async create(req, res) {
		// if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
		if (!this.model) return res.sendData("model_not_defined");
		let row = await this._create(req);
		res.sendData({ data: row });
	}
	async update(req, res) {
		// if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
		if (!this.model) return res.sendData("model_not_defined");
		let row = await this._update(req);
		if (!row) return res.sendData("not_found");
		res.sendData({ data: row });
	}
	async destroy(req, res) {
		// if (req.dontSanitize !== true) Services.simpleSanitizeReq(req);
		if (!this.model) return res.sendData({ err: Services.err(501), data: null });
		let oldrow = await this._destroy(req);
		res.sendData({ data: oldrow });
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
		let model = this.model;
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

		Object.entries(model.def.attributes).forEach(([field, defField], index) => {
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
		let model = this.model;

		let { where, whereData } = await this.findCreateWhere(req);
		// console.log("where,whereData", where, whereData);
		let limit = await this.findCreateLimit(req);
		let orderby = await this.findCreateOrderBy(req);
		let toexec = model.find(where + orderby + limit, whereData);
		// console.log("where + orderby + limit, whereData", where + orderby + limit, whereData);
		// if (this.populateOnFind) {
		if (this.populateOnFind) {
			Object.entries(model.def.attributes).forEach(([field, defField], index) => {
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
			let toexec = model.count(where + orderby, whereData);
			if (this.populateOnFind) {
				Object.entries(model.def.attributes).forEach(([field, defField], index) => {
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
		let model = this.model;
		let primary = this._getPrimary(model);
		let row = model.createEmpty();
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
		let model = this.model;
		let where = "",
			whereData = [],
			primary = this._getPrimary(model),
			row,
			id = req.params.id || req.params[primary];

		if (id * 1 < 0) {
			// console.log("createempty");
			row = await this.createEmpty(req);
		} else {
			where += "t1." + primary + "=?";
			whereData.push(id);
			let toexec = model.findone(where, whereData);
			Object.entries(model.def.attributes).forEach(([field, defField], index) => {
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
		let model = this.model,
			log = this.modellogevents,
			primary = this._getPrimary(model),
			newrow;
		// console.log("req.body", req.body);

		this._checkPopulateSended(req);
		// console.log("req.body2 :", req.body);
		newrow = await model.create(req.body).exec(true);
		// console.log("newrow :", newrow);
		// console.log("newrow", newrow);
		req.params.id = newrow[primary];
		if (log) await this._log(req, "create", null, newrow);
		return await this._findone(req);
	}

	_checkPopulateSended(req) {
		let model = this.model;
		Object.entries(model.def.attributes).forEach(([field, defField], index) => {
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
		let model = this.model,
			primary = this._getPrimary(model),
			id = req.params.id || req.params[primary],
			where = "" + primary + "=?",
			whereData = [id],
			log = this.modellogevents,
			oldrow,
			newrow;
		if (log) {
			oldrow = await model.findone(where, whereData).exec();
			if (!oldrow) return null;
		}
		delete req.body[primary];

		this._checkPopulateSended(req);

		let row = await model.update(where, whereData, req.body).exec(log);
		if (!row) return null;
		if (row.length) newrow = row[0];
		if (log) await this._log(req, "update", oldrow, newrow);

		return await this._findone(req);
	}

	async _destroy(req, updateDeleteField = false) {
		//Services.simpleSanitizeReq(req);
		let model = this.model,
			where = "",
			whereData = [],
			primary = this._getPrimary(model),
			oldrow,
			log = this.modellogevents,
			id = req.params.id || req.params[primary];
		where = primary + "=?";
		whereData = id;

		oldrow = await model.findone(where, whereData).exec();
		if (!oldrow) return null;
		if (log) await this._log(req, "destroy", oldrow, null);

		if (updateDeleteField === false) {
			await model.destroy(where, whereData).exec();
		} else {
			let d = {};
			d[updateDeleteField] = true;
			await model.update(where, whereData, d).exec();
		}
		return oldrow;
	}
	async _log(req, modelEvent, oldrow, newrow) {
		let model = this.model,
			primary = this._getPrimary(model),
			id = req.params.id || req.params[primary];
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
}

async function loadControllers() {
	let controllerFiles = globule.find(process.cwd() + "/src/**/*.controller.js");
	for (let i = 0; i < controllerFiles.length; i++) {
		const controllerFile = controllerFiles[i];
		let obj = await import(controllerFile);
		Object.entries(obj).forEach(([name, constructorFn], index) => {
			let c = new constructorFn();
			c._addRoutes();
		});
	}
	// last route is not found
	// App.use(async (req, res, next) => {
	// 	if (Services.Middlewares.notFound) {
	// 		await Services.Middlewares.notFound(req, res, next);
	// 	} else {
	// 		if (req.accepts("html")) return res.status(404).render("404", { Config, cache: Config.app.mode != "development" });
	// 		if (req.accepts("json")) return res.status(404).json({ error: "Not found" });
	// 		res.status(404).type("txt").send("Not found");
	// 	}
	// });
}

export { Controller, Crud, loadControllers };
