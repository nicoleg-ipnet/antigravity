const db = require('./database');

const processFreshserviceWebhook = (req, res) => {
    const {
        ticket_id,
        subject,
        requester_name,
        department,
        agent_name,
        service_item,
        customer_interactions,
        closed_at
    } = req.body;

    console.log(`Processing Freshservice ticket #${ticket_id} for department: ${department}`);

    // 1. Find the contract based on freshservice_dept
    const findContractSql = "SELECT id, cliente FROM contracts WHERE freshservice_dept = ?";

    db.get(findContractSql, [department], (err, contract) => {
        if (err) {
            console.error("Error finding contract:", err.message);
            return res.status(500).json({ error: "Internal database error" });
        }

        if (!contract) {
            console.warn(`No contract found for Freshservice department: ${department}`);
            return res.status(404).json({ error: `Contrato não encontrado para o departamento: ${department}` });
        }

        // 2. Calculate engagement
        const interactions = parseInt(customer_interactions) || 0;
        let engajamento = 2; // Default 0-2
        if (interactions >= 3 && interactions <= 5) {
            engajamento = 4;
        } else if (interactions > 5) {
            engajamento = 5;
        }

        // 3. Normalize service_item (tipo_entrega)
        // Adjusting common variations to match our internal values
        let tipo_entrega = service_item || 'Suporte';
        const itemLower = tipo_entrega.toLowerCase();

        if (itemLower.includes('workshop')) tipo_entrega = 'Workshop';
        else if (itemLower.includes('treinamento')) tipo_entrega = 'Treinamento';
        else if (itemLower.includes('assessment')) tipo_entrega = 'Assessment';
        else if (itemLower.includes('report')) tipo_entrega = 'Maps Report';
        else if (itemLower.includes('proposta')) tipo_entrega = 'Proposta técnica';
        else if (itemLower.includes('suporte')) tipo_entrega = 'Suporte';

        // 4. Prepare data
        const data = closed_at ? new Date(closed_at).toISOString() : new Date().toISOString();
        const responsavel_atendimento = agent_name || 'Agente Freshservice';
        const status_entrega = 'Sucesso';
        const temperatura = 'Bom';
        const alerta_risco = '';
        const observacoes = `Ticket #${ticket_id}: ${subject} (Requisitante: ${requester_name})`;

        // 5. Insert activity
        const insertSql = `INSERT INTO activities (
            data, contract_id, responsavel_atendimento, tipo_entrega, 
            status_entrega, engajamento, temperatura, alerta_risco, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(insertSql, [
            data, contract.id, responsavel_atendimento, tipo_entrega,
            status_entrega, engajamento, temperatura, alerta_risco, observacoes
        ], function (err) {
            if (err) {
                console.error("Error inserting activity from Freshservice:", err.message);
                return res.status(500).json({ error: err.message });
            }
            console.log(`Activity created successfully for ${contract.cliente}. ID: ${this.lastID}`);
            res.status(201).json({ success: true, activity_id: this.lastID });
        });
    });
};

module.exports = { processFreshserviceWebhook };
