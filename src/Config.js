import fs from "fs";
import JSON5 from "json5";

const rootDir = process.cwd();

let Config = {};
function readConfig() {
	let f = fs.readFileSync(rootDir + "/morphinejs.config.jsonc");
	Config = JSON5.parse(f);
	Config.package = JSON5.parse(fs.readFileSync(rootDir + "/package.json"));
}
readConfig();
export { Config };
