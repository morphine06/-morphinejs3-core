import globule from "globule";
import path from "path";

const Services = {};

async function loadServices() {
	let serviceFiles = globule.find(process.cwd() + "/src/**/*.service.js");
	for (let iService = 0; iService < serviceFiles.length; iService++) {
		const serviceFile = serviceFiles[iService];
		let serviceName = path.basename(serviceFile);
		serviceName = serviceName.substring(0, serviceName.length - 11);
		let obj = await import(serviceFile);
		Object.entries(obj).forEach(([name, constructorFn], index) => {
			Services[serviceName] = new constructorFn();
		});
	}
}

export { Services, loadServices };
