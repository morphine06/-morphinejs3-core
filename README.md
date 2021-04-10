# MorphineJS 3

## Philosophy

No informatic is not philosophy, but main principles of MorphineJS are :

-   anti-verbose micro-framework, 1000 lines of code (10.000 lines of documentation)
-   produce (**really**) short code so... no typescript
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

## Get started

If you use Microsoft VSCode, install "ESLint", "Prettier" and "Mustache" plugins

```
npm i -g @morphinejs/cli
morphinejs new my-project
cd my-project
npm run dev
// visit http://localhost:5100
```

## Preview : Exported objects by morphinejs

When you `import * from 'morphinejs'` you can access only to this objects or decorators :

```
export { MorphineJs, Config, App, Controller, Crud, Get, Post, Put, Delete, DbMysql, Model, Service, Middleware };
```

| Syntax                     | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| Config                     | Edit /morphinejs.config.jsonc (json with comments)                           |
| Controller                 | Extends this class to herit base class controller                            |
| @Middleware                | Decorator to use a middleware (function executed before controller handler)  |
| @Crud                      | Magic decorator to create CRUD requests on a controller ; link a MySQL table |
| @Get, @Post, @Put, @Delete | Decorators to declare your controller routes                                 |
| @Model                     | Decorator to use a model                                                     |
| @Service                   | Decorator to use a service (sometime named helper, provider)                 |
| DbMysql                    | Use directly database without ORM                                            |
| App                        | The ExpressJS app instance                                                   |
| MorphineJs                 | used in main.js to bootstrap application                                     |
| res.sendData()             | New function to simplify JSON response                                       |

That's all folks !

## Controllers

Same logic as https://expressjs.com/ but with decorators (no need to understand or write a single decorator from scratch)

```
import { Get, Controller, Config } from "morphinejs3";

@Service("Utils")
class ActionsController extends Controller {

	@Get("/home")
	async home(req, res) {
        res.render("home", {Config}); // visit /src/views/home.mustache
	}

	@Get("/api/actions/:id")
	async find(req, res) {
        if (req.params.id==10) res.sendData("not_found);
		res.sendData({ ok: "wow2" });
	}
}

export { ActionsController };
```
