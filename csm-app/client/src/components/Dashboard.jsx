import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react';
import API_URL from '../config';

const SERVICOS_MAP = {
    'Workshop': { target: 'workshop_target', realized: 'workshop_realizado' },
    'Assessment': { target: 'assessment_target', realized: 'assessment_realizado' },
    'Treinamento': { target: 'treinamento_target', realized: 'treinamento_realizado' },
    'Maps Report': { target: 'maps_report_target', realized: 'maps_report_realizado' },
    'Suporte': { target: 'suporte_target', realized: 'suporte_realizado' },
    'Proposta técnica': { target: 'proposta_tecnica_target', realized: 'proposta_tecnica_realizado' }
};

export default function Dashboard() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await axios.get(`${API_URL}/dashboard`);
            setData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // Convert raw client rows into individual service rows for the table
    const generateTableRows = () => {
        const rows = [];
        data.forEach(client => {
            const ultimoAlertaRisco = client.ultimo_alerta_risco || 'Nenhum (Tudo certo)';
            const temAlertaRisco = ultimoAlertaRisco !== 'Nenhum (Tudo certo)';

            const clientTotalRealized = client.workshop_realizado + client.assessment_realizado + client.treinamento_realizado + client.maps_report_realizado + client.suporte_realizado + client.proposta_tecnica_realizado;

            Object.entries(SERVICOS_MAP).forEach(([servicoNome, fields]) => {
                const target = client[fields.target];
                const realized = client[fields.realized];

                const isPropostaTecnica = servicoNome === 'Proposta técnica';
                const hasTarget = isPropostaTecnica ? (target && typeof target === 'string' && target.trim() !== '') : (Number(target) > 0);

                // Only show services that are contracted or have activities
                if (hasTarget || realized > 0) {
                    let percent = 100;
                    if (!isPropostaTecnica && target > 0) {
                        percent = (realized / target) * 100;
                    } else if (isPropostaTecnica && hasTarget) {
                        percent = realized > 0 ? 100 : 0;
                    }

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
                        statusClass = 'badge-danger'; // Vermelho
                    } else if (realized === 0) {
                        statusLabel = 'Pendente';
                        statusClass = 'badge-neutral';
                    }

                    const isAbaixo20Percent = isPropostaTecnica ? false : (target > 0 && percent < 20);
                    const isAtençao = isAbaixo20Percent || temAlertaRisco || client.total_no_shows > 0;

                    rows.push({
                        id: `${client.contract_id}-${servicoNome}`,
                        cliente: client.cliente,
                        servico: servicoNome,
                        quantidade: isPropostaTecnica ? (hasTarget ? 'Link Adicionado' : 'Não') : target,
                        realizado: realized,
                        statusLabel,
                        statusClass,
                        isAtençao,
                        isAbaixo20Percent,
                        ultimoAlertaRisco,
                        noShows: client.total_no_shows
                    });
                }
            });
        });
        return rows;
    };

    const tableRows = generateTableRows();

    // Pre-calculate how many rows each client has to set rowSpan properly
    const clientRowCounts = {};
    tableRows.forEach(row => {
        clientRowCounts[row.cliente] = (clientRowCounts[row.cliente] || 0) + 1;
    });

    return (
        <div>
            <div className="page-header">
                <h2>Painel de Controlo</h2>
                <p>Monitorização em tempo real do Contratado vs. Realizado</p>
            </div>

            <div className="dash-grid" style={{ marginBottom: '32px' }}>
                <div className="glass-panel alert-card" style={{ borderLeftColor: 'var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Users className="text-primary" style={{ color: 'var(--primary)' }} size={24} />
                        <div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Cobertura de Clientes</h3>
                            <p className="text-muted" style={{ color: 'var(--text-muted)' }}>
                                {data.filter(c => (c.workshop_realizado + c.assessment_realizado + c.treinamento_realizado + c.maps_report_realizado + c.suporte_realizado + c.proposta_tecnica_realizado) > 0).length} de {data.length} Clientes Atendidos
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel alert-card critical">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertCircle className="text-danger" style={{ color: '#ef4444' }} size={24} />
                        <div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>No-shows</h3>
                            <p className="text-muted" style={{ color: 'var(--text-muted)' }}>
                                {data.reduce((acc, curr) => acc + curr.total_no_shows, 0)} Ocorrências
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel data-table-container">
                {loading ? (
                    <p>A carregar painel...</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Serviço</th>
                                <th>Quantidade</th>
                                <th>Realizado</th>
                                <th>Status</th>
                                <th>Alerta de Risco?</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableRows.map((row, index) => {
                                // Determine if this is the first row for the given client
                                const isFirstServiceForClient = index === 0 || tableRows[index - 1].cliente !== row.cliente;
                                const rowSpanCount = clientRowCounts[row.cliente];

                                return (
                                    <tr key={row.id} style={{
                                        backgroundColor: row.isAtençao ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                                        borderLeft: row.isAtençao ? '4px solid #ef4444' : 'none',
                                        borderTop: isFirstServiceForClient && index !== 0 ? '1px solid var(--border)' : 'none'
                                    }}>
                                        {isFirstServiceForClient && (
                                            <td rowSpan={rowSpanCount} style={{
                                                fontWeight: 600,
                                                textAlign: 'center',
                                                verticalAlign: 'middle',
                                                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                                                backgroundColor: 'rgba(255, 255, 255, 0.02)'
                                            }}>
                                                {row.cliente}
                                            </td>
                                        )}
                                        <td>{row.servico}</td>
                                        <td>{row.quantidade}</td>
                                        <td>{row.realizado}</td>
                                        <td>
                                            <span className={`badge ${row.statusClass}`}>
                                                {row.statusLabel}
                                            </span>
                                        </td>
                                        <td>
                                            {row.isAtençao ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#ef4444' }}>
                                                    {row.isAbaixo20Percent && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <AlertCircle size={14} />
                                                            <span style={{ fontSize: '0.85rem' }}>Atenção: &lt; 20% Realizado</span>
                                                        </div>
                                                    )}
                                                    {row.ultimoAlertaRisco !== 'Nenhum (Tudo certo)' && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <AlertCircle size={14} />
                                                            <span style={{ fontSize: '0.85rem' }}>Alerta: {row.ultimoAlertaRisco}</span>
                                                        </div>
                                                    )}
                                                    {row.noShows > 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <AlertCircle size={14} />
                                                            <span style={{ fontSize: '0.85rem' }}>Atenção: {row.noShows} No-show(s)</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                                                    <CheckCircle2 size={16} />
                                                    <span style={{ fontSize: '0.85rem' }}>Saudável</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}

                            {tableRows.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>
                                        Nenhum contrato ou dado de serviço encontrado.
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
