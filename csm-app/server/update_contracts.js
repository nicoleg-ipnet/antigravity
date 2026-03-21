const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'csm.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        return;
    }

    db.serialize(() => {
        // Try to add column, ignore error if it already exists
        db.run(`ALTER TABLE contracts ADD COLUMN dpt_domains TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.log("Column may already exist:", err.message);
            } else {
                console.log("Added dpt_domains column (or it already existed).");
            }

            const mappings = {
                "IPNET - GMP - SERPRO": "serpro.gov.br",
                "IPNET - GMP - ITAIPU": "itaipu.gov.br",
                "IPNET - GMP - MOBI LOGISTICA": "mobi.com.br",
                "IPNET - GMP - Omni Brasil": "omnibrasil.com.br",
                "IPNET - GMP - BAT BRASIL": "bat.com",
                "IPNET - GMP - TELECOM TRACK": "telecomtrack.com.br",
                "IPNET - GMP - Serasa Experian": "serasaexperian.com.br",
                "IPNET - GMP - Prodam": "prodam.sp.gov.br",
                "IPNET - GMP - OI/VTal": "oi.net.br,oi.com.br",
                "IPNET - GMP - Belotur": "pbh.gov.br",
                "IPNET - GMP - EMPREL/ PRODABEL": "emprel.gov.br,recife.pe.gov.br", // EMPREL/PRODABEL -> prefeitura de recife is emprel.gov.br
                "IPNET - GMP - PETROBRAS": "petrobras.com.br",
                "IPNET - GMP - TCE - Tribunal de Contas de Pernambuco": "tce.pe.gov.br,tcepe.tc.br",
                "IPNET - GMP - SEPLAG": "seplag.ce.gov.br",
                "IPNET - GMP - IMA - Informática de Municípios Associados": "ima.sp.gov.br",
                "IPNET - GMP - GM Rio - Guarda Municipal": "gm.rio,gm.rio.rj.gov.br,rj.gov.br,rio.rj.gov.br",
                "IPNET - GMP - FIEC": "sfiec.org.br",
                "IPNET - GMP - Município de Salvador (SEMIT)": "salvador.ba.gov.br",
                "IPNET - GMP - Prefeitura Municipal de Indaiatuba": "indaiatuba.sp.gov.br",
                "IPNET - GMP - Banco do Brasil": "bb.com.br",
                "IPNET - GMP - AplicaBus": "www.aplicabus.com.br",
                "IPNET - GMP - Gaudium": "gaudium.com.br"
            };

            const stmt = db.prepare(`UPDATE contracts SET dpt_domains = ? WHERE cliente = ?`);
            for (const [cliente, domains] of Object.entries(mappings)) {
                stmt.run(domains, cliente, (err) => {
                    if (err) console.error("Error updating", cliente, err.message);
                });
            }
            stmt.finalize(() => {
                console.log("Updated dpt_domains on contracts table.");
                db.close();
            });
        });
    });
});
