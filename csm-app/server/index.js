require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const db = require('./database');


const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;

// --- Middleware de Autenticação & Role ---
const checkEditor = (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    if (userRole === 'editor') {
        next();
    } else {
        res.status(403).json({ error: "Acesso negado. Apenas editores podem realizar esta ação." });
    }
};

// --- API Routes ---
// Auth API
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    db.get("SELECT id, nome, email, role FROM usuarios WHERE email = ? AND senha = ?", [email, senha], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "E-mail ou senha incorretos" });
        res.json(user);
    });
});

// --- Contratos (Contracts) API ---
app.get('/api/contracts', (req, res) => {
    db.all("SELECT * FROM contracts", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/contracts', checkEditor, (req, res) => {
    const {
        cliente, responsavel_cs, workshop_target, assessment_target,
        treinamento_target, maps_report_target, suporte_target, proposta_tecnica_target,
        freshservice_dept, dpt_domains
    } = req.body;

    const sql = `INSERT INTO contracts (
        cliente, responsavel_cs, workshop_target, assessment_target, 
        treinamento_target, maps_report_target, suporte_target, proposta_tecnica_target,
        freshservice_dept, dpt_domains
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
        cliente, responsavel_cs, workshop_target || 0, assessment_target || 0,
        treinamento_target || 0, maps_report_target || 0, suporte_target || 0, proposta_tecnica_target || 0,
        freshservice_dept, dpt_domains
    ], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID });
    });
});

app.put('/api/contracts/:id', checkEditor, (req, res) => {
    const { id } = req.params;
    console.log(`[PUT /api/contracts/${id}] body:`, JSON.stringify(req.body).slice(0, 300));
    console.log(`[PUT /api/contracts/${id}] role header:`, req.headers['x-user-role']);
    const {
        cliente, responsavel_cs, workshop_target, assessment_target,
        treinamento_target, maps_report_target, suporte_target, proposta_tecnica_target,
        freshservice_dept, dpt_domains,
        // Novos campos comerciais
        numero_contrato, inicio_contrato, vencimento_contrato,
        sponsor_nome, sponsor_cargo, sponsor_email,
        contatos_tecnicos, historico_sensivel
    } = req.body;

    // contatos_tecnicos chega como array — serializar para JSON
    const contatosJson = contatos_tecnicos
        ? JSON.stringify(contatos_tecnicos)
        : null;

    const sql = `UPDATE contracts SET 
        cliente = ?, responsavel_cs = ?, workshop_target = ?, assessment_target = ?, 
        treinamento_target = ?, maps_report_target = ?, suporte_target = ?, proposta_tecnica_target = ?,
        freshservice_dept = ?, dpt_domains = ?,
        numero_contrato = ?, inicio_contrato = ?, vencimento_contrato = ?,
        sponsor_nome = ?, sponsor_cargo = ?, sponsor_email = ?,
        contatos_tecnicos = ?, historico_sensivel = ?
        WHERE id = ?`;

    db.run(sql, [
        cliente, responsavel_cs, workshop_target || 0, assessment_target || 0,
        treinamento_target || 0, maps_report_target || 0, suporte_target || 0, proposta_tecnica_target || '',
        freshservice_dept, dpt_domains,
        numero_contrato || null, inicio_contrato || null, vencimento_contrato || null,
        sponsor_nome || null, sponsor_cargo || null, sponsor_email || null,
        contatosJson, historico_sensivel || null,
        id
    ], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Contrato não encontrado" });
        }
        res.status(200).json({ message: "Contrato atualizado com sucesso" });
    });
});

// --- Atividades (Activities) API ---
app.post('/api/bot/log', (req, res) => {
    // Rota dedicada para as automações (ex: Google Chat Bot)
    console.log("Recebendo log do Bot:", req.body);

    const {
        cliente_id, responsavel_atendimento, tipo_entrega,
        status_entrega, engajamento, temperatura, alerta_risco, observacoes, bot_auth_token, data_manual
    } = req.body;

    // Segurança básica
    const SECRET_BOT_TOKEN = "csm_bot_secure_123";
    if (bot_auth_token !== SECRET_BOT_TOKEN) {
        console.warn("Token do Bot inválido.");
        return res.status(403).json({ error: "Acesso não autorizado pelo Bot." });
    }

    // Se o bot enviar data_manual (AAAA-MM-DD), usamos, senão usamos Agora
    const data = data_manual ? new Date(data_manual).toISOString() : new Date().toISOString();

    const sql = `INSERT INTO activities (
        data, contract_id, responsavel_atendimento, tipo_entrega, 
        status_entrega, engajamento, temperatura, alerta_risco, observacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
        data, cliente_id, responsavel_atendimento, tipo_entrega,
        status_entrega, engajamento, temperatura, alerta_risco, observacoes
    ], function (err) {
        if (err) {
            console.error("Erro ao inserir na DB via Bot:", err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log("Atividade inserida com sucesso via Bot. ID:", this.lastID);
        res.status(201).json({ success: true, id: this.lastID });
    });
});



const { processBQImport } = require('./import_bq');
app.post('/api/import-bq', processBQImport);

app.get('/api/activities', (req, res) => {
    const query = `
        SELECT a.*, c.cliente 
        FROM activities a
        JOIN contracts c ON a.contract_id = c.id
        ORDER BY a.data DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/activities', checkEditor, (req, res) => {
    const {
        data, contract_id, responsavel_atendimento, tipo_entrega,
        status_entrega, engajamento, temperatura, alerta_risco, observacoes
    } = req.body;

    const sql = `INSERT INTO activities (
        data, contract_id, responsavel_atendimento, tipo_entrega, 
        status_entrega, engajamento, temperatura, alerta_risco, observacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
        data, contract_id, responsavel_atendimento, tipo_entrega,
        status_entrega, engajamento, temperatura, alerta_risco, observacoes
    ], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID });
    });
});

