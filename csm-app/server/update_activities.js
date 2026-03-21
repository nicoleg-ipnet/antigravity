const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'csm.db');
const db = new sqlite3.Database(dbPath, (err) => {
    db.run(`ALTER TABLE activities ADD COLUMN source_id TEXT`, (err) => {
        if (!err) {
            db.run(`CREATE UNIQUE INDEX idx_source_id ON activities(source_id)`, () => {
                console.log("Added source_id and unique index.");
                db.close();
            });
        } else {
            console.log("Already added or error:", err.message);
            db.close();
        }
    });
});
