import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import API_URL from '../config';

// ─── Paleta de Cores IPNET + Google Maps ───────────────────────────────────────
const C = {
  purple:   '#660099',
  purpleLight: '#BD4AFF',
  darkGreen:'#1A351F',
  midGreen: '#315932',
  lime:     '#DAFF71',
  success:  '#34A853',
  warning:  '#FBBC04',
  danger:   '#EA4335',
  blue:     '#4285F4',
};

// ─── Serviços Numéricos (excluindo Proposta Técnica) ──────────────────────────
const NUMERIC_SERVICES = [
  { key: 'Workshop',     target: 'workshop_target',     realized: 'workshop_realizado' },
  { key: 'Assessment',   target: 'assessment_target',   realized: 'assessment_realizado' },
  { key: 'Treinamento',  target: 'treinamento_target',  realized: 'treinamento_realizado' },
  { key: 'Maps Report',  target: 'maps_report_target',  realized: 'maps_report_realizado' },
  { key: 'Suporte',      target: 'suporte_target',      realized: 'suporte_realizado' },
];

// ─── KPI Placeholder de Renovações ────────────────────────────────────────────
// TODO: Substituir por dados reais quando a tabela de contratos for atualizada
const RENEWAL_PLACEHOLDER = [
  { id: 9,  days: 30 },
  { id: 12, days: 75 },
];

// ─── Helpers de Status ────────────────────────────────────────────────────────
function computeClientHealth(client) {
  const totalTarget   = NUMERIC_SERVICES.reduce((s, sv) => s + (Number(client[sv.target]) || 0), 0);
  const totalRealized = NUMERIC_SERVICES.reduce((s, sv) => s + (Number(client[sv.realized]) || 0), 0);
  const pct = totalTarget > 0 ? Math.round((totalRealized / totalTarget) * 100) : 0;

  const isCortesiaExclusiva = totalTarget === 0 && totalRealized > 0;

  const hasRiskAlert = client.ultimo_alerta_risco &&
    client.ultimo_alerta_risco !== 'Nenhum (Tudo certo)';

  // Focos de Atenção: serviços com progresso < 20%
  const focos = NUMERIC_SERVICES.filter(sv => {
    const t = Number(client[sv.target]) || 0;
    const r = Number(client[sv.realized]) || 0;
    return t > 0 && ((r / t) * 100) < 20;
  }).map(sv => ({
    label: sv.key,
    realized: Number(client[sv.realized]) || 0,
    target: Number(client[sv.target]) || 0,
  }));

  if (hasRiskAlert) {
    focos.push({ label: client.ultimo_alerta_risco, isAlert: true });
  }

  // Sem nenhuma atividade
  if (totalRealized === 0) return { status: 'sem_atend', pct, focos, totalTarget, totalRealized, isCortesiaExclusiva };
  // Tem alerta de risco ou progresso geral < 20%
  if (hasRiskAlert || (!isCortesiaExclusiva && pct < 20)) return { status: 'risco', pct, focos, totalTarget, totalRealized, isCortesiaExclusiva };
  // Algum serviço com < 20% (mas sem alerta direto)
  if (focos.length > 0) return { status: 'atencao', pct, focos, totalTarget, totalRealized, isCortesiaExclusiva };
  return { status: 'saudavel', pct, focos, totalTarget, totalRealized, isCortesiaExclusiva };
}

const STATUS_CONFIG = {
  saudavel:  { label: 'Saudável',      barColor: C.success, badgeBg: '#dcfce7', badgeText: C.success,   topBar: C.success, cardBorder: '#bbf7d0', bodyBg: '#f0fdf4', bodyBorder: '#bbf7d0' },
  atencao:   { label: 'Atenção',       barColor: C.warning, badgeBg: '#fef9c3', badgeText: '#92400e',   topBar: C.warning, cardBorder: '#fde68a', bodyBg: '#fffbeb', bodyBorder: '#fde68a' },
  risco:     { label: 'Em Risco',      barColor: C.danger,  badgeBg: '#fee2e2', badgeText: C.danger,    topBar: C.danger,  cardBorder: '#fecaca', bodyBg: '#fff1f2', bodyBorder: '#fecaca' },
  sem_atend: { label: 'Sem Atend.',    barColor: '#9ca3af', badgeBg: '#f3f4f6', badgeText: '#4b5563',   topBar: '#9ca3af', cardBorder: '#e5e7eb', bodyBg: '#f9fafb', bodyBorder: '#e5e7eb' },
};