// --- Painel de Controlo (Dashboard) API ---
// Cruzar 'Contratado' vs. 'Realizado' em tempo real
app.get('/api/dashboard', (req, res) => {
    // Para simplificar a lógica na view e cruzar os targets com o realizado, 
    // devolvemos um array de "Serviços por Cliente"
    const query = `
        SELECT 
            c.id as contract_id,
            c.cliente,
            c.responsavel_cs,
            c.workshop_target,
            c.assessment_target,
            c.treinamento_target,
            c.maps_report_target,
            c.suporte_target,
            c.proposta_tecnica_target,
            (SELECT COUNT(*) FROM activities a WHERE a.contract_id = c.id AND a.tipo_entrega = 'Workshop' AND a.status_entrega = 'Sucesso') as workshop_realizado,
            (SELECT COUNT(*) FROM activities a WHERE a.contract_id = c.id AND a.tipo_entrega = 'Assessment' AND a.status_entrega = 'Sucesso') as assessment_realizado,
            (SELECT COUNT(*) FROM activities a WHERE a.contract_id = c.id AND a.tipo_entrega = 'Treinamento' AND a.status_entrega = 'Sucesso') as treinamento_realizado,
            (SELECT COUNT(*) FROM activities a WHERE a.contract_id = c.id AND a.tipo_entrega = 'Maps Report' AND a.status_entrega = 'Sucesso') as maps_report_realizado,
            (SELECT COUNT(*) FROM activities a WHERE a.contract_id = c.id AND a.tipo_entrega = 'Suporte' AND a.status_entrega = 'Sucesso') as suporte_realizado,
            (SELECT COUNT(*) FROM activities a WHERE a.contract_id = c.id AND a.tipo_entrega = 'Proposta técnica' AND a.status_entrega = 'Sucesso') as proposta_tecnica_realizado,
            (SELECT MAX(data) FROM activities a WHERE a.contract_id = c.id) as ultima_atividade,
            (SELECT alerta_risco FROM activities a WHERE a.contract_id = c.id ORDER BY data DESC LIMIT 1) as ultimo_alerta_risco,
            (SELECT COUNT(*) FROM activities a WHERE a.contract_id = c.id AND a.status_entrega = 'No-show') as total_no_shows
        FROM contracts c
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/dashboard/stats', (req, res) => {
    const stats = {};

    // Average Engagement
    const avgEngQuery = `SELECT AVG(engajamento) as avg_engagement FROM activities WHERE engajamento IS NOT NULL`;

    // Risk Accounts (last 30 days)
    const riskCountQuery = `SELECT COUNT(DISTINCT contract_id) as risk_count FROM activities WHERE alerta_risco IS NOT NULL AND alerta_risco != '' AND alerta_risco != 'Nenhum (Tudo certo)' AND data >= date('now', '-30 days')`;

    // Alert Ranking
    const alertRankingQuery = `SELECT alerta_risco as tipo, COUNT(*) as total FROM activities WHERE alerta_risco IS NOT NULL AND alerta_risco != '' AND alerta_risco != 'Nenhum (Tudo certo)' GROUP BY alerta_risco ORDER BY total DESC`;

    db.get(avgEngQuery, [], (err, avgRow) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.avgEngagement = avgRow.avg_engagement || 0;

        db.get(riskCountQuery, [], (err, riskRow) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.riskAccountCount = riskRow.risk_count || 0;

            db.all(alertRankingQuery, [], (err, alertRows) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.alertRanking = alertRows;
                res.json(stats);
            });
        });
    });
});

// --- Serve Static Frontend (for production/cloud deploy) ---
const path = require('path');
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
