import axios from 'axios';
import { Plus, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import { useState, useEffect } from 'react';

export default function Contracts() {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const { isEditor } = useAuth();

    const [formData, setFormData] = useState({
        cliente: '',
        responsavel_cs: '',
        workshop_target: 0,
        assessment_target: 0,
        treinamento_target: 0,
        maps_report_target: 0,
        suporte_target: 0,
        proposta_tecnica_target: '',
        freshservice_dept: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        try {
            const response = await axios.get(`${API_URL}/contracts`);
            setContracts(response.data);
        } catch (error) {
            console.error('Error fetching contracts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value) || 0 : value
        }));
    };

    const handleEditClick = (contract) => {
        setFormData({
            cliente: contract.cliente,
            responsavel_cs: contract.responsavel_cs || '',
            workshop_target: contract.workshop_target,
            assessment_target: contract.assessment_target,
            treinamento_target: contract.treinamento_target,
            maps_report_target: contract.maps_report_target,
            suporte_target: contract.suporte_target,
            proposta_tecnica_target: contract.proposta_tecnica_target || '',
            freshservice_dept: contract.freshservice_dept || ''
        });
        setEditingId(contract.id);
        setShowForm(true);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({
            cliente: '',
            responsavel_cs: '',
            workshop_target: 0,
            assessment_target: 0,
            treinamento_target: 0,
            maps_report_target: 0,
            suporte_target: 0,
            proposta_tecnica_target: '',
            freshservice_dept: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await axios.put(`${API_URL}/contracts/${editingId}`, formData);
            } else {
                await axios.post(`${API_URL}/contracts`, formData);
            }
            // reset form & refresh list
            handleCancelForm();
            fetchContracts();
        } catch (error) {
            console.error('Error saving contract:', error);
            alert('Erro ao salvar contrato: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>Contratos & Metas</h2>
                    <p>Listagem de clientes e respetivos targets de serviços</p>
                </div>
                {isEditor && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <Plus size={18} />
                        {showForm ? 'Cancelar' : 'Novo Contrato'}
                    </button>
                )}
            </div>

            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '24px' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(200px, 1fr)', gap: '20px', marginBottom: '20px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Nome do Cliente *</label>
                                <input
                                    type="text"
                                    name="cliente"
                                    value={formData.cliente}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    required
                                    placeholder="Ex: Minha Empresa SA"
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>CX Responsável</label>
                                <input
                                    type="text"
                                    name="responsavel_cs"
                                    value={formData.responsavel_cs}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label>Departamento no Freshservice (Mapeamento)</label>
                            <input
                                type="text"
                                name="freshservice_dept"
                                value={formData.freshservice_dept}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="Ex: Secretaria de Saúde (Nome exato do Freshservice)"
                            />
                            <small style={{ color: 'var(--text-muted)' }}>Utilizado para associar tickets automáticos a este contrato.</small>
                        </div>

                        <h4 style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Metas de Serviços Contratados (Quantidade)</h4>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                            {[
                                { id: 'workshop_target', label: 'Workshop' },
                                { id: 'assessment_target', label: 'Assessment' },
                                { id: 'treinamento_target', label: 'Treinamento' },
                                { id: 'maps_report_target', label: 'Maps Report' },
                                { id: 'suporte_target', label: 'Suporte' }
                            ].map(servico => (
                                <div className="form-group" key={servico.id} style={{ marginBottom: 0 }}>
                                    <label>{servico.label}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        name={servico.id}
                                        value={formData[servico.id]}
                                        onChange={handleInputChange}
                                        className="form-control"
                                    />
                                </div>
                            ))}

                            <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                                <label>Proposta Técnica (Link do Documento)</label>
                                <input
                                    type="text"
                                    name="proposta_tecnica_target"
                                    value={formData.proposta_tecnica_target}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="Ex: https://docs.google.com/..."
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button type="button" className="btn" onClick={handleCancelForm} style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'A salvar...' : (editingId ? 'Atualizar Contrato' : 'Salvar Contrato')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="glass-panel data-table-container">
                {loading ? (
                    <p>A carregar contratos...</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>CX Responsável</th>
                                <th>Workshop</th>
                                <th>Assessment</th>
                                <th>Treinamento</th>
                                <th>Maps Report</th>
                                <th>Suporte</th>
                                <th>Proposta Técnica</th>
                                <th>Depto. Freshservice</th>
                                <th style={{ textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contracts.map((contract) => (
                                <tr key={contract.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{contract.cliente}</td>
                                    <td>{contract.responsavel_cs || 'Não atribuído'}</td>
                                    <td>{contract.workshop_target}</td>
                                    <td>{contract.assessment_target}</td>
                                    <td>{contract.treinamento_target}</td>
                                    <td>{contract.maps_report_target}</td>
                                    <td>{contract.suporte_target}</td>
                                    <td>
                                        {contract.proposta_tecnica_target && contract.proposta_tecnica_target !== '0' && contract.proposta_tecnica_target !== 0 ? (
                                            <a href={contract.proposta_tecnica_target} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Ver Link</a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td>{contract.freshservice_dept || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {isEditor && (
                                            <button
                                                onClick={() => handleEditClick(contract)}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                                title="Editar Contrato"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        )}
                                        {!isEditor && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Apenas leitura</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
