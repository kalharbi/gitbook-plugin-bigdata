var Promise = require("bluebird");
var using = Promise.using;
var jade = require("jade");
var _ = require("lodash");
var mongodb = Promise.promisifyAll(require("mongodb"));
var MongoClient = mongodb.MongoClient;
var MongoError = mongodb.MongoError;
var url = process.env.MongoDB_URL || "mongodb://localhost:27017/apps";
var collectionName = process.env.MongoDB_COLLECTION || "listings";

function connect() {
  return MongoClient.connectAsync(url)
    .disposer(function(connection, promise) {
      connection.close();
    });
}

module.exports = {
  process: function(blk) {
    var qstring = _.get(blk, "body", "").trim();
    if(_.isEmpty(qstring)){
      this.ctx.data = "";
      return jade.renderFile(__dirname + "/mongoquery.jade", {code: qstring});
    }
    console.log("Received query: " + qstring);
    var obj = JSON.parse("[" + qstring + "]");
    var query = obj[0];
    var projection = obj[1] || {};
    return using(connect(), function(db) {
        return db.collection(collectionName)
          .find(query, projection)
          .toArray();
      })
      .then(function(data) {
        this.ctx.data = data;
        var locals = {
          code: qstring
        };
        return jade.renderFile(__dirname + "/mongoquery.jade", locals);
      }.bind(this))
      .catch(MongoError, function(e) {
        console.error("Error: Failed to connect to MongoDB at: " + url,
          e.message);
      })
      .catch(SyntaxError, function(e) {
        console.error("Error: Invalid find query ", e.message);
      })
      .catch(function(e) {
        console.error("Error: " + e)
      });
  }
}
