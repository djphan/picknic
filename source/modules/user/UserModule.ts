import Bcrypt = require('bcrypt');
import Express = require('express');
import Nconf = require('nconf');
import Path = require("path");
import Request = require('request');
import { Module } from "../Module";
import { User } from "../../models/User";

// Load Settings
Nconf.file(Path.join(__dirname, "../../../config.json"));
var keys = Nconf.get("keys");
var bcryptConfig = Nconf.get("bcrypt");

export class UserModule extends Module {
  addRoutes(app: Express.Application) {
    app.post("/user/login", function (req: Express.Request, res: Express.Response) {
      // TODO: Error messages
      let email: string = req.body["email"];
      let plaintextPassword: string = req.body["password"];
      let ipAddress: string = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      let now: number = Date.now();

      // Find email
      let user = User.findOne({
        "email": email
      }).exec().then(function (user: any) {
        if (!user) {
          // No username was found, try again
          res.redirect("/login.html");
        } else {
          // Verify password
          Bcrypt.compare(plaintextPassword, user.password, function (err, same) {
            if (err) {
              console.log(err);
              res.redirect('/login.html');
            }
            if (same) {
              req.session.user = email;
              res.redirect('/');
            } else {
              res.redirect("/login.html");
            }
          })
        }
      })
    });
    app.post("/user/register", function (req: Express.Request, res: Express.Response) {
      // TODO: Error messages
      let captcha: string = req.body["g-recaptcha-response"];
      let email: string = req.body["email"];
      let plaintextPassword: string = req.body["password"];
      let ipAddress: string = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      let now: number = Date.now();

      // Verify fields are filled out
      if (!email) {
        // No email
        res.redirect("/register.html?error=Please%20enter%20a%20valid%20email%20address.");
        return;
      }
      if (!plaintextPassword) {
        res.redirect("/register.html?email=" + email + "&error=Please%20enter%20a%20password.");
        return;
      }

      // Verify captcha
      if (!captcha) {
        // No Captcha
        res.redirect("/register.html?email=" + email + "&error=Please%20fill%20out%20the%20captcha.");
        return;
      }
      Request.post({
        url: "https://www.google.com/recaptcha/api/siteverify",
        formData: {
          secret: keys.private.recaptcha,
          response: captcha,
          remoteip: ipAddress
        }
      },
        function (error: boolean, response: any, body: string) {
          let captchaResponse = JSON.parse(response.body);

          if (!captchaResponse.success) {
            // Failed Captcha
            res.redirect("/register.html?email=" + email + "&error=There%20was%20a%20problem%20with%20the%20captcha.");
            return;
          }

          // Register user
          Bcrypt.hash(plaintextPassword, bcryptConfig.cost).then(function (passwordHash) {
            let user = new User({
              "email": email,
              "password": passwordHash,
              "joined": Date.now()
            });

            User.create(user, function (error: any, newUser: string) {
              if (error) {
                res.send("We had an error... " + error);
                console.log(error);
                return;
              } else {
                // TODO: Cookies for login
                res.redirect('/');
              }
            });
          });
        });
    });
  }
}