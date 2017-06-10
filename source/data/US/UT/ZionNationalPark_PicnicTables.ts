import CSVParse = require('csv-parse');
import Mongoose = require('mongoose');
import Request = require('request');

import { Picnic } from '../../../models/Picnic';

// Setup Mongoose
Mongoose.Promise = global.Promise;
Mongoose.connect('mongodb://localhost/picknic');

// Important Fields
let source_name = "National Park Service"
let dataset_name = "Zion National Park - Picnic Tables"
let dataset_url_human = "https://opendata.arcgis.com/datasets/b89ef7a7f234491a995dbaefb9f160ac_0"
let dataset_url_csv = "https://opendata.arcgis.com/datasets/b89ef7a7f234491a995dbaefb9f160ac_0.csv"
let license_name = "Unspecified (Public Domain?)"
let license_url = "https://en.wikipedia.org/wiki/Public_domain"

// Download & Parse!
let retrieved = new Date();
let j = 0;
let success = 0;
let fail = 0;
console.log("Downloading...");
Request(dataset_url_csv, function (error: boolean, response: any, body: string) {
  console.log("Parsing & Updating Database...");
  CSVParse(body, { columns: true }, function (error: any, data: any) {

    // Data
    for (let i = 0; data[i]; i++) {
      let lat = parseFloat(data[i]["Y"]);
      let lng = parseFloat(data[i]["X"]);

      // Comments based on additional data
      let comment: string = data[i]["Location"].trim() + " - " + data[i]["Description"];
      let globalID: string = data[i]["GlobalID"];

      // Insert or Update Table
      j += 1;
      Picnic.findOneAndUpdate({
        "geometry.type": "Point",
        "properties.source.id": globalID
      }, {
          $set: {
            "type": "Feature",
            "properties.type": "table",
            "properties.source.retrieved": retrieved,
            "properties.source.name": source_name,
            "properties.source.dataset": dataset_name,
            "properties.source.url": dataset_url_human,
            "properties.source.id": globalID,
            "properties.license.name": license_name,
            "properties.license.url": license_url,
            "properties.comment": comment,
            "geometry.type": "Point",
            "geometry.coordinates": [lng, lat]
          }
        }, {
          "upsert": true
        }).exec(function (err, doc) {
          if (err) {
            console.log(err);
            fail = fail + 1;
          } else {
            success = success + 1;
          }

          // Disconnect on last update
          j -= 1;
          if (j == 0) {
            console.log(success + "/" + (success + fail) + " updated/inserted.");
            Mongoose.disconnect();
          }
        });
    }
  });
});