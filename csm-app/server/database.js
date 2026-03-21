const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'csm.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        db.serialize(() => {
            // Table: contracts
            db.run(`CREATE TABLE IF NOT EXISTS contracts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente TEXT NOT NULL,
                workshop_target INTEGER DEFAULT 0,
                assessment_target INTEGER DEFAULT 0,
                treinamento_target INTEGER DEFAULT 0,
                maps_report_target INTEGER DEFAULT 0,
                suporte_target INTEGER DEFAULT 0,
                proposta_tecnica_target INTEGER DEFAULT 0,
                responsavel_cs TEXT,
                freshservice_dept TEXT,
                dpt_domains TEXT
            )`);

            // Table: activities
            db.run(`CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                contract_id INTEGER NOT NULL,
                responsavel_atendimento TEXT,
                tipo_entrega TEXT NOT NULL,
                status_entrega TEXT NOT NULL,
                engajamento INTEGER,
                temperatura TEXT,
                alerta_risco TEXT,
                observacoes TEXT,
                source_id TEXT UNIQUE,
                FOREIGN KEY (contract_id) REFERENCES contracts (id)
            )`);

            // Table: usuarios
            db.run(`CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                senha TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'viewer'
            )`);

            // Seed Initial Data
            db.get("SELECT COUNT(*) AS count FROM contracts", (err, row) => {
                if (row && row.count === 0) {
                    console.log("Seeding contracts data...");
                    const stmt = db.prepare(`INSERT INTO contracts (
                        cliente, workshop_target, assessment_target, treinamento_target, maps_report_target, suporte_target, proposta_tecnica_target
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`);

                    const initialData = [
                        ["IPNET - GMP - SERPRO", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - ITAIPU", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - MOBI LOGISTICA", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - Omni Brasil", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - BAT BRASIL", 4, 1, 1, 12, 60, 0],
                        ["IPNET - GMP - TELECOM TRACK", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - Serasa Experian", 4, 1, 1, 12, 60, 0],
                        ["IPNET - GMP - Prodam", 0, 0, 1, 12, 60, 0],
                        ["IPNET - GMP - OI/VTal", 4, 1, 1, 12, 60, 0],
                        ["IPNET - GMP - Belotur", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - EMPREL/ PRODABEL", 0, 1, 0, 12, 60, 0],
                        ["IPNET - GMP - PETROBRAS", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - TCE - Tribunal de Contas de Pernambuco", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - SEPLAG", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - IMA - Informática de Municípios Associados", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - GM Rio - Guarda Municipal", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - FIEC", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - Município de Salvador (SEMIT)", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - Prefeitura Municipal de Indaiatuba", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - Banco do Brasil", 0, 0, 0, 12, 60, 0],
                        ["IPNET - GMP - AplicaBus", 1, 0, 1, 0, 40, 0],
                        ["IPNET - GMP - Gaudium", 0, 0, 0, 0, 60, 0]
                    ];

                    initialData.forEach(data => stmt.run(data));
                    stmt.finalize();
                    console.log("Seeding complete.");
                }
            });

            // Seed Users
            db.get("SELECT COUNT(*) AS count FROM usuarios", (err, row) => {
                if (row && row.count === 0) {
                    console.log("Seeding users data...");
                    const stmt = db.prepare("INSERT INTO usuarios (nome, email, senha, role) VALUES (?, ?, ?, ?)");

                    // Contas padrões para teste
                    const users = [
                        ["Nicole (Editor)", "nicole@csm.com", "admin123", "editor"],
                        ["Liderança (Viewer)", "viewer@csm.com", "view123", "viewer"]
                    ];

                    users.forEach(u => stmt.run(u));
                    stmt.finalize();
                    console.log("Users seeding complete.");
                }
            });
        });
    }
});

module.exports = db;
