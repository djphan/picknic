import Express = require('express');
import Fs = require('fs');
import I18next = require('i18next');
import Mustache = require('mustache')
import Path = require('path');
import { Module } from "../Module";

// Load all partials (Mustache templates) into a list
let partials: any = {};
let viewsPath = Path.join(__dirname, "../../../source/views/");
Fs.readdir(viewsPath, (err, files) => {
  if (err) {
    console.log(err);
    return;
  }
  files.forEach(file => {
    if (Path.extname(file) == ".mustache") {
      Fs.readFile(Path.join(viewsPath, file), 'utf8', (err, data) => {
        if (err) {
          console.log(err);
          return;
        }
        partials[Path.basename(file, ".mustache")] = data;
      });
    }
  });
});

export class TemplatingModule extends Module {
  static mi18n: I18next.i18n;

  constructor(app: Express.Application, i18n: I18next.i18n) {
    super(app);
    TemplatingModule.mi18n = i18n;
  }
  addRoutes(app: Express.Application) {
    app.get('/', (req: Express.Request, res: Express.Response) => {
      res.redirect("index.html");
    });

    app.get('/*.html', function (req: Express.Request, res: Express.Response) {
      // Serve the requested language
      // NOTE: req's "language" property is only available due to the 'express-request-language' package
      TemplatingModule.mi18n.changeLanguage((req as any).language);

      // Get the index.html from the views folder
      let fileLocation = Path.join(viewsPath, req.path);
      Fs.readFile(fileLocation, 'utf8', function (err, data) {
        if (err) {
          console.log(err);
          res.send("There was an error loading " + req.path);
          return;
        }
        // Render it with Mustache
        res.send(Mustache.render(data, {
          i18n: function () {
            return function (text: string, render: any) {
              return render(TemplatingModule.mi18n.t(text));
            }
          },
          show_map_search: (req.path.endsWith("index.html")),
          session: req.session
        }, partials));
      });
    });
  }
}