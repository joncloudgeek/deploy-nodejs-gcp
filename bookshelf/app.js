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

app.set('views', require('path').join(__dirname, 'views'));
app.set('view engine', 'pug');

// Books
app.use('/books', require('./books/crud'));
app.use('/api/books', require('./books/api'));

// Redirect root to /books
app.get('/', (req, res) => {
  res.redirect('/books');
});

app.get('/errors', () => {
  throw new Error('Test exception');
});

app.get('/logs', (req, res) => {
  console.log('Hey, you triggered a custom log entry. Good job!');
  res.sendStatus(200);
});

if (process.env.FUNCTION_TARGET == null) {
  // Start the server
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`App listening on port ${port}`);
  });

  // Exporting for App Engine, etc.
  module.exports = app;
} else {
  // Export function for Cloud Functions
  const functions = require('firebase-functions');
  exports.bookshelf = functions.https.onRequest(app);
}
// NOTE: Cannot do both `module.exports` and `exports.*` at the same time.
// For a good write-up on this, see https://www.hacksparrow.com/nodejs/exports-vs-module-exports.html or https://app.pagedash.com/p/589818cb-cd49-4138-83f3-2f3e174120bc/x0DYcXJfotndQqR6ZoE2 (archive link)