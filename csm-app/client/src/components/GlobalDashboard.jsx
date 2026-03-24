import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import API_URL from '../config';

// ─── Paleta IPNET + Google Maps ───────────────────────────────────────────────
const C = {
  purple:      '#660099', // Primária
  purpleLight: '#BD4AFF', // Secundária
  lime:        '#DAFF71', // Destaque / Hover
  darkGreen:   '#1A351F', // Textos primários pesados
  midGreen:    '#315932', // Fundos/bordas neutras sutil
  success:     '#34A853', // Saudável / Verde Google
  warning:     '#FBBC04', // Atenção / Amarelo Google
  danger:      '#EA4335', // Risco / Vermelho Google
  blue:        '#4285F4', // Workshop / Azul Google
};

// Mapeamento das Cores dos Serviços para o Donut e Raio-X
const SVC_COLORS = {
  'Suporte': C.purple,
  'Maps Report': C.purpleLight,
  'Assessment': C.success,
  'Treinamento': C.warning,
  'Workshop': C.blue,
};

// Metas dos contratos (Target fields)
const TARGET_MAP = {
  'Suporte': 'suporte_target',
  'Maps Report': 'maps_report_target',
  'Assessment': 'assessment_target',
  'Treinamento': 'treinamento_target',
  'Workshop': 'workshop_target',
};

// ─── Componente Tooltip Informativo ──────────────────────────────────────────
function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
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
          animation: 'fadeIn 0.2s ease-in-out',
          textTransform: 'none',
          letterSpacing: 'normal'
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

// ─── Helpers de Data ──────────────────────────────────────────────────────────
function parseDate(isoString) {
  return isoString ? new Date(isoString) : null;
}

