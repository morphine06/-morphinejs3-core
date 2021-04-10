const fs = require("fs");
const express = require("express");
const app = express();
const helmet = require("helmet");
// const http = require("http");
// const https = require("https");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const compression = require("compression");
// const moment = require("moment");
// const fs = require("fs-extra");
// const session = require("express-session");
const logger = require("morgan");
// const uuid = require("uuid/v4");
const path = require("path");
// const async = require("async");
const globule = require("globule");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const robots = require("express-robots-txt");
const JSON5 = require("json5");

const DbMysql = require("./libs/DbMysql.server");
const BaseController = require("./libs/BaseController.server");

global.moment = require("moment");
global._ = require("lodash");
// var mustacheExpress = require("mustache-express");
const consolidate = require("consolidate");

// global.Services = require("./libs/Services");
// global.I18n = require("./libs/I18n");

// const config = require("./config/local");
// const others = require("./config/others");
// _.merge(others, config);

// require("dotenv").config();
// const config = process.env;
let rootDir = process.cwd();
let config = fs.readFileSync(rootDir + "/.morphinejs.jsonc");
config = JSON5.parse(config);

let packagejson = fs.readFileSync(rootDir + "/package.json");
packagejson = JSON5.parse(packagejson);

// console.log("config", config);

// console.log("process.cwd(), __dirname", process.cwd(), __dirname);
// global.morphinejs = {
// 	config,
// 	rootDir: process.cwd(),
// };

// global.EmailSender = require("./libs/EmailSender");
let MorphineJs = class {
	async start() {
		// console.log("morphinejs.config", morphinejs.config);
		await DbMysql.init(config.database.mysql);

		// require("./config/bootstrap")();

		app.engine("mustache", consolidate.mustache);
		app.set("view engine", "mustache");
		app.set("views", rootDir + "/views");

		app.options("*", cors(config.corsOptions));
		app.use(cors(config.corsOptions));

		app.use(bodyParser.urlencoded({ extended: true }, { limit: "50mb" }));
		app.use(bodyParser.json({ limit: "50mb" }));
		app.use(express.json());
		app.use(express.urlencoded({ extended: true }));
		app.use(cookieParser());
		app.use(express.static(path.join(rootDir, "public")));
		app.use(compression());
		app.use(helmet());
		app.use(robots({ UserAgent: "*", Disallow: "/" }));
		app.use(fileUpload({ abortOnLimit: true, responseOnLimit: "File size limit has been reached" })); // safeFileNames:true
		if (config.app.mode != "development") app.use(logger("dev"));

		let serviceFiles = globule.find(process.cwd() + "/api/**/*.service.js");
		_.each(serviceFiles, (serviceFile) => {
			let serviceName = path.basename(serviceFile);
			serviceName = serviceName.substring(0, serviceName.length - 11);
			global[serviceName] = require(serviceFile);
		});

		app.get("/", (req, res) => {
			// console.log("config.app.mode", config.app.mode);
			res.render("home", { config, packagejson, cache: config.app.mode != "development" });
			// res.send(`<!doctype html>
			// <html lang="fr">
			// <head>
			//   <meta charset="utf-8">
			//   <title>Euros</title>
			//   <meta name="robots" content="noindex, nofollow">
			// </head>
			// <body>
			// Euros - Not permitted
			// </body>
			// </html>`);
		});

		// fs.readdirSync("controllers").forEach(function(file) {
		let files = globule.find(process.cwd() + "/api/**/*.controller.js");
		_.each(files, (file) => {
			const route = require(file);
			new route(app);
		});

		app.use(function (req, res, next) {
			if (req.accepts("html")) return res.status(404).render("404", { config, packagejson, cache: config.app.mode != "development" });
			if (req.accepts("json")) return res.status(404).json({ error: "Not found" });
			res.status(404).type("txt").send("Not found");
		});

		let http, https, serv;
		if (config.ssl && config.ssl.use) {
			serv = https = require("https").createServer({ key: config.ssl.privateKey, cert: config.ssl.certificate, ca: config.ssl.ca }, app);
		} else {
			serv = http = require("http").createServer(app);
		}
		const io = require("socket.io")(serv);
		global.socketIO = io;
		io.on("connection", function (socket) {
			// console.warn("a user connected");
			socket.on("disconnect", function () {});
			socket.on("join", function (co_id) {
				// console.log("join", co_id);
				socket.join("all", () => {});
				socket.join("room_" + co_id, () => {});
			});
			socket.on("unjoin", function (co_id) {
				// console.log("unjoin", co_id);
				socket.leave("all", () => {});
				socket.leave("room_" + co_id, () => {});
			});
		});

		if (config.ssl && config.ssl.use) {
			https.listen(config.ssl.port, () => {
				console.warn(`Listening on ${config.app.host} ! - ${config.app.mode}`);
			});
		} else {
			http.listen(config.app.port, () => {
				console.warn(`Listening on ${config.app.host} ! - ${config.app.mode}`);
			});
		}
	}
};
module.exports = {
	MorphineJs,
	BaseController,
	Config: config,
	RootDir: rootDir,
	PackageJson: packagejson,
};
