import globule from "globule";
import path from "path";

const Services = {};

// function Service(services = []) {
// 	if (services instanceof Array) {
// 	} else services = [services];

// 	return function decorator(target, name, descriptor) {
// 		// console.log("target", target, name, descriptor);
// 		if (name) {
// 			if (!target._services) target._services = [];
// 			target._services = [...target._services, ...services];
// 		} else {
// 			if (!target.prototype._services) target.prototype._services = [];
// 			target.prototype._services = [...target.prototype._services, ...services];
// 		}
// 	};
// }

async function loadServices() {
	let serviceFiles = globule.find(process.cwd() + "/src/**/*.service.js");
	for (let iService = 0; iService < serviceFiles.length; iService++) {
		const serviceFile = serviceFiles[iService];
		let serviceName = path.basename(serviceFile);
		serviceName = serviceName.substring(0, serviceName.length - 11);
		// global[serviceName] = require(serviceFile);
		let obj = await import(serviceFile);
		Object.entries(obj).forEach(([name, constructorFn], index) => {
			// console.log("serviceName", serviceName);
			Services[serviceName] = new constructorFn();
		});
	}
	// console.log("Services2", Services);
}

export { Services, loadServices }; //Service,
