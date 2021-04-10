import http from "http";
// import path from "path";

import { App } from "./App";
import { Services, Service, loadServices } from "./Services";
// console.log("Services", Services);
import { Config } from "./Config";
import { Controller, loadControllers } from "./Controller";
import { Get, Post, Put, Delete, Crud } from "./MethodDecorators";
import { Middlewares, Middleware, loadMiddlewares } from "./Middlewares";

import { DbMysql, Model, Models, Migration } from "./DbMysql";
// const Models = DbMysql.models;

const rootDir = process.cwd();

const MorphineJs = class {
	constructor() {}

	async initDb() {
		await DbMysql.init(Config.mysql);
	}
	async executeMigration() {
		Migration.update();
	}
	async initExpress() {}
	async initMiddlewares() {}
	initResSendData() {
		App.use(function (req, res, next) {
			if (!Services.ErrorCodes) return next();
			res.sendData = function (errorKeyOrData, status = 200) {
				// console.log("this", this);
				let data;
				errorKeyOrData = errorKeyOrData || {};
				if (errorKeyOrData && typeof errorKeyOrData === "string") {
					data = { err: Services.ErrorCodes.getErrorCode(errorKeyOrData) };
					status = data.err.status;
				} else {
					data = errorKeyOrData;
					data.err = null;
				}
				res.status(status).send(data);
			};
			next();
		});
	}
	async notFound() {}

	async start() {
		await this.initDb();
		await this.executeMigration();
		await loadServices();
		await this.initExpress();
		await this.initMiddlewares();
		this.initResSendData();
		await loadMiddlewares();
		await loadControllers();
		await this.notFound();

		let server = http.createServer(App);
		await new Promise((accept, reject) => {
			server.listen(Config.app.port, () => {
				accept();
			});
		});
		console.warn(`Listening on ${Config.app.host} ! - ${Config.app.mode}`);
	}
};

export {
	rootDir,
	MorphineJs,
	Config,
	App,
	Controller,
	Crud,
	Get,
	Post,
	Put,
	Delete,
	DbMysql,
	Models,
	Model,
	Services,
	Service,
	Middleware,
	Middlewares,
	Migration,
};
