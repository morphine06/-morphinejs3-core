// import { App } from "./App";
import { Services } from "./Services";

// async function applyController(url, original, args) {
// 	try {
// 		let d = new Date();
// 		await original.apply(this, args);
// 		let diff = dayjs().diff(d);
// 		if (diff > 1000) diff = diff / 1000 + "s";
// 		else diff += "ms";
// 		// eslint-disable-next-line
// 		console.log(dayjs().format("YYYY-MM-DD HH:mm:ss") + " - GET " + url + " - " + diff);
// 	} catch (e) {
// 		console.warn(`Error in controller : ${e.stack}\nNot restarted.`);
// 		args[1].send({ error: `Error in controller` });
// 		// throw e;
// 	}
// }
function transformController(url, original) {
	return async function (...args) {
		// await applyController.apply(this, [url, original, args]);
		// console.log("Services.Middlewares", Services);
		try {
			if (!this._timer) this._timer = new Date();
			await original.apply(this, args);
		} catch (e) {
			// console.warn("e", e);
			if (Services.Middlewares.catchControllerErrors) {
				Services.Middlewares.catchControllerErrors(args[0], args[1], e);
			} else {
				console.warn(`Error in controller : ${e.stack}\nNot restarted.`);
				args[1].send({ error: `Error in controller` });
			}
			// throw e;
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
			// console.log("target._routes", target._routes);
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
			url: url + ":id",
			fn: transformController(url + ":id", target.prototype.findone),
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
			url: url + ":id",
			fn: transformController(url + ":id", target.prototype.update),
			name: "update",
			controllerName,
		});
		target.prototype._routes.push({
			method: "delete",
			url: url + ":id",
			fn: transformController(url + ":id", target.prototype.destroy),
			name: "destroy",
			controllerName,
		});

		// console.log("target.prototype._routes", target.prototype._routes);

		// meth(url, "get")(target, name, descriptor);
		// meth(url + "/:id", "get")(target, name, descriptor);
		// meth(url, "post")(target, name, descriptor);
		// meth(url + "/:id", "put")(target, name, descriptor);
		// meth(url + "/:id", "delete")(target, name, descriptor);
		return descriptor;
	};
}

export { Get, Post, Put, Delete, Crud };
