import CSVParse = require('csv-parse/lib/sync');

import { Download } from '../../Download'
import { Picnic } from '../../../models/Picnic';

// Important Fields
let source_name = "National Park Service"
let dataset_name = "GSRM PICNIC"
let dataset_url_human = "https://opendata.arcgis.com/datasets/2d6bcd1a567c4badabcf485aea640f5e_0"
let dataset_url_csv = "https://opendata.arcgis.com/datasets/2d6bcd1a567c4badabcf485aea640f5e_0.csv"
let license_name = "Unspecified (Public Domain?)"
let license_url = "https://en.wikipedia.org/wiki/Public_domain"

Download.parseDataString(dataset_name, dataset_url_csv, function (res: string) {
  let database_updates: Array<any> = Array<any>(0);
  let retrieved = new Date();

  CSVParse(res, { columns: true, ltrim: true }).forEach(function (data: any) {
    let lat = parseFloat(data["Y"]);
    let lng = parseFloat(data["X"]);
    let alt = parseFloat(data["ELEVATION"]);

    let comment: string = data["COMMENT"];
    let globalID: string = data["GEOMETRYID"];

    if (data["LOC_NAME"]) {
      comment = data["LOC_NAME"] + " - ";
    }
    if (data["LANDFORM"]) {
      comment += "Landform: " + data["LANDFORM"];
    }

    database_updates.push(Picnic.findOneAndUpdate({
      "geometry.type": "Point",
      "properties.source.id": globalID
    }, {
        $set: {
          "type": "Feature",
          "properties.type": "site",
          "properties.source.retrieved": retrieved,
          "properties.source.name": source_name,
          "properties.source.dataset": dataset_name,
          "properties.source.url": dataset_url_human,
          "properties.source.id": globalID,
          "properties.license.name": license_name,
          "properties.license.url": license_url,
          "properties.comment": comment,
          "geometry.type": "Point",
          "geometry.coordinates": [lng, lat, alt]
        }
      }, {
        "upsert": true,
        "new": true
      }).exec());
  })

  return database_updates;
});