function daysAgo(date) {
  if (!date) return null;
  const diffTime = Math.abs(new Date() - date);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function formatRelativeTime(date) {
  if (!date) return 'Nunca atendido';
  const d = daysAgo(date);
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Ontem';
  if (d < 30) return `Há ${d} dias`;
  const m = Math.floor(d / 30);
  return `Há ${m} ${m === 1 ? 'mês' : 'meses'}`;
}

export default function GlobalDashboard() {
  const [contracts, setContracts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de filtro de período
  const [period, setPeriod] = useState('30_days');

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/contracts`),
      axios.get(`${API_URL}/activities`)
    ]).then(([cRes, aRes]) => {
      setContracts(cRes.data);
      setActivities(aRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // 1. Filtrar Atividades pelo Período Selecionado
  const filteredActivities = useMemo(() => {
    const now = new Date();
    return activities.filter(a => {
      const pData = parseDate(a.data);
      if (!pData) return false;
      
      if (period === '30_days') {
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(now.getDate() - 30);
        return pData >= trintaDiasAtras;
      }
      
      if (period === 'current_quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const actQuarter = Math.floor(pData.getMonth() / 3);
        return pData.getFullYear() === now.getFullYear() && actQuarter === currentQuarter;
      }
      
      if (period === 'current_year') {
        return pData.getFullYear() === now.getFullYear();
      }
      
      return true; // 'all_time' fallback
    });
  }, [activities, period]);

  // 2. Cálculos dos KPIs
  const kpis = useMemo(() => {
    // Base de Clientes (Total vs com Atividade no período)
    const totalContratos = contracts.length;
    const activeClientsSet = new Set(filteredActivities.map(a => a.contract_id));
    const activeClientsCount = activeClientsSet.size;

    // Engajamento Médio
    const engajamentoActivities = filteredActivities.filter(a => a.engajamento !== null && a.engajamento !== undefined);
    const sumEng = engajamentoActivities.reduce((acc, a) => acc + Number(a.engajamento), 0);
    const avgEng = engajamentoActivities.length > 0 ? (sumEng / engajamentoActivities.length).toFixed(1) : '—';

    // Contas em Risco (Atividades com alerta que não sejam Nulo ou "Nenhum")
    const riskClientsSet = new Set(filteredActivities
      .filter(a => a.alerta_risco && !a.alerta_risco.toLowerCase().includes('nenhum'))
      .map(a => a.contract_id));
    const riskCount = riskClientsSet.size;

    return { totalContratos, activeClientsCount, avgEng, riskCount };
  }, [contracts, filteredActivities]);

  // 3. Raio-X & Donut (Metas vs Realizado)
  const serviceStats = useMemo(() => {
    const stats = Object.keys(SVC_COLORS).map(serviceName => {
      // Previsto = Soma dos targets de TODOS os contratos (o contrato é fixo, não depende do período)
      // Ajuste de regra de negócio: Previsto global é independente de período, ou devemos adaptar? 
      // Por padrão, volume alvo de contrato costuma ser estático/mensal. Vou usar a soma real do banco.
      const targetField = TARGET_MAP[serviceName];
      const sumTarget = contracts.reduce((acc, c) => acc + (Number(c[targetField]) || 0), 0);
      
      // Realizado = Soma dos entregáveis com Sucesso APENAS NO PERÍODO
      const sumRealized = filteredActivities.filter(a => a.tipo_entrega === serviceName && a.status_entrega === 'Sucesso').length;
      
      return {
        name: serviceName,
        target: sumTarget,
        realized: sumRealized,
        pct: sumTarget > 0 ? Math.min(Math.round((sumRealized / sumTarget) * 100), 100) : (sumRealized > 0 ? 100 : 0),
        color: SVC_COLORS[serviceName]
      };
    }).sort((a, b) => b.target - a.target); // Ordenar por maior meta

    // Dados para o Donut (Apenas do que foi entregue)
    const totalDelivered = stats.reduce((acc, s) => acc + s.realized, 0);
    
    // Calcular o gradient dinâmico para o CSS
    let gradientStops = [];
    if (totalDelivered > 0) {
      let cumulativePct = 0;
      stats.forEach(s => {
        if (s.realized > 0) {
          const slicePct = (s.realized / totalDelivered) * 100;
          gradientStops.push(`${s.color} ${cumulativePct}% ${cumulativePct + slicePct}%`);
          cumulativePct += slicePct;
        }
      });
    } else {
      gradientStops.push(`#e5e7eb 0% 100%`); // Cinza se não houver entregas
    }

    const donutGradient = `conic-gradient(${gradientStops.join(', ')})`;

    return { stats, totalDelivered, donutGradient };
  }, [contracts, filteredActivities]);

  // Taxa de Entrega Global (Realizado Geral / Target Geral)
  const globalTarget = useMemo(() => {
    return serviceStats.stats.reduce((acc, s) => acc + s.target, 0);
  }, [serviceStats]);
  
  const globalDeliveryRate = globalTarget > 0 ? ((serviceStats.totalDelivered / globalTarget) * 100).toFixed(1) : 0;

  // 4. Ranking de Alertas
  const alertRanking = useMemo(() => {
    const freqs = {};
    filteredActivities.forEach(a => {
      if (a.alerta_risco && !a.alerta_risco.toLowerCase().includes('nenhum')) {
        freqs[a.alerta_risco] = (freqs[a.alerta_risco] || 0) + 1;
      }
    });

    const totalAlerts = Object.values(freqs).reduce((a, b) => a + b, 0);
    
    return Object.entries(freqs)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / totalAlerts) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
  }, [filteredActivities]);

  // 5. Clientes Sumidos (Fila de Atenção Imediata - Considera base total sem filtro de período)
  const missingClients = useMemo(() => {
    const list = contracts.map(c => {
      // Pegar todas as atividades deste cliente do banco geral
      const cActs = activities.filter(a => a.contract_id === c.id);
      
      // Encontrar a data mais recente
      let lastDate = null;
      if (cActs.length > 0) {
        lastDate = cActs.reduce((latest, a) => {
          const d = parseDate(a.data);
          return latest > d ? latest : d;
        }, parseDate(cActs[0].data));
      }

      const diasSumido = daysAgo(lastDate);
      
      // Status visual
      let statusLevel = 'danger'; // Nunca atendido
      let statusLabel = '0 Registros';
      let tagBg = C.danger + '15';
      let tagColor = C.danger;
      
      if (diasSumido !== null) {
        if (diasSumido >= 90) {
          statusLevel = 'danger';
          statusLabel = 'Sumido Crítico';
        } else if (diasSumido >= 30) {
          statusLevel = 'warning';
          statusLabel = 'Atenção (+30 dias)';
          tagBg = C.warning + '20';
          tagColor = '#b45309';
        } else {
          statusLevel = 'success';
          statusLabel = 'Ativo (Recente)';
          tagBg = C.success + '20';
          tagColor = '#166534';
        }
      }

      return {
        ...c,
        lastDate,
        diasSumido,
        actCount: cActs.length,
        statusLevel,
        statusLabel,
        tagBg,
        tagColor,
        shortName: c.cliente.replace(/IPNET\s*-\s*GMP\s*-\s*/i, '')
      };
    });

    // Ordenar: NULLs primeiro, depois os com maior diasSumido
    return list.sort((a, b) => {
      if (a.diasSumido === null && b.diasSumido !== null) return -1;
      if (b.diasSumido === null && a.diasSumido !== null) return 1;
      return (b.diasSumido || 0) - (a.diasSumido || 0);
    });
  }, [contracts, activities]);

  // Agendamento Google Calendar
  const handleAgendar = (clienteNome, tipoAcao, emailSponsor) => {
    const titulo = tipoAcao === 'Kick-off'
      ? `Kick-off: ${clienteNome}`
      : `Follow-up CSM: ${clienteNome}`;
    let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}`;
    if (emailSponsor) {
      url += `&add=${encodeURIComponent(emailSponsor)}`;
    }
    window.open(url, '_blank');
  };


  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: C.purple, fontWeight: 'bold' }}>Carregando dados globais...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.darkGreen, margin: 0 }}>Dashboard Executivo</h1>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '4px 0 0' }}>Visão consolidada de entregas, saúde da base e riscos operacionais.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            value={period} 
            onChange={e => setPeriod(e.target.value)}
            style={{ 
              padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', 
              fontSize: '0.85rem', fontWeight: 600, color: C.darkGreen, outline: 'none', cursor: 'pointer' 
            }}
          >
            <option value="30_days">Últimos 30 dias</option>
            <option value="current_quarter">Este Trimestre (QAtual)</option>
            <option value="current_year">Ano atual ({new Date().getFullYear()})</option>
            <option value="all_time">Todo o Histórico</option>
          </select>
          <button 
            onClick={() => console.log('Em breve')}
            style={{ 
              backgroundColor: C.purple, color: 'white', padding: '8px 16px', borderRadius: '8px', 
              fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'background-color 0.2s', ':hover': { backgroundColor: C.purpleLight }
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Exportar Relatório {/* TODO: Implementar exportação PDF/CSV futuramente */}
          </button>
        </div>
      </div>

      {/* 1. KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        
        {/* KPI: Base */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: C.blue, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}></div>
          <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', margin: '0 0 4px' }}>
            <span style={{color: C.blue}}>👥</span> Base de Clientes
          </p>
          <h3 style={{ fontSize: '2rem', fontWeight: 900, color: C.darkGreen, margin: 0 }}>{kpis.totalContratos}</h3>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0 0', fontWeight: 500 }}>
            {kpis.activeClientsCount} atendidos neste período
          </p>
        </div>

        {/* KPI: Taxa Entrega */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: C.purple, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}></div>
          <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', margin: '0 0 4px' }}>
            <span style={{color: C.purple}}>📈</span> Taxa de Entrega Global
            <InfoTooltip text="Cálculo: Soma de todos os serviços realizados dividida pela soma de todas as metas contratadas no período selecionado." />
          </p>
          <h3 style={{ fontSize: '2rem', fontWeight: 900, color: C.purple, margin: 0 }}>{globalDeliveryRate}%</h3>
          <p style={{ fontSize: '0.75rem', margin: '4px 0 0', fontWeight: 500, color: '#6b7280' }}>
             {serviceStats.totalDelivered} / {globalTarget} entregáveis contratuais
          </p>
        </div>

        {/* KPI: Contas Risco */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: C.danger, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}></div>
          <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', margin: '0 0 4px' }}>
            <span style={{color: C.danger}}>⚠️</span> Contas em Risco
            <InfoTooltip text="Contagem de clientes distintos que receberam a marcação manual de 'Alerta de Risco' nos registros do Log de Atividades durante este período." />
          </p>
          <h3 style={{ fontSize: '2rem', fontWeight: 900, color: C.darkGreen, margin: 0 }}>{kpis.riskCount}</h3>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0 0', fontWeight: 500 }}>
            Clientes com alertas no período
          </p>
        </div>

        {/* KPI: Engajamento */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: C.warning, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}></div>
          <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', margin: '0 0 4px' }}>
            <span style={{color: C.warning}}>⭐</span> Engajamento Médio
            <InfoTooltip text="Média aritmética das notas de CSAT (1 a 5 estrelas) registradas nos atendimentos e reuniões do período." />
          </p>
          <h3 style={{ fontSize: '2rem', fontWeight: 900, color: C.darkGreen, margin: 0, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            {kpis.avgEng} <span style={{fontSize:'1rem', color:'#9ca3af'}}>/ 5</span>
          </h3>
          <p style={{ fontSize: '0.75rem', color: C.success, margin: '4px 0 0', fontWeight: 600 }}>
            Média das interações registradas
          </p>
        </div>
      </div>

      {/* 2. GRÁFICOS */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Raio-X */}
        <div style={{ flex: '2 1 500px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: C.darkGreen, margin: '0 0 2px' }}>Raio-X de Entregas Contratuais</h2>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 20px' }}>Comparativo de Realizado vs Previsto Global por Serviço</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {serviceStats.stats.filter(s => s.target > 0 || s.realized > 0).map(s => (
              <div key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', minWidth: '120px' }}>{s.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: C.darkGreen }}>
                      {s.realized} <span style={{ fontWeight: 400, color: '#9ca3af' }}>/ {s.target}</span>
                    </span>
                    <span style={{ 
                      fontSize: '0.7rem', fontWeight: 800, color: s.color, background: `${s.color}15`, 
                      padding: '2px 8px', borderRadius: '4px', minWidth: '45px', textAlign: 'center' 
                    }}>
                      {s.pct}%
                    </span>
                  </div>
                </div>
                <div style={{ width: '100%', height: '10px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: '99px' }}></div>
                </div>
              </div>
            ))}
            {serviceStats.stats.reduce((a, b) => a + b.target, 0) === 0 && (
               <p style={{ fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Sem metas computadas.</p>
            )}
          </div>
        </div>

        {/* Coluna Direita Auxiliar (Alertas e Donut) */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Alertas */}
          <div style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: C.darkGreen, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{color: C.danger}}>⚠️</span> 
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Ranking de Alertas
                <InfoTooltip text="Agrupamento dos motivos de risco mais frequentes. Esses dados são alimentados quando o CX registra uma atividade e sinaliza um problema na operação." />
              </div>
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 16px' }}>Principais motivos de risco mapeados</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
               {alertRanking.length > 0 ? alertRanking.map(a => (
                 <div key={a.name}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                     <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={a.name}>
                       {a.name}
                     </span>
                     <span style={{ fontSize: '0.8rem', fontWeight: 800, color: C.darkGreen }}>{a.count}x</span>
                   </div>
                   <div style={{ width: '100%', height: '6px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                     <div style={{ height: '100%', width: `${a.pct}%`, background: C.danger, borderRadius: '99px' }}></div>
                   </div>
                 </div>
               )) : (
                 <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Nenhum alerta crítico no período ativo.</span>
                 </div>
               )}
            </div>
          </div>

          {/* Donut Chart Esforço */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: C.darkGreen, margin: '0 0 16px' }}>Distribuição do Esforço Realizado</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div 
                style={{ 
                  width: '90px', height: '90px', borderRadius: '50%', flexShrink: 0,
                  background: serviceStats.donutGradient, position: 'relative',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ position: 'absolute', top: '25%', left: '25%', right: '25%', bottom: '25%', background: 'white', borderRadius: '50%' }}></div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {serviceStats.stats.filter(s => s.realized > 0).map(s => {
                   const pctDonut = Math.round((s.realized / serviceStats.totalDelivered) * 100);
                   return (
                     <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>
                         <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }}></div>
                         {s.name}
                       </span>
                       <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>{pctDonut}%</span>
                     </div>
                   );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. FILA DE ATENÇÃO (Clientes Sumidos) */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', background: '#fafafa', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
           <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: C.darkGreen, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{color: C.warning}}>⚠️</span> Fila de Atenção Imediata: Top Clientes Sumidos
           </h2>
           <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Histórico total. Clientes sem registro de atividade recente no sistema.</p>
        </div>
        
        <div style={{ overflow: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em' }}>Cliente</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Status Contato
                    <InfoTooltip text="Critérios de inatividade: 'Atenção' = Sem contato há mais de 30 dias. 'Sumido Crítico' = Sem contato há mais de 90 dias. '0 Registros' = Cliente nunca foi atendido." />
                  </div>
                </th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em' }}>Última Atividade</th>
                <th style={{ padding: '12px 20px', fontSize: '0.75rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em', textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {missingClients.slice(0, 10).map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i === 9 ? 'none' : '1px solid #f9fafb', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#f3f4f6', color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                        {c.shortName.slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: C.darkGreen }}>{c.cliente}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ background: c.tagBg, color: c.tagColor, padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>
                      {c.statusLabel}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>
                         {c.lastDate ? c.lastDate.toLocaleDateString('pt-BR') : '—'}
                       </span>
                       <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                         {formatRelativeTime(c.lastDate)}
                       </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleAgendar(c.cliente, c.actCount === 0 ? 'Kick-off' : 'Follow-up', c.contato_sponsor_email)}
                        style={{
                          padding: '6px 12px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px',
                          fontSize: '0.7rem', fontWeight: 800, color: '#374151', cursor: 'pointer'
                        }}
                      >
                        {c.actCount === 0 ? 'Agendar Kick-off' : 'Agendar Follow-up'}
                      </button>
                  </td>
                </tr>
              ))}
              {missingClients.length === 0 && (
                <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>Nenhum contrato ativo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
