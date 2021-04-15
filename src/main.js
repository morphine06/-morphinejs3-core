import { App } from "./App";
import { Services, Service, loadServices } from "./Services";
import { Config } from "./Config";
import { Controller, loadControllers } from "./Controller";
import { Get, Post, Put, Delete, Crud } from "./MethodDecorators";
import { Middlewares, Middleware, loadRoutesMiddlewares } from "./Middlewares";

import { DbMysql, Model, Models, Migration } from "./DbMysql";

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
	async initHttpServer() {}
	initResSendData() {
		return function (req, res, next) {
			if (!Services.ErrorCodes) return next();
			res.sendData = function (errorKeyOrData, status = 200) {
				let data;
				errorKeyOrData = errorKeyOrData || {};
				if (errorKeyOrData && typeof errorKeyOrData === "string") {
					data = { err: Services.ErrorCodes.getErrorCode(errorKeyOrData) };
					status = data.err.status;
				} else {
					data = errorKeyOrData;
					data.err = null;
					if (!data.meta) data.meta = {};
				}
				res.status(status).send(data);
			};
			next();
		};
	}
	async notFound() {}

	async start() {
		await this.initDb();
		await this.executeMigration();
		// await loadServices();
		await this.initExpress();
		await this.initMiddlewares();
		// this.initResSendData();
		this.httpserver = await this.initHttpServer();
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
	loadRoutesMiddlewares,
	loadControllers,
	loadServices,
};
