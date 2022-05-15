const fs = require('fs');
const data = require('./arabic.json');
const english = require('./english.json');
console.log(english);

var obj = {};
for (var i = 0; i < english.length; i++) {
   obj[english[i]] = data[i];
}

var asJSON = JSON.stringify(obj);
fs.writeFileSync('coverted.json', asJSON);