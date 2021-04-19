# MorphineJS 3

# TODO

-   put and patch difference
-

# Philosophy

No informatic is not philosophy, but main principles of MorphineJS are :

-   anti-verbose micro-framework, 100K of code (10.000 lines of documentation)
-   produce **really** short code
-   use decorators with node >=8, thanks to [Babel](https://babeljs.io/)
-   10 main Objects or Decorators to learn, intuitive
-   no revolutionary concept (however decorators are not usual in javascript)
-   original ORM integrated (MySQL, MariaDB, PostGres, SQLite only) ; if you know sql you know this ORM
-   ORM without complex migration system... silently auto-migrate... never delete your data... never... follow my finger...
-   bootstrap minimum applications with CLI (API server, website, ACL... all together)
-   as fast as ExpressJs is (based on ExpressJS to take advantage of ExpresJS plugins)
-   use the simplest template engine : mustache
-   as secure as possible (helmet, cors)
-   write ES9, execute on ES5 nodejs server (thanks to Babel)
-   one page documentation

# Get started

If you use Microsoft VSCode, install "ESLint", "Prettier" and "Mustache" plugins

```bash
npm i -g @morphinejs3/cli
morphinejs3 new my-project
cd my-project
npm run dev
```

Now visit [http://localhost:5100](http://localhost:5100)

# Preview : Exported objects by morphinejs

When you `import * from 'morphinejs'` you can access only to this objects or decorators :

```js
export { MorphineJs, Config, App, Controller, Crud, Get, Post, Put, Delete, DbMysql, Model, Service, Middleware };
```

| Syntax                     | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| rootDir                    | The root directory of your application                                       |
| Config                     | Edit /morphinejs.config.jsonc (json with comments)                           |
| Controller                 | Extends this class to herit base class controller                            |
| Services                   | All objects or classes exported in /src/\*_/_.service.js                     |
| @Middleware                | Decorator to use a middleware (function executed before controller handler)  |
| @Crud                      | Magic decorator to create CRUD requests on a controller ; link a MySQL table |
| @Get, @Post, @Put, @Delete | Decorators to declare your controller routes                                 |
| @Model                     | Decorator to use a model                                                     |
| @Service                   | Decorator to use a service (sometime named helper or provider)               |
| DbMysql                    | Use directly database without ORM                                            |
| App                        | The ExpressJS app instance                                                   |
| MorphineJs                 | used in main.js to bootstrap application                                     |
| res.sendData()             | New function to simplify JSON response with errors                           |

That's all folks !

# Controllers

## Overview

```js
import { Get, Controller, Config } from "morphinejs3";

@Service("Utils")
class ActionsController extends Controller {

	@Get("/home")
	async home(req, res) {
        res.render("home", {Config}); // visit /src/views/home.mustache
	}

	@Get("/api/actions/:id")
	@Middleware(["isAdmin"])
	async find(req, res) {
        if (req.params.id==10) res.sendData("not_found);
		res.sendData({ ok: "wow2" });
	}
}

export { ActionsController };
```

-   `@Service("Utils")` allow to import automatically a file named `/src/**/*.service.js` and use functions in this file. You access with `this.Utils.xxx()`
-   `@Get("/home")` allow to declare that the next function (just below) is a funtion called when route `/home` is called
-   `@Middleware(["isAdmin"])` allow to first call the function `isAdmin()` before `find(req, res)`. The function `isAdmin()` must be declared in a file named `/src/**/*.middleware.js`

## Routing without @Crud

Same logic as https://expressjs.com/ but with decorators (no need to understand or write a single decorator from scratch... use it)

Some samples :

```js
@Get("/api/actions")
find_actions(req, res) { ... }

@Get("/api/actions/:id")
find_action(req, res) { ... }

@Post("/api/actions")
create_action(req, res) { ... }

@Put("/api/actions/:id")
update_action(req, res) { ... }

@Patch("/api/actions/:id") // @Put is identique by default at @Patch but you can change this behaviour see [todo])
update_action(req, res) { ... }

@Delete("/api/actions/:id")
delete_action(req, res) { ... }

@Get("/api/actions/*")
some_action(req, res) { ... }

```

## Routing with @Crud

```js
import { Controller, Crud, Middleware, Models } from "@morphinejs3/core";
const { Actions } = Models;

@Crud("/api/1.0/actions", Actions)
@Middleware(["user"])
class ActionsController extends Controller {}

export { ActionsController };
```

-   Five routes have been created :
    -   @Get("/api/actions")
    -   @Get("/api/actions/:id")
    -   @Post("/api/actions/:id")
    -   @Put("/api/actions/:id")
    -   @Destroy("/api/actions/:id")
-   middleware `user()` function is called before each routes (for sample this function complete req.user or call Passport)

# ORM (database)

## Configuration

Configure the connection params in `/morphinsjs.config.jsonc`

```json
	"mysql": {
		"client": "mysql2",
		"migrate": "alter",
		// see https://github.com/mysqljs/mysql#connection-options
		"connection": {
			"host": "localhost",
			"port": 3306,
			"user": "mysql_user",
			"password": "mysql_pass",
			"database": "testnest",
			"charset": "utf8_general_ci",
			"dateStrings": true
		}
	},
```

## Decalare a model

```js
// file /src/Actions.model.js

const uuid = require("uuid/v4");
module.exports = {
	beforeCreate: function (values, next) {
		if (!values.uuid) values.uuid = uuid();
		next();
	},
	beforeUpdate: function (values, next) {
		next();
	},
	filterValues: function (values, next) {
		values.uuid = values.uuid.toLowerCase();
		next();
	},

	tableName: "actions",

	attributes: {
		id: {
			type: "integer",
			autoincrement: true,
			primary: true,
		},
		uuid: {
			type: "string",
			length: 36,
		},
		userCreateId: {
			model: "Users",
			alias: "userCreate",
			onDelete: "RESTRICT", // RESTRICT, CASCADE, SET NULL,
			onUpdate: "RESTRICT", // RESTRICT, CASCADE, SET NULL,
		},
		userUpdateId: {
			model: "Users",
			alias: "userUpdate",
			onDelete: "RESTRICT",
			onUpdate: "RESTRICT",
		},
		infos: {
			type: "json",
			defaultsTo: {},
		},
	},
};
```

## Query a model

### Overview

```js
// find action with id=1 and auto-populate userCreate, userCreate.type, userUpdate, userUpdate.type
let row_ac = await Actions.findone(1).populateAll().exec();

// uuid start with 's1' ; populate userCreate and userCreate.type
let rows_ac = await Actions.find("uuid like ?", ["s1%"]).populate("userCreate.type").exec();

// create a new action and return the record saved
let row_ac_new = Actions.create({ userCreateId: 2, userUpdateId: 2 }).exec();

// update an action and return the record updated
let row_ac_updated = Actions.update(row_ac_new.id, { userUpdateId: 2 }).exec();
```

## find({...}) or find("...", [...])

Find multiple rows by object criteria or string criteria

```js
// row_ac1 and row_ac2 are identiques :
let rows_ac1 = await Actions.find({ userCreateId: 1, userUpdateId: 1 }).exec();
let rows_ac2 = await Actions.find("userCreateId=? && userUpdateId=?", [1, 1]).exec();
```

-   Object criteria are ONLY the AND sql statements
-   String criteria are the criterias after WHERE sql statement ; **we recommand this easy way to write your searches** for complexes queries.

## findone(id) or findone({...}) or findone("...", [...])

Find one row by id or object criteria or string criteria

```js
// row_ac1, row_ac2 and row_ac3 are identiques :
let row_ac1 = await Actions.findone(1).exec();
let row_ac2 = await Actions.findone({ ac_id: 1 }).exec();
let row_ac3 = await Actions.findone("ac_id=?", [1]).exec();
```
