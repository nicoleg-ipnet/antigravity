const fs = require('fs');
const readline = require('readline');
const { processBQImport } = require('./import_bq');

async function processLineByLine() {
  const fileStream = fs.createReadStream('../historico_bq.csv');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers = [];
  const records = [];
  let isFirst = true;

  for await (let line of rl) {
    let match = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    if (isFirst) {
      headers = match.map(h => h.trim().replace(/^"|"$/g, ''));
      isFirst = false;
      continue;
    }

    const o = {};
    match.forEach((val, i) => {
        if(headers[i] && val !== undefined) {
             o[headers[i]] = val.trim().replace(/^"|"$/g, '');
        }
    });
    if (o.id) records.push(o);
  }

  console.log(`Parsed ${records.length} records. Sending to local module...`);
  
  const req = { body: records };
  const res = {
      status: function(code) { this.code = code; return this; },
      json: function(data) { console.log('Response JSON:', data); }
  };
  
  processBQImport(req, res);
}

processLineByLine();
