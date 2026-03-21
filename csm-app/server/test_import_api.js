const fs = require('fs');
const readline = require('readline');

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
        if(headers[i]) o[headers[i]] = val.trim().replace(/^"|"$/g, '');
    });
    if (o.id) records.push(o);
  }

  console.log(`Parsed ${records.length} records. Sending to API...`);
  
  const response = await fetch('http://localhost:3001/api/import-bq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records)
  });

  const json = await response.json();
  console.log('Response:', json);
}

processLineByLine();
