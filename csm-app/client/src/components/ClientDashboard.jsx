import { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';

// ─── Paleta IPNET + Google Maps ───────────────────────────────────────────────
const C = {
  purple:     '#660099',
  purpleBg:   '#f3e5ff',
  purpleLight:'#BD4AFF',
  lime:       '#DAFF71',
  darkGreen:  '#1A351F',
  midGreen:   '#315932',
  success:    '#34A853',
  successBg:  '#dcfce7',
  warning:    '#FBBC04',
  warningBg:  '#fef9c3',
  danger:     '#EA4335',
  dangerBg:   '#fee2e2',
  blue:       '#4285F4',
  blueBg:     '#e8f0fe',
};

// ─── Mapeamento de Serviços ────────────────────────────────────────────────────
const SERVICES = [
  { tipoEntrega: 'Suporte',          target: 'suporte_target',         label: 'Suporte',         color: C.purple,      bg: C.purpleBg      },
  { tipoEntrega: 'Maps Report',      target: 'maps_report_target',     label: 'Maps Report',     color: C.purpleLight,  bg: '#f5e6ff'       },
  { tipoEntrega: 'Workshop',         target: 'workshop_target',        label: 'Workshop',        color: C.blue,         bg: C.blueBg        },
  { tipoEntrega: 'Assessment',       target: 'assessment_target',      label: 'Assessment',      color: C.success,      bg: C.successBg     },
  { tipoEntrega: 'Treinamento',      target: 'treinamento_target',     label: 'Treinamento',     color: '#0f766e',      bg: '#f0fdfa'       },
  { tipoEntrega: 'Proposta técnica', target: 'proposta_tecnica_target', label: 'Prop. Técnica',  color: '#c2410c',      bg: '#fff7ed'       },
];

// ─── Dados Estáticos (TODO: Limpar após validação completa) ───────────────────
// MOCK Removido: O fluxo agora utiliza informações vitais vindas diretamente do DBM.

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusConfig(status) {
  if (status === 'Sucesso') return { color: C.success, bg: C.successBg, icon: '✅' };
  if (status === 'No-show') return { color: C.danger, bg: C.dangerBg, icon: '❌' };
  if (status === 'Reagendado') return { color: C.warning, bg: C.warningBg, icon: '🔄' };
  return { color: '#6b7280', bg: '#f3f4f6', icon: '•' };
}

function alertaBadge(alerta) {
  if (!alerta || alerta === 'Nenhum (Tudo certo)') return null;
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, color: C.danger,
      background: C.dangerBg, padding: '2px 7px', borderRadius: '4px',
      border: `1px solid ${C.danger}30`,
    }}>
      ⚠️ {alerta}
    </span>
  );
}

function tempBadge(temp) {
  if (!temp) return null;
  const map = { 'Alta': [C.danger, C.dangerBg], 'Quente': [C.danger, C.dangerBg], 'Normal': [C.blue, C.blueBg], 'Bom': [C.blue, C.blueBg], 'Baixa': ['#6b7280', '#f3f4f6'], 'Fria': ['#6b7280', '#f3f4f6'] };
  const [color, bg] = map[temp] || ['#6b7280', '#f3f4f6'];
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 700, color, background: bg, padding: '2px 7px', borderRadius: '4px', border: `1px solid ${color}30` }}>
      {temp}
    </span>
  );
}

