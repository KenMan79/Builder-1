const sanitize = require("sanitize-filename");
const fs = require('fs-extra');

function toFolderName(title) {
  const santized = sanitize(title);
  return santized.toLowerCase().replace(/\s/g, '_');
}

function prettifyJSON(json) {
  return JSON.stringify(json, null, 2);
}

module.exports = { toFolderName, prettifyJSON }
