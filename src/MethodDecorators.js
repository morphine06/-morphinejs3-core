import chalk from "chalk";
import { Services } from "./Services";

function transformController(url, original) {
	return async function (...args) {
		try {
			if (!this._timer) this._timer = new Date();
			this.req = args[0];
			this.res = args[1];
			await original.apply(this, args);
		} catch (e) {
			if (Services.Middlewares && Services.Middlewares.catchControllerErrors) {
				Services.Middlewares.catchControllerErrors(args[0], args[1], e);
			} else {
				console.warn(chalk.red(`Error in controller : ${e}\nNot restarted.`));
				args[1].send({ error: `Error in controller` });
			}
		}
	};
}
function meth(url, method) {
	return function (target, name, descriptor) {
		if (name) {
			const original = descriptor.value;
			descriptor.value = transformController(url, original);
			if (!target._routes) target._routes = [];
			target._routes.push({ method, url, fn: descriptor.value, name, controllerName: target.constructor.name });
		}
		return descriptor;
	};
}

function Get(url) {
	return meth(url, "get");
}
function Post(url) {
	return meth(url, "post");
}
function Put(url) {
	return meth(url, "put");
}
function Delete(url) {
	return meth(url, "delete");
}
function Crud(url, model) {
	return function (target, name, descriptor) {
		if (name) return console.warn("Decorator Crud is only for class, not for properties function");
		target.prototype.model = model;
		let controllerName = target.prototype.constructor.name;
		if (!target.prototype._routes) target.prototype._routes = [];
		target.prototype._routes.push({
			method: "get",
			url: url,
			fn: transformController(url, target.prototype.find),
			name: "find",
			controllerName,
		});
		target.prototype._routes.push({
			method: "get",
			url: `${url}/exportcsv`,
			fn: transformController(url, target.prototype.exportcsv),
			name: "exportcsv",
			controllerName,
		});
		target.prototype._routes.push({
			method: "get",
			url: `${url}/:id`,
			fn: transformController(`${url}/:id`, target.prototype.findone),
			name: "findone",
			controllerName,
		});
		target.prototype._routes.push({
			method: "post",
			url: url,
			fn: transformController(url, target.prototype.create),
			name: "create",
			controllerName,
		});
		target.prototype._routes.push({
			method: "put",
			url: `${url}/:id`,
			fn: transformController(`${url}/:id`, target.prototype.update),
			name: "updateone",
			controllerName,
		});
		target.prototype._routes.push({
			method: "delete",
			url: `${url}/:id`,
			fn: transformController(`${url}/:id`, target.prototype.destroy),
			name: "destroy",
			controllerName,
		});

		return descriptor;
	};
}

export { Get, Post, Put, Delete, Crud };
