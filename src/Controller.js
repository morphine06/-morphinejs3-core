import globule from "globule";
import dayjs from "dayjs";
import chalk from "chalk";
import fs from "fs-extra";

import { App } from "./App";
import { Services } from "./Services";
import { Middlewares } from "./Middlewares";
import { Models } from "./DbMysql";
import { Config } from "./Config";

const createCsvWriter = require("csv-writer").createObjectCsvWriter; // pour  écrite des fichiers .csv
// function Crud(url) {
// 	return function decorator(target) {
// 		target.prototype.isCrud = url;
// 	};
// }

class Controller {
	constructor() {
		this.populateOnFind = true;
	}
	describeRoutes() {
		this._routes.forEach((route) => {
			console.warn(`- ${route.method.toUpperCase()} ${route.url} > ${route.controllerName} > ${route.name}()`);
		});
	}
	_addRoutes() {
		this._routes.forEach((route) => {
			App[route.method](route.url, (req, res, next) => {
				let timer = new Date();
				req.on("end", (...args) => {
					let diff = dayjs().diff(timer);
					if (diff > 1000) diff = diff / 1000 + "s";
					else diff += "ms";
					// eslint-disable-next-line
					console.warn(`${dayjs().format("YYYY-MM-DD HH:mm:ss")} - GET ${route.url} - ${diff}`);
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
		if (!this.model) return this.res.sendData("model_not_defined");
		let { rows, total } = await this.findExec();
		this.res.sendData({ data: rows, meta: { total: total } });
	}
	async exportcsv(req, res) {
		if (!this.model) return this.res.sendData("model_not_defined");
		let { rows } = await this.findExec(); //, total

		let header = [];
		Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
			let title = field;
			let t = field.split("_");
			if (t.length > 1) {
				t.shift();
				title = t.join("_");
			}
			// fields not exported
			if (
				title === "password" ||
				title === "accesstoken" ||
				title === "accesstokenexpire" ||
				title === "refreshtoken" ||
				title === "forgetpassdate"
			)
				return;
			header.push({ id: field, title });
		});

		let dest = process.cwd() + "/uploads/temp/";
		fs.ensureDirSync(dest);
		dest += "export-" + this.model.def.modelname + ".csv";
		const csvWriter = createCsvWriter({
			path: dest,
			header: header,
		});
		csvWriter
			.writeRecords(rows) // returns a promise
			.then(() => {
				//console.log("...Done");
				res.header("content-disposition", "attachment; filename=export-csv-" + this.model.def.modelname + ".csv");
				let readStream = fs.createReadStream(dest);
				readStream.pipe(res);
			});
		// this.res.sendData({ data: rows, meta: { total: total } });
	}
	async findone(req, res) {
		if (!this.model) return res.sendData(res, "model_not_defined");
		let row = await this.findoneExec(req);
		if (!row) return res.sendData("not_found");
		res.sendData({ data: row });
	}
	async create(req, res) {
		if (!this.model) return res.sendData("model_not_defined");
		let row = await this.createExec();
		if (!row) return res.sendData("insert_error");
		res.sendData({ data: row });
	}
	async update(req, res) {
		if (!this.model) return res.sendData("model_not_defined");
		let row = await this.updateExec();
		if (!row) return res.sendData("not_found");
		res.sendData({ data: row });
	}
	async destroy(req, res) {
		if (!this.model) return res.sendData({ err: Services.err(501), data: null });
		let oldrow = await this.destroyExec();
		if (!oldrow) return res.sendData("not_found");
		res.sendData({ data: oldrow });
	}

	async findCreateOrderBy(req) {
		let orderby = "";
		if (req.query.sort) {
			let orderSort = "";
			if (req.query.order_sort) orderSort = req.query.order_sort.replace(/\\/g, "");
			orderby = " order by " + req.query.sort.replace(/\\/g, "") + " " + orderSort;
		}
		return orderby;
	}
	debug() {
		this.debugQuery = true;
		return this;
	}
	async findCreateLimit(req) {
		let limit = 0,
			skip = 0;
		if (req.query.skip && req.query.skip != "NaN" && typeof (req.query.skip * 1) === "number") {
			skip = req.query.skip * 1;
		}
		if (req.query.limit && req.query.limit != "NaN" && typeof (req.query.limit * 1) === "number") {
			limit = req.query.limit * 1;
		}
		if (skip > 0 && limit === 0) limit = 1844674407370955161;
		return { limit, skip };
	}
	// remplacer _update et _create par updateexec()
	async findCreateWhere(req) {
		let where = "1=1",
			whereData = [];
		function findCreateWhereForField(tx, field, value) {
			if (value.indexOf("contains:") === 0) {
				where += ` && ${tx}.${field} like ?`;
				whereData.push("%" + value.substring(9) + "%");
			} else if (value.indexOf("startwith:") === 0) {
				where += ` && ${tx}.${field} like ?`;
				whereData.push(value.substring(10) + "%");
			} else if (value.indexOf("endwith:") === 0) {
				where += ` && ${tx}.${field} like ?`;
				whereData.push("%" + value.substring(8));
			} else if (value.indexOf(">=") === 0) {
				where += ` && ${tx}.${field} >= ?`;
				whereData.push(value.substring(2));
			} else if (value.indexOf(">") === 0) {
				where += ` && ${tx}.${field} > ?`;
				whereData.push(value.substring(1));
			} else if (value.indexOf("<=") === 0) {
				where += ` && ${tx}.${field} <= ?`;
				whereData.push(value.substring(2));
			} else if (value.indexOf("<") === 0) {
				where += ` && ${tx}.${field} < ?`;
				whereData.push(value.substring(1));
			} else {
				where += ` && ${tx}.${field} = ?`;
				whereData.push(req.query[field]);
			}
		}

		Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
			if (req.query[field]) findCreateWhereForField("t1", field, req.query[field] + "");
			if (req.query[field + "_"]) findCreateWhereForField("t1", field, req.query[field + "_"]);
			if (req.query[field + "__"]) findCreateWhereForField("t1", field, req.query[field + "__"]);
			if (req.query[field + "___"]) findCreateWhereForField("t1", field, req.query[field + "___"]);
		});
		return { where, whereData };
	}

	// async findWhere(fn) {
	// 	this._findWhere = fn;
	// }
	// async findLimit(fn) {
	// 	this._findLimit = fn;
	// }
	// async findOrderBy(fn) {
	// 	this._findOrderBy = fn;
	// }
	async findExec(what = {}) {
		let req = this.req;
		let { where, whereData } = await this.findCreateWhere(req);
		if (what.where) {
			let r = await what.where(where, whereData);
			where = r.where;
			whereData = r.whereData;
		}
		let { limit, skip } = await this.findCreateLimit(req);
		if (what.limit) {
			let r = await what.limit(limit, skip);
			limit = r.limit;
			skip = r.skip;
		}
		let limitreq = limit || skip ? ` limit ${skip},${limit}` : "";
		let orderby = await this.findCreateOrderBy(req);
		if (what.orderBy) orderby = await what.orderBy(orderby);
		// eslint-disable-next-line
		let toexec = this.model.find(where + orderby + limitreq, whereData);
		if (this.debugQuery) {
			console.warn("where + orderby + limitreq, whereData", where + orderby + limitreq, whereData);
			toexec.debug();
		}
		// if (this.populateOnFind) {
		// Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
		// 	if (defField.model) toexec.populate(defField.alias);
		// });
		// morePopulate.forEach((field) => {
		// 	toexec.populate(field);
		// });
		if (what.populate) {
			what.populate.forEach((field) => {
				toexec.populate(field);
			});
		} else toexec.populateAll();
		// }
		let rows = await toexec.exec();
		let total = rows.length;
		if (limit) {
			let toexec = this.model.count(where + orderby, whereData);
			if (this.populateOnFind) {
				Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
					if (defField.model) toexec.populate(field);
				});
			}
			total = await toexec.exec();
		}
		return { rows, total };
	}

