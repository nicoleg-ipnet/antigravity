const db = require('./database');

const processBQImport = (req, res) => {
    let records = req.body;
    if (!Array.isArray(records)) {
        if (records && Array.isArray(records.data)) {
            records = records.data;
        } else {
            return res.status(400).json({ error: "Expected an array of records in body or body.data" });
        }
    }

    db.all("SELECT id, dpt_domains FROM contracts WHERE dpt_domains IS NOT NULL", [], (err, contracts) => {
        if (err) return res.status(500).json({ error: err.message });

        let insertedCount = 0;
        let skippedCount = 0;
        let errors = [];

        const stmt = db.prepare(`INSERT OR IGNORE INTO activities (
            data, contract_id, responsavel_atendimento, tipo_entrega, 
            status_entrega, engajamento, temperatura, alerta_risco, observacoes, source_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        let pendingCompletedCount = 0;
        if(records.length === 0) {
            return res.json({ insertedCount: 0, skippedCount: 0 });
        }

        records.forEach(record => {
            let recordDomainsText = record.dpt_domains || "";
            let recordDomain = recordDomainsText.replace('[', '').replace(']', '').split(',')[0].trim();
            
            let contractId = null;
            if (recordDomain) {
                for (let c of contracts) {
                    if (c.dpt_domains.includes(recordDomain)) {
                        contractId = c.id;
                        break;
                    }
                }
            }

            if (!contractId) {
                skippedCount++; // Could not map domain
                pendingCompletedCount++;
                checkDone();
                return;
            }

            let dataIso;
            try {
                // Try converting date string to ISODate, if valid. Otherwise use current date.
                const dt = new Date(record.closed_at || record.created_at || Date.now());
                dataIso = isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
            } catch (e) {
                dataIso = new Date().toISOString();
            }

            const resp = record.agent_first_name || 'Agente BQ';
            let tipo = record.item_category || 'Outros'; 
            
            // Normalize service delivery type
            const itemLower = tipo.toLowerCase();
            if (itemLower.includes('workshop')) tipo = 'Workshop';
            else if (itemLower.includes('treinamento')) tipo = 'Treinamento';
            else if (itemLower.includes('assessment')) tipo = 'Assessment';
            else if (itemLower.includes('report')) tipo = 'Maps Report';
            else if (itemLower.includes('técnica') || itemLower.includes('tecnica')) tipo = 'Proposta técnica';
            else tipo = 'Suporte'; // For technical/billing issues we use 'Suporte'

            const status = 'Sucesso'; // They are usually closed tickets
            let engajamento = parseInt(record.csat_score);
            if (isNaN(engajamento)) engajamento = null;
            
            const source_id = `BQ-${record.id}`;

            stmt.run([
                dataIso, contractId, resp, tipo, status, engajamento, 'Bom', '', `[Importação BQ] ${record.subject || ''}`, source_id
            ], function (insertErr) {
                if (insertErr) {
                    errors.push(insertErr.message);
                } else if (this.changes > 0) {
                    insertedCount++;
                } else {
                    skippedCount++; // Duplicate ignored
                }
                pendingCompletedCount++;
                checkDone();
            });
        });

        function checkDone() {
            if (pendingCompletedCount === records.length) {
                stmt.finalize();
                res.json({ success: true, insertedCount, skippedCount, errors: errors.length > 0 ? errors : undefined });
            }
        }
    });
};

module.exports = { processBQImport };
