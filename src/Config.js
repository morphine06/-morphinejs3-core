import fs from "fs";
import JSON5 from "json5";

const rootDir = process.cwd();

let Config = {};
function readConfig() {
	let f = fs.readFileSync(rootDir + "/morphinejs.config.jsonc");
	Config = JSON5.parse(f);
	Config.package = JSON5.parse(fs.readFileSync(rootDir + "/package.json"));

	try {
		let f2 = fs.readFileSync(rootDir + "/others.config.jsonc");
		let Config2 = JSON5.parse(f2);
		mergeDeep(Config, Config2);
	} catch (error) {}
}
readConfig();

function isObject(item) {
	return item && typeof item === "object" && !Array.isArray(item);
}

function mergeDeep(target, ...sources) {
	if (!sources.length) return target;
	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} });
				mergeDeep(target[key], source[key]);
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}

	return mergeDeep(target, ...sources);
}

export { Config };
