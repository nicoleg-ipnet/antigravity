import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

export default function ActivityLog() {
    const [activities, setActivities] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { isEditor } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        data: new Date().toISOString().split('T')[0],
        contract_id: '',
        responsavel_atendimento: 'Caio Henrique',
        tipo_entrega: 'Workshop',
        status_entrega: 'Sucesso',
        engajamento: 5,
        temperatura: 'Normal',
        alerta_risco: 'Nenhum (Tudo certo)',
        observacoes: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [actRes, contRes] = await Promise.all([
                axios.get(`${API_URL}/activities`),
                axios.get(`${API_URL}/contracts`)
            ]);
            setActivities(actRes.data);
            setContracts(contRes.data);

            if (contRes.data.length > 0) {
                setFormData(prev => ({ ...prev, contract_id: contRes.data[0].id }));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/activities`, formData);
            // Refresh list
            const response = await axios.get(`${API_URL}/activities`);
            setActivities(response.data);
            alert('Atividade registada com sucesso!');

            // Reset some fields
            setFormData({
                ...formData,
                observacoes: '',
            });
        } catch (error) {
            console.error('Error submitting activity:', error);
            alert('Erro ao registar atividade.');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Sucesso': return 'badge-success';
            case 'No-show': return 'badge-danger';
            case 'Reagendado': return 'badge-warning';
            default: return 'badge-neutral';
        }
    };

    return (
        <div>
            <div className="page-header">
                <h2>Log de Atividades</h2>
                <p>Registo de interações e entregas de equipa</p>
            </div>

            {isEditor ? (
                <div className="glass-panel" style={{ marginBottom: '32px' }}>
                    <h3 style={{ marginBottom: '24px', fontSize: '1.2rem' }}>Nova Atividade</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className="form-group">
                            <label>Data</label>
                            <input type="date" name="data" value={formData.data} onChange={handleInputChange} className="form-control" required />
                        </div>

                        <div className="form-group">
                            <label>Cliente</label>
                            <select name="contract_id" value={formData.contract_id} onChange={handleInputChange} className="form-control" required>
                                {contracts.map(c => (
                                    <option key={c.id} value={c.id}>{c.cliente}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Responsável pelo Atendimento</label>
                            <select name="responsavel_atendimento" value={formData.responsavel_atendimento} onChange={handleInputChange} className="form-control" required>
                                <option value="Caio Henrique">Caio Henrique</option>
                                <option value="Nicole Guimarães">Nicole Guimarães</option>
                                <option value="Thiago Alves">Thiago Alves</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Tipo de Entrega</label>
                            <select name="tipo_entrega" value={formData.tipo_entrega} onChange={handleInputChange} className="form-control">
                                <option value="Workshop">Workshop</option>
                                <option value="Assessment">Assessment</option>
                                <option value="Treinamento">Treinamento</option>
                                <option value="Maps Report">Maps Report</option>
                                <option value="Suporte">Suporte</option>
                                <option value="Proposta técnica">Proposta técnica</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Status da Entrega</label>
                            <select name="status_entrega" value={formData.status_entrega} onChange={handleInputChange} className="form-control">
                                <option value="Sucesso">Sucesso</option>
                                <option value="No-show">No-show</option>
                                <option value="Reagendado">Reagendado</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Engajamento</label>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '100%', paddingTop: '10px' }}>
                                {[1, 2, 3, 4, 5].map(num => (
                                    <label key={num} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', margin: 0, color: 'var(--text-main)' }}>
                                        <input
                                            type="radio"
                                            name="engajamento"
                                            value={num}
                                            checked={formData.engajamento == num}
                                            onChange={handleInputChange}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        {num}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Temperatura</label>
                            <select name="temperatura" value={formData.temperatura} onChange={handleInputChange} className="form-control">
                                <option value="Baixa">Baixa</option>
                                <option value="Normal">Normal</option>
                                <option value="Alta">Alta</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Alerta de Risco</label>
                            <select name="alerta_risco" value={formData.alerta_risco} onChange={handleInputChange} className="form-control">
                                <option value="Nenhum (Tudo certo)">Nenhum (Tudo certo)</option>
                                <option value="Risco de cancelamento do serviço">Risco de cancelamento do serviço</option>
                                <option value="Insatisfação com o produto/API">Insatisfação com o produto/API</option>
                                <option value="Dificuldade de contato / Sumiço">Dificuldade de contato / Sumiço</option>
                                <option value="Cliente sem suporte">Cliente sem suporte</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Observações</label>
                            <textarea name="observacoes" value={formData.observacoes} onChange={handleInputChange} className="form-control" rows="3"></textarea>
                        </div>

                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn btn-primary">Gravar Interação</button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="glass-panel" style={{ marginBottom: '32px', padding: '24px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Você está em modo de visualização. Apenas editores podem registar novas atividades.</p>
                </div>
            )}

            <div className="glass-panel data-table-container">
                <h3 style={{ marginBottom: '24px', fontSize: '1.2rem' }}>Histórico</h3>
                {loading ? (
                    <p>A carregar histórico...</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Cliente</th>
                                <th>Responsável</th>
                                <th>Serviço</th>
                                <th>Status</th>
                                <th>Temperatura</th>
                                <th>Alerta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activities.map((act) => (
                                <tr key={act.id}>
                                    <td>{new Date(act.data).toLocaleDateString()}</td>
                                    <td style={{ fontWeight: 600 }}>{act.cliente}</td>
                                    <td>{act.responsavel_atendimento}</td>
                                    <td>{act.tipo_entrega}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(act.status_entrega)}`}>
                                            {act.status_entrega}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge badge-neutral">{act.temperatura}</span>
                                    </td>
                                    <td>
                                        {act.alerta_risco !== 'Nenhum (Tudo certo)' ? (
                                            <span className="badge badge-danger">{act.alerta_risco}</span>
                                        ) : (
                                            <span className="badge badge-neutral">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {activities.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>Sem atividades registadas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div >
    );
}
