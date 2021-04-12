"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Get = Get;
exports.Post = Post;
exports.Put = Put;
exports.Delete = Delete;
exports.Crud = Crud;

var _Services = require("./Services");

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

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
  return /*#__PURE__*/_asyncToGenerator(function* () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    // await applyController.apply(this, [url, original, args]);
    // console.log("Services.Middlewares", Services);
    try {
      if (!this._timer) this._timer = new Date();
      yield original.apply(this, args);
    } catch (e) {
      // console.warn("e", e);
      if (_Services.Services.Middlewares.catchControllerErrors) {
        _Services.Services.Middlewares.catchControllerErrors(args[0], args[1], e);
      } else {
        console.warn("Error in controller : ".concat(e.stack, "\nNot restarted."));
        args[1].send({
          error: "Error in controller"
        });
      } // throw e;

    }
  });
}

function meth(url, method) {
  return function (target, name, descriptor) {
    if (name) {
      var original = descriptor.value;
      descriptor.value = transformController(url, original);
      if (!target._routes) target._routes = [];

      target._routes.push({
        method,
        url,
        fn: descriptor.value,
        name,
        controllerName: target.constructor.name
      }); // console.log("target._routes", target._routes);

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
    var controllerName = target.prototype.constructor.name;
    if (!target.prototype._routes) target.prototype._routes = [];

    target.prototype._routes.push({
      method: "get",
      url: url,
      fn: transformController(url, target.prototype.find),
      name: "find",
      controllerName
    });

    target.prototype._routes.push({
      method: "get",
      url: url + "/:id",
      fn: transformController(url + "/:id", target.prototype.findone),
      name: "findone",
      controllerName
    });

    target.prototype._routes.push({
      method: "post",
      url: url,
      fn: transformController(url, target.prototype.create),
      name: "create",
      controllerName
    });

    target.prototype._routes.push({
      method: "put",
      url: url + "/:id",
      fn: transformController(url + "/:id", target.prototype.update),
      name: "update",
      controllerName
    });

    target.prototype._routes.push({
      method: "delete",
      url: url + "/:id",
      fn: transformController(url + "/:id", target.prototype.destroy),
      name: "destroy",
      controllerName
    }); // console.log("target.prototype._routes", target.prototype._routes);
    // meth(url, "get")(target, name, descriptor);
    // meth(url + "/:id", "get")(target, name, descriptor);
    // meth(url, "post")(target, name, descriptor);
    // meth(url + "/:id", "put")(target, name, descriptor);
    // meth(url + "/:id", "delete")(target, name, descriptor);


    return descriptor;
  };
}
//# sourceMappingURL=MethodDecorators.js.map