/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Author:     Chris Brame
 *  Updated:    1/20/19 4:43 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const nconf = require('nconf')
const mongoose = require('mongoose')
const winston = require('../logger')

const db = {}
const mongoConnectionUri = {
  server: process.env.TD_MONGODB_SERVER || nconf.get('mongo:host') || 'localhost',
  port: process.env.TD_MONGODB_PORT || nconf.get('mongo:port') || '27018',
  username: process.env.TD_MONGODB_USERNAME || nconf.get('mongo:username'),
  password: process.env.TD_MONGODB_PASSWORD || nconf.get('mongo:password'),
  database: process.env.TD_MONGODB_DATABASE || nconf.get('mongo:database') || 'admin',
  shard: process.env.TD_MONGODB_SHARD || nconf.get('mongo:shard')
}

let CONNECTION_URI = ''
if (!mongoConnectionUri.username) {
  CONNECTION_URI =
    'mongodb://' + mongoConnectionUri.server + ':' + mongoConnectionUri.port + '/' + mongoConnectionUri.database
  if (mongoConnectionUri.shard === true)
    {
    CONNECTION_URI = 'mongodb+srv://' + mongoConnectionUri.server + '/' + mongoConnectionUri.database
} else {
  mongoConnectionUri.password = encodeURIComponent(mongoConnectionUri.password)
  if (mongoConnectionUri.shard === true)
    CONNECTION_URI =
      'mongodb+srv://' +
      mongoConnectionUri.username +
      ':' +
      mongoConnectionUri.password +
      '@' +
      mongoConnectionUri.server +
      '/' +
      mongoConnectionUri.database
  else
    CONNECTION_URI =
      'mongodb://' +
      mongoConnectionUri.username +
      ':' +
      mongoConnectionUri.password +
      '@' +
      mongoConnectionUri.server +
      ':' +
      mongoConnectionUri.port +
      '/' +
      mongoConnectionUri.database
}

if (process.env.TD_MONGODB_URI) CONNECTION_URI = process.env.TD_MONGODB_URI

let options = {
  keepAlive: true,
  connectTimeoutMS: 30000
}

module.exports.init = async function (callback, connectionString, opts) {
  if (connectionString) CONNECTION_URI = connectionString
  if (opts) options = opts
  options.dbName = mongoConnectionUri.database

  if (db.connection) {
    return callback(null, db)
  }

  global.CONNECTION_URI = CONNECTION_URI

  mongoose.Promise = global.Promise
  mongoose
    .connect(CONNECTION_URI, options)
    .then(function () {
      if (!process.env.FORK) {
        winston.info('Connected to MongoDB')
      }

      db.connection = mongoose.connection
      mongoose.connection.db.admin().command({ buildInfo: 1 }, function (err, info) {
        if (err) winston.warn(err.message)
        db.version = info.version
        return callback(null, db)
      })
    })
    .catch(function (e) {
      winston.error('Oh no, something went wrong with DB! - ' + e.message)
      db.connection = null

      return callback(e, null)
    })
}

module.exports.db = db
module.exports.connectionuri = CONNECTION_URI
