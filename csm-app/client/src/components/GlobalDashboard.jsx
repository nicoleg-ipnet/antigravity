import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2, Users, Info, BarChart3, Activity, Clock, Star } from 'lucide-react';
import API_URL from '../config';

const SERVICOS_MAP = {
    'Workshop': { target: 'workshop_target', realized: 'workshop_realizado', color: '#6366f1' },
    'Assessment': { target: 'assessment_target', realized: 'assessment_realizado', color: '#10b981' },
    'Treinamento': { target: 'treinamento_target', realized: 'treinamento_realizado', color: '#f59e0b' },
    'Maps Report': { target: 'maps_report_target', realized: 'maps_report_realizado', color: '#ec4899' },
    'Suporte': { target: 'suporte_target', realized: 'suporte_realizado', color: '#8b5cf6' }
};

export default function GlobalDashboard() {
    const [data, setData] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalClients: 0,
        clientsServed: 0,
        totalRealized: 0,
        totalPlanned: 0,
        avgEngagement: 0,
        riskAccountCount: 0,
        alertRanking: []
    });

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const [dashboardRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/dashboard`),
                axios.get(`${API_URL}/dashboard/stats`)
            ]);

            const rawData = dashboardRes.data;
            const apiStats = statsRes.data;

            setData(rawData);
            processChartData(rawData);
            calculateStats(rawData, apiStats);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const processChartData = (rawData) => {
        const aggregated = Object.keys(SERVICOS_MAP).map(servico => {
            const fields = SERVICOS_MAP[servico];
            let previstoTotal = 0;
            let realizadoTotal = 0;

            rawData.forEach(client => {
                const targetValue = client[fields.target];
                const realizedValue = client[fields.realized];

                previstoTotal += (Number(targetValue) || 0);
                realizadoTotal += (Number(realizedValue) || 0);
            });

            return {
                name: servico,
                Previsto: previstoTotal,
                Realizado: realizadoTotal
            };
        });

        setChartData(aggregated);
    };
    const getPieData = () => {
        return chartData.filter(d => d.Realizado > 0).map(d => ({
            name: d.name,
            value: d.Realizado,
            color: SERVICOS_MAP[d.name].color
        }));
    };

    const calculateStats = (rawData, apiStats) => {
        const totalClients = rawData.length;
        const clientsServed = rawData.filter(c =>
            (c.workshop_realizado + c.assessment_realizado + c.treinamento_realizado +
                c.maps_report_realizado + c.suporte_realizado) > 0
        ).length;

        const totalRealized = rawData.reduce((acc, c) =>
            acc + c.workshop_realizado + c.assessment_realizado + c.treinamento_realizado +
            c.maps_report_realizado + c.suporte_realizado, 0
        );

        const totalPlanned = rawData.reduce((acc, c) => {
            return acc + (c.workshop_target || 0) + (c.assessment_target || 0) + (c.treinamento_target || 0) +
                (c.maps_report_target || 0) + (c.suporte_target || 0);
        }, 0);

        setStats({
            totalClients,
            clientsServed,
            totalRealized,
            totalPlanned,
            avgEngagement: apiStats.avgEngagement,
            riskAccountCount: apiStats.riskAccountCount,
            alertRanking: apiStats.alertRanking
        });
    };

    const deliveryRate = stats.totalPlanned > 0 ? (stats.totalRealized / stats.totalPlanned) * 100 : 0;
    const isRateLow = deliveryRate < 40;

    // Top 5 sumidos (sorted by date ascending, nulls first)
    const topSumidos = [...data]
        .sort((a, b) => {
            if (!a.ultima_atividade && !b.ultima_atividade) return 0;
            if (!a.ultima_atividade) return -1;
            if (!b.ultima_atividade) return 1;
            return new Date(a.ultima_atividade) - new Date(b.ultima_atividade);
        })
        .slice(0, 5);

    return (
        <div className="global-dashboard">
            <div className="page-header">
                <h2>Dashboard Executivo</h2>
                <p>Visão consolidada de entregas e saúde da base</p>
            </div>

            <div className="dash-grid" style={{ marginBottom: '32px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="glass-panel alert-card" style={{ borderLeftColor: '#6366f1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Users style={{ color: '#6366f1' }} size={24} />
                        <div>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Base de Clientes</h4>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                {stats.totalClients} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ {stats.clientsServed} atendidos</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel alert-card" style={{ borderLeftColor: isRateLow ? '#ef4444' : '#10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <TrendingUp style={{ color: isRateLow ? '#ef4444' : '#10b981' }} size={24} />
                        <div>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Taxa de Entrega Global</h4>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: isRateLow ? '#ef4444' : 'inherit' }}>
                                {deliveryRate.toFixed(1)}%
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                (Realizado / Previsto Total)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel alert-card" style={{ borderLeftColor: stats.riskAccountCount > 0 ? '#ef4444' : '#10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertTriangle style={{ color: stats.riskAccountCount > 0 ? '#ef4444' : '#10b981' }} size={24} />
                        <div>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Contas em Risco</h4>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.riskAccountCount}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Clientes com alertas recentes
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel alert-card" style={{ borderLeftColor: '#f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Star style={{ color: '#f59e0b' }} size={24} />
                        <div>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Engajamento Médio</h4>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{Number(stats.avgEngagement).toFixed(1)} / 5</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Média de feedback dos clientes
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 1: Bar Chart (Full Width) */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <BarChart3 size={20} className="text-primary" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Entregas Contratuais (Global)</h3>
                </div>

                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)' }}
                                itemStyle={{ fontSize: '12px' }}
                            />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }} />
                            <Bar dataKey="Previsto" name="Previsto" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="Realizado" name="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Row 2: Donut Chart + Alert Ranking */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', marginBottom: '32px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Activity size={20} style={{ color: 'var(--primary)' }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Distribuição de Entregas</h3>
                    </div>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={getPieData()}
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {getPieData().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)' }}
                                />
                                <Legend layout="vertical" align="right" verticalAlign="middle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Ranking de Alertas</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {stats.alertRanking.map((alert, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <span style={{ fontSize: '0.9rem' }}>{alert.tipo}</span>
                                <span className="badge badge-danger" style={{ minWidth: '35px', textAlign: 'center' }}>{alert.total}x</span>
                            </div>
                        ))}
                        {stats.alertRanking.length === 0 && <p className="text-muted" style={{ fontSize: '0.9rem' }}>Nenhum alerta registado.</p>}
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <Clock size={20} style={{ color: '#f59e0b' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Atenção Imediata: Top 5 Clientes Sumidos</h3>
                </div>
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Última Atividade</th>
                                <th>Status de Risco</th>
                                <th>Ação Sugerida</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topSumidos.map((client, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 600 }}>{client.cliente}</td>
                                    <td>{client.ultima_atividade ? new Date(client.ultima_atividade).toLocaleDateString() : 'Sem registros'}</td>
                                    <td>
                                        <span className={`badge ${client.ultimo_alerta_risco && client.ultimo_alerta_risco !== 'Nenhum (Tudo certo)' ? 'badge-danger' : 'badge-warning'}`}>
                                            {client.ultimo_alerta_risco || (client.ultima_atividade ? 'Sem Alerta Recente' : 'Sem contato')}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}>
                                            Agendar Reunião
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
