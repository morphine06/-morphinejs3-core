import globule from "globule";
import path from "path";
import chalk from "chalk";
import { Config } from "./Config";

const Services = {};

async function loadServices() {
	function getAllFuncs(toCheck) {
		var props = [];
		var obj = toCheck;
		let excludes = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];
		do {
			let p = Object.getOwnPropertyNames(obj);
			p = p.filter((prop) => {
				return prop.indexOf("__") !== 0 && excludes.indexOf(prop) < 0;
			});
			props = props.concat(p);
		} while ((obj = Object.getPrototypeOf(obj)));

		// props =  props.sort().filter(function (e, i, arr) {
		// 	if (e != arr[i + 1] && typeof toCheck[e] == "function") return true;
		// });
		props = props.map((el) => {
			return el + "()";
		});
		return props;
	}

	console.warn(chalk.yellow(`@Info - Services availables :`));
	let where = "/src";
	if (Config.app.mode == "production") where = "/lib";
	let serviceFiles = globule.find(process.cwd() + where + "/**/*.service.js");
	for (let iService = 0; iService < serviceFiles.length; iService++) {
		const serviceFile = serviceFiles[iService];
		let serviceName = path.basename(serviceFile);
		serviceName = serviceName.substring(0, serviceName.length - 11);
		let obj = await import(serviceFile);
		Object.entries(obj).forEach(([name, constructorFn], index) => {
			Services[serviceName] = new constructorFn();
			console.warn(`- ${name} : ${getAllFuncs(Services[serviceName]).join(", ")}`);
		});
	}
}

export { Services, loadServices };
