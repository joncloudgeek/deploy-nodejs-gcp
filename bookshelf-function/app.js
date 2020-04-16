// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const express = require('express');

const app = express();

// The actual root path of the application
let rootPath = process.env.FUNCTION_TARGET ? `/${process.env.FUNCTION_TARGET}` : "/";
if (process.env.ROOT_PATH != null) { // expects "/" or "/path"
  rootPath = process.env.ROOT_PATH;
}

// If rootPath is "/", set to empty string to prevent "//" in URLs.
if (rootPath === "/") {
  rootPath = "";
}

// Set rootPath for use in templates.
app.locals.rootPath = rootPath;

// Middleware to write rootPath to request object
app.use('*', (req, res, next) => {
  req.rootPath = rootPath;
  next();
})

app.set('views', require('path').join(__dirname, 'views'));
app.set('view engine', 'pug');

// Books
app.use('/books', require('./books/crud'));
app.use('/api/books', require('./books/api'));

// Redirect base URL to <BASE_URL>/books
app.get('/', (req, res) => {
  res.redirect(`${req.rootPath}/books`);
});

app.get('/errors', () => {
  throw new Error('Test exception');
});

app.get('/logs', (req, res) => {
  console.log('Hey, you triggered a custom log entry. Good job!');
  res.sendStatus(200);
});

// Export function for Cloud Functions
const functions = require('firebase-functions');
exports.bookshelf = functions.https.onRequest(app);

// Side note: Cannot do both `module.exports` and `exports.*` at the same time.
// For a good write-up on this, see https://www.hacksparrow.com/nodejs/exports-vs-module-exports.html or https://app.pagedash.com/p/589818cb-cd49-4138-83f3-2f3e174120bc/x0DYcXJfotndQqR6ZoE2 (archive link)