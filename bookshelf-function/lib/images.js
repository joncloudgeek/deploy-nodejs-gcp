// Copyright 2019, Google, Inc.
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

const GOOGLE_CLOUD_PROJECT = process.env['GOOGLE_CLOUD_PROJECT'];
const CLOUD_BUCKET = GOOGLE_CLOUD_PROJECT + '_bucket';

// [START bookshelf_cloud_storage_client]
const Storage = require('@google-cloud/storage');

const storage = Storage();
const bucket = storage.bucket(CLOUD_BUCKET);
// [END bookshelf_cloud_storage_client]

// Returns the public, anonymously accessible URL to a given Cloud Storage
// object.
// The object's ACL has to be set to public read.
// [START public_url]
function getPublicUrl(filename) {
  return `https://storage.googleapis.com/${CLOUD_BUCKET}/${filename}`;
}
// [END public_url]

// Express middleware that will automatically pass uploads to Cloud Storage.
// req.file is processed and will have two new properties:
// * ``cloudStorageObject`` the object name in cloud storage.
// * ``cloudStoragePublicUrl`` the public url to the object.
// [START process]
function sendUploadToGCS(req, res, next) {
  if (!req.file) {
    return next();
  }

  const gcsname = Date.now() + req.file.originalname;
  const file = bucket.file(gcsname);

  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype,
    },
    resumable: false,
  });

  stream.on('error', err => {
    req.file.cloudStorageError = err;
    next(err);
  });

  stream.on('finish', async () => {
    req.file.cloudStorageObject = gcsname;
    await file.makePublic();
    req.file.cloudStoragePublicUrl = getPublicUrl(gcsname);
    next();
  });

  stream.end(req.file.buffer);
}
// [END process]

// Multer handles parsing multipart/form-data requests.
// This instance is configured to store images in memory.
// This makes it straightforward to upload to Cloud Storage.
// [START multer]
const Multer = require('multer');
const multer = Multer({
  storage: Multer.MemoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // no larger than 5mb
  },
});
// [END multer]

// NEW MIDDLEWARE TO DEPLOY IN CLOUD FUNCTIONS
// Node.js doesn't have a built-in multipart/form-data parsing library.
// Instead, we can use the 'busboy' library from NPM to parse these requests.
// Code is mostly from https://cloud.google.com/functions/docs/writing/http#multipart_data
const path = require('path');
const os = require('os');
const fs = require('fs');
function processMultipartForm(req, res, next) {
  const Busboy = require('busboy');

  const busboy = new Busboy({headers: req.headers});
  const tmpdir = os.tmpdir();

  // This object will accumulate all the fields, keyed by their name
  const fields = {};

  // This object will accumulate all the uploaded files, keyed by their name.
  const uploads = {};

  // This code will process each non-file field in the form.
  busboy.on('field', (fieldname, val) => {
    // TODO(developer): Process submitted field values here
    console.log(`Processed field ${fieldname}: ${val}.`);
    fields[fieldname] = val;
  });

  const fileWrites = [];

  // This code will process each file uploaded.
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    // Note: os.tmpdir() points to an in-memory file system on GCF
    // Thus, any files in it must fit in the instance's memory.
    console.log(`Processed file ${filename}`);
    const filepath = path.join(tmpdir, filename);

    // Store the multer-like file information
    uploads[fieldname] = {
      fieldname,
      encoding,
      mimetype,
      filename,
      originalname: filename,
      path: filepath,
    };

    const writeStream = fs.createWriteStream(filepath);
    file.pipe(writeStream);

    // File was processed by Busboy; wait for it to be written to disk.
    const promise = new Promise((resolve, reject) => {
      const bufs = []
      file.on('data', chunk => {
        bufs.push(chunk);
      })
      file.on('end', () => {
        writeStream.end();
        uploads[fieldname].buffer = Buffer.concat(bufs);
      });
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    fileWrites.push(promise);
  });

  // Triggered once all uploaded files are processed by Busboy.
  // We still need to wait for the disk writes (saves) to complete.
  busboy.on('finish', async () => {
    await Promise.all(fileWrites);

    // TODO(developer): Process saved files here
    for (const fieldname of Object.keys(uploads)) {
      // Retrieve file-like object with necessary fields
      const file = uploads[fieldname];

      // Ignore empty files (field has no file)
      if (file.filename) {
        req.file = file;
        fs.unlinkSync(file.path);
      }
    }

    // Assign fields object to request body
    req.body = fields;

    next();
  });

  busboy.end(req.rawBody);
}

module.exports = {
  getPublicUrl,
  sendUploadToGCS,
  processMultipartForm,
  multer,
};