// ─── Componente Tooltip Informativo ──────────────────────────────────────────
function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <svg width="14" height="14" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" style={{ cursor: 'help', transition: 'stroke 0.2s', ...(show ? { stroke: '#4b5563' } : {}) }}>
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
      </svg>
      {show && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: '8px', padding: '8px 12px', background: 'rgba(31, 41, 55, 0.95)',
          color: 'white', fontSize: '0.75rem', borderRadius: '6px', width: 'max-content',
          maxWidth: '250px', zIndex: 50, boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          pointerEvents: 'none', lineHeight: 1.4, fontWeight: 500, whiteSpace: 'normal',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          {text}
          {/* Seta do tooltip */}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: '5px', borderStyle: 'solid', borderColor: 'rgba(31, 41, 55, 0.95) transparent transparent transparent'
          }} />
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translate(-50%, 5px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
    </div>
  );
}

// ─── Componente do Card Individual ───────────────────────────────────────────
function ClientCard({ client }) {
  const { status, pct, focos, totalTarget, totalRealized, isCortesiaExclusiva } = computeClientHealth(client);
  const cfg = STATUS_CONFIG[status];
  // TODO: Substituir por dados reais quando a tabela de contratos for atualizada
  const renewal = RENEWAL_PLACEHOLDER.find(r => r.id === client.contract_id);

  // Extrair nome curto do cliente (ex: "IPNET - GMP - SERPRO" -> "SERPRO")
  const shortName = client.cliente.replace(/IPNET\s*-\s*GMP\s*-\s*/i, '').trim();

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: `1px solid ${cfg.cardBorder}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      ...(renewal ? { borderBottom: `3px solid ${C.warning}` } : {}),
    }}>
      {/* Barra colorida no topo */}
      <div style={{ height: '4px', background: cfg.topBar, width: '100%' }} />

      <div style={{ padding: '20px', flexGrow: 1 }}>
        {/* Cabeçalho do Card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ overflow: 'hidden', paddingRight: '8px' }}>
            <h2 style={{
              fontSize: '1rem', fontWeight: 700, color: C.darkGreen,
              margin: 0, marginBottom: '3px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {shortName}
            </h2>
            <p style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              RESP: {client.responsavel_cs || 'Não Definido'}
            </p>
          </div>
          <span style={{
            background: cfg.badgeBg, color: cfg.badgeText,
            padding: '3px 9px', borderRadius: '5px',
            fontSize: '0.7rem', fontWeight: 700,
            border: `1px solid ${cfg.cardBorder}`,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {cfg.label}
          </span>
        </div>

        {/* Barra de Progresso */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>Progresso de Entregas</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isCortesiaExclusiva ? C.blue : '#111827' }}>
              {isCortesiaExclusiva ? (
                <span style={{ 
                  fontSize: '0.65rem', fontWeight: 700, color: '#1e3a8a', 
                  background: C.blueBg, padding: '2px 6px', borderRadius: '4px', 
                  border: `1px solid ${C.blue}50` 
                }}>
                  Cortesia / Extra
                </span>
              ) : `${pct}%`}
            </span>
          </div>
          <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '99px', height: '7px' }}>
            <div style={{
              background: isCortesiaExclusiva ? C.blue : cfg.barColor, height: '7px', borderRadius: '99px',
              width: isCortesiaExclusiva ? '100%' : `${Math.min(pct, 100)}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ fontSize: '0.68rem', color: '#9ca3af', margin: '4px 0 0', textAlign: 'right' }}>
            {totalRealized} de {totalTarget} entregas
          </p>
        </div>

        {/* Lista de Entregáveis — sempre visível em todos os cenários */}
        <div style={{
          background: cfg.bodyBg, border: `1px solid ${cfg.bodyBorder}`,
          borderRadius: '8px', padding: '10px', marginBottom: focos.length > 0 || status === 'sem_atend' ? '10px' : '0',
        }}>
          <p style={{
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
            color: '#6b7280', letterSpacing: '0.05em', margin: '0 0 7px',
          }}>
            Entregáveis
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {NUMERIC_SERVICES.filter(sv => Number(client[sv.target]) > 0).map(sv => {
              const r = Number(client[sv.realized]) || 0;
              const t = Number(client[sv.target]) || 0;
              const done = r >= t;
              const low = t > 0 && (r / t) * 100 < 20 && r < t;
              return (
                <div key={sv.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'white', padding: '4px 8px', borderRadius: '5px',
                  border: `1px solid ${cfg.bodyBorder}`,
                }}>
                  <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#374151' }}>{sv.key}</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    color: done ? C.success : low ? C.danger : '#374151',
                  }}>
                    {r}/{t}
                  </span>
                </div>
              );
            })}
            {NUMERIC_SERVICES.filter(sv => Number(client[sv.target]) > 0).length === 0 && (
              <span style={{ fontSize: '0.73rem', color: '#9ca3af' }}>Sem metas configuradas.</span>
            )}
          </div>
        </div>




        {/* TODO: Substituir por dados reais quando a tabela de contratos for atualizada */}
        {renewal && (
          <div style={{
            marginTop: '10px', background: '#fffbeb', border: `1px solid #fde68a`,
            borderRadius: '8px', padding: '8px 12px', textAlign: 'center',
          }}>
            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#92400e' }}>
              ⚠️ Contrato vence em {renewal.days} dias
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard`);
      setData(res.data);
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  // ─── Cálculos de KPI ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totClients = data.length;
    const atendidos = data.filter(c => NUMERIC_SERVICES.reduce((s, sv) => s + (Number(c[sv.realized]) || 0), 0) > 0).length;

    const totalR = data.reduce((s, c) => s + NUMERIC_SERVICES.reduce((ss, sv) => ss + (Number(c[sv.realized]) || 0), 0), 0);
    const totalT = data.reduce((s, c) => s + NUMERIC_SERVICES.reduce((ss, sv) => ss + (Number(c[sv.target]) || 0), 0), 0);
    const deliveryRate = totalT > 0 ? Math.round((totalR / totalT) * 100) : 0;

    const emRisco = data.filter(c => {
      const h = computeClientHealth(c);
      return h.status === 'risco';
    }).length;

    // TODO: Substituir por dados reais quando a tabela de contratos for atualizada
    const renovacoes = RENEWAL_PLACEHOLDER.length;

    // Placeholder para Engajamento Médio
    const engajamentoMedio = 4.8;

    return { totClients, atendidos, deliveryRate, emRisco, renovacoes, engajamentoMedio };
  }, [data]);

  // ─── Filtragem e Busca ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return data.filter(c => {
      const health = computeClientHealth(c).status;
      const matchFilter =
        filter === 'todos'     ||
        (filter === 'saudavel'  && health === 'saudavel') ||
        (filter === 'risco'     && health === 'risco') ||
        (filter === 'atencao'   && health === 'atencao') ||
        (filter === 'sem_atend' && health === 'sem_atend');
      const matchSearch = c.cliente.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [data, filter, search]);

  const counts = useMemo(() => ({
    saudavel:  data.filter(c => computeClientHealth(c).status === 'saudavel').length,
    atencao:   data.filter(c => computeClientHealth(c).status === 'atencao').length,
    risco:     data.filter(c => computeClientHealth(c).status === 'risco').length,
    sem_atend: data.filter(c => computeClientHealth(c).status === 'sem_atend').length,
  }), [data]);

  // ─── Estilos Reutilizáveis ──────────────────────────────────────────────────
  const kpiCard = (borderColor) => ({
    background: 'white', padding: '18px 20px', borderRadius: '12px',
    border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', gap: '14px',
    ...(borderColor ? { borderBottom: `3px solid ${borderColor}` } : {}),
  });
  const kpiIcon = (bg, color) => ({
    padding: '10px', background: bg, color, borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  });

  const filterBtn = (key, bgActive, textActive, bgHover) => ({
    padding: '7px 14px', fontSize: '0.8rem', fontWeight: 700,
    borderRadius: '8px', border: '1px solid transparent',
    cursor: 'pointer', transition: 'all 0.15s',
    background: filter === key ? bgActive : '#f3f4f6',
    color: filter === key ? textActive : '#374151',
    borderColor: filter === key ? bgActive : 'transparent',
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: `3px solid ${C.purple}`, borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Carregando portfólio...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: C.darkGreen, margin: 0 }}>
          Painel de Controle
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
          Monitoramento em tempo real do consumo e saúde dos contratos de Geo.
        </p>
      </div>

      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px', marginBottom: '24px',
      }}>
        {/* Cobertura */}
        <div style={kpiCard()}>
          <div style={kpiIcon('#ede9fe', C.purple)}>
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Cobertura (Ativos)</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              {kpis.atendidos} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#6b7280' }}>/ {kpis.totClients}</span>
            </p>
          </div>
        </div>

        {/* Taxa de Entrega */}
        <div style={kpiCard(kpis.deliveryRate < 40 ? C.danger : C.success)}>
          <div style={kpiIcon(kpis.deliveryRate < 40 ? '#fee2e2' : '#dcfce7', kpis.deliveryRate < 40 ? C.danger : C.success)}>
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <p style={{ display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Taxa de Entrega Global
              <InfoTooltip text="Cálculo: Soma de todos os serviços realizados dividida pela soma de todas as metas contratadas no período selecionado." />
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: kpis.deliveryRate < 40 ? C.danger : '#111827', margin: 0 }}>
              {kpis.deliveryRate}%
            </p>
          </div>
        </div>

        {/* Em Risco */}
        <div style={kpiCard(kpis.emRisco > 0 ? C.danger : C.success)}>
          <div style={kpiIcon('#fee2e2', C.danger)}>
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p style={{ display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Contratos em Risco
              <InfoTooltip text="Contagem de clientes distintos que receberam a marcação manual de 'Alerta de Risco' nos registros do Log de Atividades durante este período." />
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: kpis.emRisco > 0 ? C.danger : '#111827', margin: 0 }}>
              {kpis.emRisco} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#6b7280' }}>clientes</span>
            </p>
          </div>
        </div>

        {/* Engajamento Médio */}
        <div style={kpiCard(C.warning)}>
          <div style={kpiIcon('#fffbeb', '#b45309')}>
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div>
            <p style={{ display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Engajamento Médio
              <InfoTooltip text="Média aritmética das notas de CSAT (1 a 5 estrelas) registradas nos atendimentos e reuniões do período." />
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              {kpis.engajamentoMedio} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#6b7280' }}>/ 5</span>
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        gap: '12px', background: 'white', padding: '12px 14px', borderRadius: '12px',
        border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { key: 'todos',     label: `Todos (${data.length})`,              bg: C.purple,  text: 'white' },
            { key: 'saudavel',  label: `Saudáveis (${counts.saudavel})`,      bg: C.success, text: 'white' },
            { key: 'atencao',   label: `Atenção (${counts.atencao})`,         bg: C.warning, text: '#1a351f' },
            { key: 'risco',     label: `Em Risco (${counts.risco})`,          bg: C.danger,  text: 'white' },
            { key: 'sem_atend', label: `Sem Atend. (${counts.sem_atend})`,    bg: '#6b7280', text: 'white' },
          ].map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              style={{
                ...filterBtn(btn.key, btn.bg, btn.text),
                ...(filter === btn.key ? { background: btn.bg, color: btn.text, borderColor: btn.bg } : {}),
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Busca */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
            width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              paddingLeft: '34px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px',
              fontSize: '0.82rem', border: `1px solid #d1d5db`, borderRadius: '8px',
              outline: 'none', transition: 'border-color 0.2s',
              fontFamily: 'inherit', color: '#111827',
            }}
            onFocus={e => e.target.style.borderColor = C.blue}
            onBlur={e => e.target.style.borderColor = '#d1d5db'}
          />
        </div>
      </div>

      {/* Grid de Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>Nenhum cliente encontrado para este filtro.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {filtered.map(client => (
            <ClientCard key={client.contract_id} client={client} />
          ))}
        </div>
      )}

      {/* Rodapé com contagem */}
      <div style={{ marginTop: '20px', textAlign: 'right', fontSize: '0.75rem', color: '#9ca3af' }}>
        Exibindo {filtered.length} de {data.length} contratos
      </div>
    </div>
  );
}