// ─── Feed Item ────────────────────────────────────────────────────────────────
function FeedItem({ activity }) {
  const sc = statusConfig(activity.status_entrega);
  const svc = SERVICES.find(s => s.tipoEntrega === activity.tipo_entrega);
  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      paddingBottom: '18px', position: 'relative',
    }}>
      {/* Linha vertical do timeline */}
      <div style={{
        position: 'absolute', left: '15px', top: '32px', bottom: 0, width: '2px',
        background: '#f3f4f6', zIndex: 0,
      }} />

      {/* Ícone do serviço */}
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, zIndex: 1,
        background: svc?.bg || '#f3f4f6', border: `2px solid ${svc?.color || '#e5e7eb'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.6rem', fontWeight: 800, color: svc?.color || '#6b7280',
      }}>
        {(svc?.label || activity.tipo_entrega || '?').slice(0, 2).toUpperCase()}
      </div>

      {/* Conteúdo do item */}
      <div style={{
        flex: 1, background: 'white', borderRadius: '10px',
        border: '1px solid #f3f4f6', padding: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Linha superior */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700,
              color: svc?.color || C.darkGreen,
              background: svc?.bg || '#f9fafb',
              padding: '2px 8px', borderRadius: '5px',
              border: `1px solid ${svc?.color || '#e5e7eb'}20`,
            }}>
              {activity.tipo_entrega}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: sc.color, background: sc.bg, padding: '2px 8px', borderRadius: '5px' }}>
              {sc.icon} {activity.status_entrega}
            </span>
          </div>
          <span style={{ fontSize: '0.68rem', color: '#9ca3af', flexShrink: 0 }}>
            {formatDate(activity.data)}
          </span>
        </div>

        {/* Observações */}
        {activity.observacoes && (
          <p style={{ fontSize: '0.78rem', color: '#374151', margin: '0 0 6px', lineHeight: 1.5 }}>
            {activity.observacoes}
          </p>
        )}

        {/* Rodapé */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>
            👤 {activity.responsavel_atendimento || 'Não informado'}
          </span>
          {activity.engajamento && (
            <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>
              ⭐ {activity.engajamento}/5
            </span>
          )}
          {tempBadge(activity.temperatura)}
          {alertaBadge(activity.alerta_risco)}
        </div>
      </div>
    </div>
  );
}

// ─── Barra de Progresso de Serviço ───────────────────────────────────────────
function ServiceBar({ service, realizado }) {
  const target = service._target || 0;
  const isCortesia = target === 0 && realizado > 0;
  
  if (target === 0 && realizado === 0) return null;

  const pct = isCortesia ? 100 : Math.min(Math.round((realizado / target) * 100), 100);
  const isOver = !isCortesia && realizado > target;

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: C.darkGreen }}>{service.label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isCortesia ? '#d97706' : isOver ? C.success : '#374151' }}>
          {realizado}/{target}
          {isOver && <span style={{ fontSize: '0.65rem', color: C.success, marginLeft: '4px' }}>✓ Concluído</span>}
          {isCortesia && (
            <span style={{ 
              fontSize: '0.62rem', fontWeight: 700, color: '#b45309', 
              background: C.warningBg, padding: '2px 6px', borderRadius: '4px', 
              marginLeft: '6px', border: `1px solid ${C.warning}60` 
            }}>
              Cortesia
            </span>
          )}
        </span>
      </div>
      <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '8px', borderRadius: '99px',
          background: isCortesia ? C.warning : isOver ? C.success : service.color,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <p style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '3px', textAlign: 'right' }}>
        {isCortesia ? 'Entrega adicional (sem contrato)' : `${pct}% consumido`}
      </p>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function ClientDashboard() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [contracts, setContracts] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Carregar dados em paralelo
  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/contracts`),
      axios.get(`${API_URL}/activities`),
    ]).then(([cRes, aRes]) => {
      const contractList = cRes.data;
      const actList = aRes.data;
      setContracts(contractList);
      setAllActivities(actList);

      // Deep linking: state da navegação ou query param
      const navId = location.state?.clientId || Number(searchParams.get('clientId'));
      const navName = location.state?.clientName || searchParams.get('clientName');

      let initial = null;
      if (navId) {
        initial = contractList.find(c => c.id === navId);
      } else if (navName) {
        initial = contractList.find(c => c.cliente.toLowerCase().includes(navName.toLowerCase()));
      }
      setSelectedId(initial?.id || contractList[0]?.id || null);
    }).catch(err => {
      console.error('Erro ao carregar dados:', err);
    }).finally(() => setLoading(false));
  }, []);

  // Reset filter and page when selectedId changes
  useEffect(() => {
    setActiveFilter('Todos');
    setCurrentPage(1);
  }, [selectedId]);

  const selectedContract = useMemo(() => contracts.find(c => c.id === selectedId) || null, [contracts, selectedId]);

  // Atividades filtradas para o cliente selecionado
  const clientActivities = useMemo(() => {
    if (!selectedId) return [];
    return allActivities.filter(a => a.contract_id === selectedId).sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
  }, [allActivities, selectedId]);

  // Average CSAT calculation
  const averageCsat = useMemo(() => {
    const rated = clientActivities.filter(a => Number(a.engajamento) >= 1 && Number(a.engajamento) <= 5);
    if (rated.length === 0) return null;
    const sum = rated.reduce((acc, curr) => acc + Number(curr.engajamento), 0);
    return (sum / rated.length).toFixed(1);
  }, [clientActivities]);

  // Atividades filtradas pela "pílula"
  const filteredActivities = useMemo(() => {
    if (activeFilter === 'Todos') return clientActivities;
    return clientActivities.filter(a => a.tipo_entrega === activeFilter);
  }, [clientActivities, activeFilter]);

  // Paginação
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage) || 1;
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredActivities.slice(start, start + itemsPerPage);
  }, [filteredActivities, currentPage, itemsPerPage]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  // Cálculo de consumo: mapa tipo_entrega -> count
  const consumoMap = useMemo(() => {
    const map = {};
    clientActivities.filter(a => a.status_entrega === 'Sucesso').forEach(a => {
      map[a.tipo_entrega] = (map[a.tipo_entrega] || 0) + 1;
    });
    return map;
  }, [clientActivities]);

  // Serviços ativos do contrato selecionado
  const activeServices = useMemo(() => {
    if (!selectedContract) return [];
    return SERVICES
      .map(s => ({ ...s, _target: Number(selectedContract[s.target]) || 0 }))
      .filter(s => s._target > 0 || (consumoMap[s.tipoEntrega] || 0) > 0);
  }, [selectedContract, consumoMap]);

  // Progresso global
  const progresso = useMemo(() => {
    if (activeServices.length === 0) return 0;
    const totalT = activeServices.reduce((s, sv) => s + sv._target, 0);
    const totalR = activeServices.reduce((s, sv) => s + (consumoMap[sv.tipoEntrega] || 0), 0);
    return totalT > 0 ? Math.round((totalR / totalT) * 100) : 0;
  }, [activeServices, consumoMap]);

  // Nome curto do cliente
  const shortName = selectedContract
    ? selectedContract.cliente.replace(/IPNET\s*-\s*GMP\s*-\s*/i, '').trim()
    : '';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `3px solid ${C.purple}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Carregando dados do cliente...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* HEADER TÍTULO DA PÁGINA */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: C.darkGreen, margin: 0 }}>
          Visão 360º
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
          Análise detalhada e histórico operacional do cliente.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: '600px' }}>

      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR ESQUERDA — RG do Cliente
      ═══════════════════════════════════════════════════════════ */}
      <div style={{
        width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden',
      }}>

        {/* Header da Sidebar com Dropdown */}
        <div style={{ background: C.purple, padding: '20px', position: 'relative' }}>
          {/* Círculo decorativo */}
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', left: '60px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

          {/* Dropdown de seleção */}
          <select
            value={selectedId || ''}
            onChange={e => setSelectedId(Number(e.target.value))}
            style={{
              width: '100%', padding: '8px 10px', fontSize: '0.75rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px',
              marginBottom: '14px', cursor: 'pointer', outline: 'none',
              backdropFilter: 'blur(4px)',
            }}
          >
            {contracts.map(c => (
              <option key={c.id} value={c.id} style={{ background: C.darkGreen, color: 'white' }}>
                {c.cliente.replace(/IPNET\s*-\s*GMP\s*-\s*/i, '')}
              </option>
            ))}
          </select>

          {selectedContract ? (
            <>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '10px',
              }}>
                {shortName.slice(0, 2).toUpperCase()}
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', margin: '0 0 3px', lineHeight: 1.2 }}>
                {shortName}
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                CX: {selectedContract.responsavel_cs || 'Sem CX'}
              </p>
            </>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>Selecione um cliente acima</p>
          )}
        </div>

        {/* Corpo da sidebar com scroll */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* ─── Dados do Contrato (TODO: Integrar com DB futuramente) */}
          <section>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 8px' }}>
              Dados do Contrato
            </p>
            <div style={{ background: '#fafafa', borderRadius: '8px', padding: '10px 12px', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <InfoRow label="Nº Contrato" value={selectedContract?.numero_contrato} />
              <InfoRow label="Início" value={selectedContract?.inicio_contrato} />
              <InfoRow label="Vencimento" value={selectedContract?.vencimento_contrato} />
              {selectedContract?.proposta_tecnica_target && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Proposta</span>
                  <a href={selectedContract.proposta_tecnica_target} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.72rem', color: C.blue, fontWeight: 600 }}>
                    Ver Link ↗
                  </a>
                </div>
              )}
              {selectedContract?.dpt_domains && (
                <InfoRow label="Domínios BQ" value={selectedContract.dpt_domains} mono />
              )}
              {selectedContract?.freshservice_dept && (
                <InfoRow label="Freshservice" value={selectedContract.freshservice_dept} mono />
              )}
            </div>
          </section>

          {/* ─── Contato Sponsor */}
          <section>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 8px' }}>
              Contato Sponsor
            </p>
            {selectedContract?.sponsor_nome ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: C.blueBg, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.blue}30` }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: C.blue, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                  {selectedContract.sponsor_nome.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: C.darkGreen, margin: 0 }}>{selectedContract.sponsor_nome}</p>
                  <p style={{ fontSize: '0.67rem', color: '#6b7280', margin: 0 }}>{selectedContract.sponsor_cargo || 'Cargo não informado'}</p>
                  <p style={{ fontSize: '0.65rem', color: C.blue, margin: 0 }}>{selectedContract.sponsor_email || 'Email não informado'}</p>
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>Sponsor não cadastrado</p>
              </div>
            )}
          </section>

          {/* ─── Contatos Técnicos */}
          <section>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 8px' }}>
              Contatos Técnicos
            </p>
            {selectedContract?.contatos_tecnicos && (typeof selectedContract.contatos_tecnicos === 'string' ? (() => { try { return JSON.parse(selectedContract.contatos_tecnicos); } catch(e) { return []; } })() : selectedContract.contatos_tecnicos).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(typeof selectedContract.contatos_tecnicos === 'string' ? (() => { try { return JSON.parse(selectedContract.contatos_tecnicos); } catch(e) { return []; } })() : selectedContract.contatos_tecnicos).map((ct, idx) => (
                  <div key={idx} style={{ padding: '8px 10px', background: '#fafafa', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', margin: '0 0 2px' }}>{ct.nome || 'Nome não informado'}</p>
                    <p style={{ fontSize: '0.7rem', color: C.blue, margin: 0 }}>{ct.email || 'Email não informado'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '10px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>Nenhum técnico cadastrado</p>
              </div>
            )}
          </section>

          {/* ─── Mapeamento Técnico */}
          <section>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 8px' }}>
              Dores / Caso de Uso
            </p>
            {selectedContract?.dores_caso_uso?.trim() ? (
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px', border: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: '0.73rem', color: '#374151', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {selectedContract.dores_caso_uso}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: '0.73rem', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>Nenhum caso de uso registrado.</p>
            )}
          </section>

          {/* ─── Handover */}
          <section>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Histórico Sensível (Handover) <span title="Atenção" style={{ color: '#d97706', fontSize: '0.7rem' }}>⚠️</span>
            </p>
            {selectedContract?.historico_sensivel?.trim() ? (
              <div style={{ background: C.warningBg, border: `1px solid ${C.warning}50`, borderRadius: '8px', padding: '10px 12px' }}>
                <p style={{ fontSize: '0.73rem', color: '#78350f', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {selectedContract.historico_sensivel}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: '0.73rem', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>Nenhum alerta histórico.</p>
            )}
          </section>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          COLUNA DIREITA — Feed Operacional
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

        {/* ─── Bloco de Consumo de Contrato ─────────────────────────── */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.darkGreen, margin: '0 0 2px' }}>
                Consumo de Contrato
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0 }}>Metas vs. Realizado (apenas entregas com Sucesso)</p>
            </div>
            {/* Progresso global */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: progresso >= 80 ? C.success : progresso >= 40 ? C.warning : C.danger, margin: 0, lineHeight: 1 }}>
                {progresso}%
              </p>
              <p style={{ fontSize: '0.65rem', color: '#9ca3af', margin: '2px 0 0' }}>consumo global</p>
            </div>
          </div>

          {activeServices.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: 'center', padding: '12px 0' }}>
              Nenhum serviço contratado configurado ainda.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0 24px' }}>
              {activeServices.map(s => (
                <ServiceBar key={s.tipoEntrega} service={s} realizado={consumoMap[s.tipoEntrega] || 0} />
              ))}
            </div>
          )}
        </div>

        {/* ─── Feed de Histórico ────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Header do feed */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.darkGreen, margin: '0 0 2px' }}>
                Histórico Operacional
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0 }}>
                {clientActivities.length} {clientActivities.length === 1 ? 'atividade registrada' : 'atividades registradas'}
              </p>
            </div>
            {/* Estatísticas rápidas */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ textAlign: 'center', paddingRight: '12px', borderRight: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: averageCsat ? C.warning : '#9ca3af', margin: 0 }}>
                  {averageCsat ? `${averageCsat} ⭐` : 'N/A'}
                </p>
                <p style={{ fontSize: '0.6rem', color: '#9ca3af', margin: 0 }}>CSAT Médio</p>
              </div>
              {[
                { label: 'Sucesso', val: clientActivities.filter(a => a.status_entrega === 'Sucesso').length, color: C.success },
                { label: 'No-show', val: clientActivities.filter(a => a.status_entrega === 'No-show').length, color: C.danger },
                { label: 'Alertas', val: clientActivities.filter(a => a.alerta_risco && a.alerta_risco !== 'Nenhum (Tudo certo)').length, color: C.warning },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, color: stat.color, margin: 0 }}>{stat.val}</p>
                  <p style={{ fontSize: '0.6rem', color: '#9ca3af', margin: 0 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0 }}>
            {['Todos', 'Suporte', 'Maps Report', 'Workshop', 'Treinamento', 'Assessment'].map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                style={{
                  padding: '6px 12px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                  border: activeFilter === f ? `1px solid ${C.purple}` : '1px solid #e5e7eb',
                  background: activeFilter === f ? C.purple : 'white',
                  color: activeFilter === f ? 'white' : '#6b7280',
                  transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Lista de itens do feed */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
            {filteredActivities.length === 0 ? (
              (() => {
                if (activeFilter === 'Todos') {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 24px', color: '#9ca3af' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📋</div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: C.darkGreen, marginBottom: '6px' }}>
                        Nenhuma atividade registrada
                      </p>
                      <p style={{ fontSize: '0.78rem', lineHeight: 1.5, maxWidth: '300px', margin: '0 auto' }}>
                        As atividades via Freshservice, Bot do Chat e Log Manual aparecerão aqui para este cliente.
                      </p>
                    </div>
                  );
                }

                const svc = SERVICES.find(s => s.tipoEntrega === activeFilter);
                if (!svc) return null;
                
                const hasTarget = selectedContract && Number(selectedContract[svc.target]) > 0;

                if (hasTarget) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 24px', color: '#9ca3af' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📋</div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: C.darkGreen, marginBottom: '6px' }}>
                        Nenhum registro encontrado
                      </p>
                      <p style={{ fontSize: '0.78rem', lineHeight: 1.5, maxWidth: '300px', margin: '0 auto' }}>
                        Ainda não há atividades de {activeFilter} registradas para este cliente.
                      </p>
                    </div>
                  );
                }

                return (
                  <div style={{ textAlign: 'center', padding: '40px 24px', color: '#9ca3af' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px', filter: 'grayscale(0.3)' }}>📦</div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#d97706', marginBottom: '6px' }}>
                      Serviço não contratado
                    </p>
                    <p style={{ fontSize: '0.78rem', lineHeight: 1.5, maxWidth: '320px', margin: '0 auto' }}>
                      Este cliente não possui cota de {activeFilter} no pacote atual. Entregas extras aparecerão aqui.
                    </p>
                  </div>
                );
              })()
            ) : (
              paginatedActivities.map((a, i) => (
                <FeedItem key={a.id || i} activity={a} />
              ))
            )}
          </div>

          {/* Paginação */}
          {filteredActivities.length > 0 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#fafafa' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredActivities.length)} de {filteredActivities.length}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: currentPage === 1 ? '#f3f4f6' : 'white', color: currentPage === 1 ? '#9ca3af' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', background: currentPage === totalPages ? '#f3f4f6' : 'white', color: currentPage === totalPages ? '#9ca3af' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────
function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
      <span style={{ fontSize: '0.68rem', color: '#9ca3af', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: '0.72rem', fontWeight: 600, color: '#374151', textAlign: 'right',
        ...(mono ? { fontFamily: 'monospace', fontSize: '0.65rem' } : {}),
      }}>
        {value || '—'}
      </span>
    </div>
  );
}
