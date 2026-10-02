'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), files = require('./public-files');
const sourceCommit = process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/.test(sourceCommit || '')) throw Error('A bound source commit is required');
const entries = files.map(file => {
  const bytes = fs.readFileSync(path.join(root, 'website', file));
  return {file, bytes:bytes.length, sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
});
const receipt = {schema:'lernstudio.pages-build.v1', sourceCommit, builtAt:new Date().toISOString(), state:'BUILD_COMPLETED', entries};
fs.writeFileSync(path.join(root,'website','build-info.json'),JSON.stringify(receipt,null,2)+'\n');
fs.writeFileSync(path.join(root,'website','.nojekyll'),'');
console.log('Pages build receipt: '+sourceCommit+' / '+entries.length+' public files');