	createEmpty(req) {
		let row = this.model.createEmpty();
		row[this.model.primary] = "";
		return row;
	}

	async findoneExec(what = {}) {
		let where = "",
			whereData = [],
			row,
			req = this.req,
			id = req.params.id || req.params[this.model.primary];

		if (id * 1 < 0) {
			row = this.createEmpty(req);
		} else {
			where += `t1.${this.model.primary}=?`;
			whereData.push(id);
			let toexec = this.model.findone(where, whereData);
			// Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
			// 	if (defField.model) toexec.populate(field);
			// });
			// morePopulate.forEach((field) => {
			// 	toexec.populate(field);
			// });
			row = await toexec.populateAll().exec();
		}
		return row;
	}

	_compareData(oldData, newData) {
		var compare = {};
		Object.entries(oldData).forEach(([keyoldval, oldval], index) => {
			if (keyoldval == "updatedAt") return;
			if (keyoldval == "createdAt") return;
			if (newData[keyoldval] == undefined) return;
			var newval = newData[keyoldval];
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

	async createExec() {
		let req = this.req;
		this._checkPopulateSended(req);
		let newrow = await this.model.create(req.body).exec(true);
		if (!newrow) return null;
		req.params.id = newrow[this.model.primary];
		// if (this.modellogevents) await this._log(req, "create", null, newrow);
		return await this.findoneExec(req);
	}

	_checkPopulateSended(req) {
		Object.entries(this.model.def.attributes).forEach(([field, defField], index) => {
			if (defField.model) {
				// if (req.body[field] && this.isObject(req.body[field])) {
				// 	let modelToJoin = global[defField.model];
				// 	if (modelToJoin.primary) req.body[field] = req.body[field][modelToJoin.primary];
				// }
				if (req.body[defField.alias] && this.isObject(req.body[defField.alias])) {
					let modelToJoin = Models[defField.model];
					if (modelToJoin.primary) req.body[field] = req.body[defField.alias][modelToJoin.primary];
				}
			}
		});
	}

	async updateExec() {
		let req = this.req,
			id = req.params.id || req.params[this.model.primary],
			where = `${this.model.primary}=?`,
			whereData = [id],
			oldrow;
		if (this.modellogevents) {
			oldrow = await this.model.findone(where, whereData).exec();
			if (!oldrow) return null;
		}
		delete req.body[this.model.primary];

		this._checkPopulateSended(req);
		let row = await this.model.updateone(where, whereData, req.body).exec();
		if (!row) return null;
		// if (row.length) newrow = row[0];
		// if (this.modellogevents) await this._log(req, "update", oldrow, newrow);

		return await this.findoneExec(req);
	}

	async destroyExec(updateDeleteField = false) {
		let where = "",
			whereData = [],
			oldrow,
			id = this.req.params.id || this.req.params[this.model.primary];
		where = `${this.model.primary}=?`;
		whereData = id;

		oldrow = await this.model.findone(where, whereData).exec();
		if (!oldrow) return null;
		// if (this.modellogevents) await this._log(req, "destroy", oldrow, null);

		if (updateDeleteField === false) {
			await this.model.destroy(where, whereData).exec();
		} else {
			let d = {};
			d[updateDeleteField] = true;
			await this.model.update(where, whereData, d).exec();
		}
		return oldrow;
	}
	// async _log(req, modelEvent, oldrow, newrow) {
	// 	let id = req.params.id || req.params[this.model.primary];
	// 	let c = "";
	// 	if (modelEvent == "create") c = newrow;
	// 	else if (modelEvent == "destroy") c = oldrow;
	// 	else if (modelEvent == "update") c = this._compareData(oldrow, newrow);
	// 	await Logs.create({
	// 		us_id_user: req.user ? req.user.us_id : 0,
	// 		lg_model_event: modelEvent,
	// 		lg_model_name: this.modelname,
	// 		lg_model_id: id,
	// 		lg_data: c,
	// 	}).exec();
	// }

	async before(req, res) {}
	async policy(req, res) {
		return true;
	}

	render(page, params) {
		this.res.render(page, params);
	}
}

async function loadControllers() {
	let where = "/src";
	if (Config.app.mode == "production") where = "/lib";
	let controllerFiles = globule.find(`${process.cwd()}${where}/**/*.controller.js`);
	console.warn(chalk.yellow(`@Info - Routes list :`));
	for (let i = 0; i < controllerFiles.length; i++) {
		const controllerFile = controllerFiles[i];
		let obj = await import(controllerFile);
		Object.entries(obj).forEach(([name, constructorFn], index) => {
			let c = new constructorFn();
			c._addRoutes();
		});
	}
}

export { Controller, loadControllers };
