import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

const SERVICOS_MAP = {
    'Workshop': { target: 'workshop_target', realized: 'workshop_realizado' },
    'Assessment': { target: 'assessment_target', realized: 'assessment_realizado' },
    'Treinamento': { target: 'treinamento_target', realized: 'treinamento_realizado' },
    'Maps Report': { target: 'maps_report_target', realized: 'maps_report_realizado' },
    'Suporte': { target: 'suporte_target', realized: 'suporte_realizado' },
    'Proposta técnica': { target: 'proposta_tecnica_target', realized: 'proposta_tecnica_realizado' }
};

export default function ClientDashboard() {
    const [dashboardData, setDashboardData] = useState([]);
    const [allActivities, setAllActivities] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [dashRes, actRes] = await Promise.all([
                axios.get(`${API_URL}/dashboard`),
                axios.get(`${API_URL}/activities`)
            ]);
            setDashboardData(dashRes.data);
            setAllActivities(actRes.data);
            if (dashRes.data.length > 0) {
                setSelectedClientId(dashRes.data[0].contract_id.toString());
            }
        } catch (error) {
            console.error('Error fetching client dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClientChange = (e) => {
        setSelectedClientId(e.target.value);
    };

    const getStatusInfo = (realized, target, clientTotalRealized, isPropostaTecnica, hasTarget) => {
        let statusLabel = 'Em andamento';
        let statusClass = 'badge-warning';

        const isConcluido = isPropostaTecnica
            ? (realized > 0 && hasTarget)
            : (realized >= target && target > 0);

        if (isConcluido) {
            statusLabel = 'Concluído';
            statusClass = 'badge-success';
        } else if (clientTotalRealized === 0) {
            statusLabel = 'Sem atendimento';
            statusClass = 'badge-danger';
        } else if (realized === 0) {
            statusLabel = 'Pendente';
            statusClass = 'badge-neutral';
        }
        return { statusLabel, statusClass };
    };

    // Build the consolidated table rows for the selected client
    const buildClientRows = () => {
        if (!selectedClientId) return [];

        const clientDash = dashboardData.find(c => c.contract_id.toString() === selectedClientId);
        if (!clientDash) return [];

        const clientActs = allActivities.filter(a => a.contract_id.toString() === selectedClientId);

        const clientTotalRealized = clientDash.workshop_realizado + clientDash.assessment_realizado + clientDash.treinamento_realizado + clientDash.maps_report_realizado + clientDash.suporte_realizado + clientDash.proposta_tecnica_realizado;

        // We will show a row for EVERY activity belonging to this client.
        const rows = clientActs.map(act => {
            const servicoNome = act.tipo_entrega;
            const fields = SERVICOS_MAP[servicoNome];

            // If the service somehow doesn't exist in map (shouldn't happen), fallback logic
            const target = fields ? clientDash[fields.target] : 0;
            const realized = fields ? clientDash[fields.realized] : 0;

            const isPropostaTecnica = servicoNome === 'Proposta técnica';
            const hasTarget = isPropostaTecnica ? (target && typeof target === 'string' && target.trim() !== '') : (Number(target) > 0);

            const { statusLabel, statusClass } = getStatusInfo(realized, target, clientTotalRealized, isPropostaTecnica, hasTarget);

            const isAbaixo20Percent = isPropostaTecnica ? false : (target > 0 && ((realized / target) * 100) < 20);
            const isAtençao = isAbaixo20Percent || act.alerta_risco !== 'Nenhum (Tudo certo)' || clientDash.total_no_shows > 0;

            return {
                id: act.id,
                responsavelCS: clientDash.responsavel_cs || 'Não Definido',
                servico: servicoNome,
                quantidade: isPropostaTecnica ? (hasTarget ? 'Link Adicionado' : 'Não') : target,
                linkProposta: isPropostaTecnica && hasTarget ? target : null,
                realizado: realized,
                statusLabel,
                statusClass,
                data: new Date(act.data).toLocaleDateString(),
                responsavelAtendimento: act.responsavel_atendimento,
                isAtençao,
                temperatura: act.temperatura,
                alerta: act.alerta_risco,
                observacoes: act.observacoes
            };
        });

        return rows;
    };

    const rows = buildClientRows();

    // Find CX Responsável for selected client
    const currentCx = dashboardData.find(c => c.contract_id.toString() === selectedClientId)?.responsavel_cs || 'Não Definido';

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>Dashboard Individual</h2>
                    <p>Visão detalhada e histórico de atendimento por cliente</p>
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'var(--surface)', borderRadius: '8px', width: 'fit-content', border: '1px solid var(--border)' }}>
                        <User size={16} className="text-primary" />
                        <span style={{ color: 'var(--text-muted)' }}>CX Responsável:</span>
                        <span style={{ fontWeight: 600 }}>{currentCx}</span>
                    </div>
                </div>

                <div style={{ minWidth: '350px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Selecione o Cliente</label>
                    <select
                        value={selectedClientId}
                        onChange={handleClientChange}
                        className="form-control"
                        style={{ backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)', color: 'var(--text-main)' }}
                    >
                        {dashboardData.map(c => (
                            <option key={c.contract_id} value={c.contract_id} style={{ color: 'var(--text-main)', backgroundColor: 'var(--bg-dark)' }}>
                                {c.cliente}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="glass-panel data-table-container">
                {loading ? (
                    <p>A carregar informações...</p>
                ) : (
                    <table className="data-table" style={{ fontSize: '0.9rem' }}>
                        <thead>
                            <tr>
                                <th>Serviço</th>
                                <th>Quantidade</th>
                                <th>Realizado</th>
                                <th>Status</th>
                                <th>Data</th>
                                <th>Responsável</th>
                                <th>Alerta de Risco?</th>
                                <th>Temperatura</th>
                                <th>Alerta</th>
                                <th>Observações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} style={{
                                    backgroundColor: row.isAtençao ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                                    borderLeft: row.isAtençao ? '3px solid #ef4444' : 'none'
                                }}>
                                    <td style={{ fontWeight: 500 }}>{row.servico}</td>
                                    <td>
                                        {row.linkProposta ? (
                                            <a href={row.linkProposta} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Ver Link</a>
                                        ) : (
                                            row.quantidade
                                        )}
                                    </td>
                                    <td>{row.realizado}</td>
                                    <td><span className={`badge ${row.statusClass}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>{row.statusLabel}</span></td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{row.data}</td>
                                    <td>{row.responsavelAtendimento}</td>
                                    <td>
                                        {row.isAtençao ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                                                <AlertCircle size={14} /> Em Risco
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                                                <CheckCircle2 size={14} /> Saudável
                                            </div>
                                        )}
                                    </td>
                                    <td><span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>{row.temperatura}</span></td>
                                    <td>
                                        {row.alerta !== 'Nenhum (Tudo certo)' ? (
                                            <span style={{ color: '#ef4444', fontWeight: 500 }}>{row.alerta}</span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.observacoes}>
                                        {row.observacoes || '-'}
                                    </td>
                                </tr>
                            ))}

                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: 'center', padding: '32px' }}>
                                        Nenhuma atividade registada para este cliente.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
