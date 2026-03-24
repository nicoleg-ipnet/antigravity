import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';

// ─── Paleta IPNET + Google Maps ───────────────────────────────────────────────
const C = {
  purple:      '#660099',
  purpleBg:    '#f3e5ff',
  purpleLight: '#BD4AFF',
  lime:        '#DAFF71',
  darkGreen:   '#1A351F',
  midGreen:    '#315932',
  success:     '#34A853',
  successBg:   '#dcfce7',
  warning:     '#FBBC04',
  warningBg:   '#fef9c3',
  danger:      '#EA4335',
  dangerBg:    '#fee2e2',
  blue:        '#4285F4',
  blueBg:      '#e8f0fe',
};

// ─── Config de Serviços ───────────────────────────────────────────────────────
const SERVICES = [
  { key: 'suporte_target',      label: 'Suporte',      pill: 'Sup',   color: C.purple,      bg: C.purpleBg,    dot: C.purple },
  { key: 'maps_report_target',  label: 'Maps Report',  pill: 'Maps',  color: C.purpleLight,  bg: '#f5e6ff',     dot: C.purpleLight },
  { key: 'workshop_target',     label: 'Workshop',     pill: 'Work',  color: C.blue,         bg: C.blueBg,      dot: C.blue },
  { key: 'assessment_target',   label: 'Assessment',   pill: 'Asses', color: C.success,      bg: C.successBg,   dot: C.success },
  { key: 'treinamento_target',  label: 'Treinamento',  pill: 'Trein', color: '#0f766e',      bg: '#f0fdfa',     dot: '#14b8a6' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  const parts = name.replace(/IPNET\s*-\s*GMP\s*-\s*/i, '').trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function isIntegrated(contract) {
  return !!(contract.dpt_domains?.trim() && contract.freshservice_dept?.trim());
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '48px', textAlign: 'center', color: '#9ca3af',
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '16px', background: C.purpleBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
      }}>
        <svg width="28" height="28" fill="none" stroke={C.purple} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p style={{ fontSize: '1rem', fontWeight: 700, color: C.darkGreen, marginBottom: '6px' }}>
        Selecione um contrato
      </p>
      <p style={{ fontSize: '0.82rem', maxWidth: '260px', lineHeight: 1.5 }}>
        Clique em qualquer cliente na lista à esquerda para ver os detalhes completos e configurações.
      </p>
    </div>
  );
}

// ─── Card da Lista (Esquerda) ─────────────────────────────────────────────────
function ContractListItem({ contract, isSelected, onClick }) {
  const initials = getInitials(contract.cliente);
  const integrated = isIntegrated(contract);
  const hasCX = !!(contract.responsavel_cs?.trim());
  const activePills = SERVICES.filter(s => Number(contract[s.key]) > 0);

  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        borderLeft: isSelected ? `4px solid ${C.purple}` : '4px solid transparent',
        background: isSelected ? `${C.purpleBg}80` : 'white',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          {/* Avatar Inicial */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
            background: isSelected ? C.purple : '#f3f4f6',
            color: isSelected ? 'white' : '#374151',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 700,
            boxShadow: isSelected ? `0 2px 8px ${C.purple}50` : 'none',
            transition: 'all 0.15s',
          }}>
            {initials}
          </div>

          <div style={{ overflow: 'hidden' }}>
            <p style={{
              fontSize: '0.82rem', fontWeight: 700,
              color: isSelected ? C.purple : C.darkGreen,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginBottom: '2px',
            }}>
              {contract.cliente}
            </p>
            {hasCX ? (
              <p style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 500 }}>
                CX: {contract.responsavel_cs}
              </p>
            ) : (
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, color: C.warning,
                background: C.warningBg, padding: '1px 6px', borderRadius: '4px',
                border: `1px solid #fde68a`,
              }}>
                Sem CX Atribuído
              </span>
            )}
          </div>
        </div>

        {/* Bolinha de Integração */}
        <div title={integrated ? 'Integrações OK' : 'Setup Pendente'} style={{
          width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, marginTop: '4px',
          background: integrated ? C.success : C.danger,
        }} />
      </div>

      {/* Pílulas de Serviços */}
      {activePills.length > 0 && (
        <div style={{ paddingLeft: '46px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {activePills.map(s => (
            <span key={s.key} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: isSelected ? 'white' : s.bg,
              color: s.color, padding: '2px 6px', borderRadius: '4px',
              fontSize: '0.63rem', fontWeight: 700,
              border: `1px solid ${s.color}30`,
              boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot }} />
              {s.pill}: {contract[s.key]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Painel Direito — Detalhes ────────────────────────────────────────────────
function ContractDetail({ contract, onEditClick }) {
  const bqDomains = contract.dpt_domains?.split(',').map(d => d.trim()).filter(Boolean) || [];
  const integrated = isIntegrated(contract);
  const hasCX = !!(contract.responsavel_cs?.trim());

  const sectionTitle = (text) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <h3 style={{
        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: '#9ca3af', margin: 0, whiteSpace: 'nowrap',
      }}>
        {text}
      </h3>
      <div style={{ flexGrow: 1, height: '1px', background: '#f3f4f6' }} />
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Sticky */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(4px)',
        borderBottom: '1px solid #f3f4f6', padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <h2 style={{
            fontSize: '1.25rem', fontWeight: 800, color: C.darkGreen,
            margin: '0 0 8px', letterSpacing: '-0.02em',
          }}>
            {contract.cliente}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* TODO: Substituir por dados do BD futuramente */}
            <span style={{
              fontSize: '0.7rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px',
              background: '#f9fafb', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e5e7eb',
            }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              {bqDomains[0] || 'domínio.com'}
            </span>
            {/* TODO: Substituir por dados do BD futuramente */}
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              background: C.successBg, color: '#166534',
              padding: '3px 8px', borderRadius: '6px', border: '1px solid #bbf7d0',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Contrato Ativo
            </span>
          </div>
        </div>

        {/* Botão Editar */}
        <button onClick={onEditClick} style={{
          padding: '8px 14px', background: C.darkGreen, color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Editar Contrato
        </button>
      </div>

      {/* Corpo */}
      <div style={{ padding: '24px', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Responsabilidade */}
        <div>
          {sectionTitle('Responsabilidade')}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `${C.blueBg}60`, padding: '14px 16px', borderRadius: '12px',
            border: `1px solid ${C.blue}30`,
          }}>
            {hasCX ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: C.blueBg, color: C.blue, border: `2px solid ${C.blue}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {contract.responsavel_cs.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: C.darkGreen, margin: 0 }}>
                    {contract.responsavel_cs}
                  </p>
                  <p style={{ fontSize: '0.68rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '2px 0 0' }}>
                    CSM da Conta
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: C.warningBg, color: C.warning,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', margin: 0 }}>Sem CX Atribuído</p>
                  <p style={{ fontSize: '0.7rem', color: '#a16207', margin: '2px 0 0' }}>Atribuição pendente</p>
                </div>
              </div>
            )}
            <button style={{
              fontSize: '0.72rem', fontWeight: 700, color: C.blue,
              background: 'white', padding: '6px 12px', borderRadius: '8px',
              border: `1px solid ${C.blue}40`, cursor: 'pointer',
            }}>
              {hasCX ? 'Trocar CX' : 'Atribuir CX'}
            </button>
          </div>
        </div>

        {/* Detalhes Comerciais e Estratégicos */}
        <div>
          {sectionTitle('Detalhes Comerciais e Estratégicos')}
          <div style={{
            background: 'white', padding: '16px', borderRadius: '12px',
            border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', gap: '14px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 700 }}>Nº do Contrato</p>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: C.darkGreen, margin: 0 }}>{contract.numero_contrato || '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 700 }}>Vigência</p>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: C.darkGreen, margin: 0 }}>
                  {contract.inicio_contrato || '—'} a {contract.vencimento_contrato || '—'}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Sponsor */}
              <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', fontWeight: 700 }}>Contato Sponsor</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: C.darkGreen, margin: '0 0 2px' }}>{contract.sponsor_nome || '—'}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 4px' }}>{contract.sponsor_cargo || '—'}</p>
                <p style={{ fontSize: '0.75rem', color: C.blue, margin: 0 }}>{contract.sponsor_email || '—'}</p>
              </div>

              {/* Técnicos */}
              <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', fontWeight: 700 }}>Contatos Técnicos</p>
                {contract.contatos_tecnicos && contract.contatos_tecnicos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {contract.contatos_tecnicos.map((ct, idx) => (
                      <div key={idx} style={{ borderBottom: idx < contract.contatos_tecnicos.length - 1 ? '1px solid #e5e7eb' : 'none', paddingBottom: idx < contract.contatos_tecnicos.length - 1 ? '8px' : '0' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: C.darkGreen, margin: '0 0 2px' }}>{ct.nome || '—'}</p>
                        <p style={{ fontSize: '0.75rem', color: C.blue, margin: 0 }}>{ct.email || '—'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>Nenhum registro.</p>
                )}
              </div>
            </div>

            <div>
              <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', fontWeight: 700 }}>Histórico Sensível</p>
              <div style={{ fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.5, background: '#fef3c7', padding: '12px', borderRadius: '8px', border: `1px solid #fde68a` }}>
                {contract.historico_sensivel ? contract.historico_sensivel : <span style={{ color: '#b45309', fontStyle: 'italic' }}>Nenhum histórico registrado.</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Conexões e Integrações */}
        <div>
          {sectionTitle('Conexões e Integrações')}
          <div style={{
            border: '1px solid #e5e7eb', borderRadius: '12px',
            overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {/* BigQuery */}
            <div style={{
              padding: '14px 16px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '12px',
              borderBottom: '1px solid #f3f4f6', background: 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: C.blueBg, color: C.blue, border: `1px solid ${C.blue}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <p style={{ fontSize: '0.83rem', fontWeight: 700, color: C.darkGreen, margin: 0 }}>
                      Google BigQuery (Robô)
                    </p>
                    {bqDomains.length > 0 ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                        fontSize: '0.6rem', fontWeight: 700, color: '#166534',
                        background: C.successBg, padding: '2px 7px', borderRadius: '99px',
                        textTransform: 'uppercase',
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: C.success }} />
                        Ativo
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, color: '#991b1b',
                        background: C.dangerBg, padding: '2px 7px', borderRadius: '99px',
                        textTransform: 'uppercase',
                      }}>
                        Não Configurado
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.73rem', color: '#6b7280', margin: 0, display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                    Domínios lidos:
                    {bqDomains.length > 0 ? bqDomains.map(d => (
                      <span key={d} style={{
                        fontFamily: 'monospace', fontSize: '0.71rem',
                        background: '#f3f4f6', padding: '1px 6px',
                        borderRadius: '4px', border: '1px solid #e5e7eb', color: '#374151',
                      }}>
                        {d}
                      </span>
                    )) : (
                      <span style={{ color: C.danger }}>Nenhum</span>
                    )}
                  </p>
                </div>
              </div>
              <button title="Editar Domínios" style={{
                padding: '6px', color: '#9ca3af', background: 'transparent',
                border: '1px solid transparent', borderRadius: '6px', cursor: 'pointer',
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>

            {/* Freshservice */}
            <div style={{
              padding: '14px 16px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '12px', background: 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <p style={{ fontSize: '0.83rem', fontWeight: 700, color: C.darkGreen, margin: 0 }}>
                      Freshservice (Tickets)
                    </p>
                    {contract.freshservice_dept?.trim() ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                        fontSize: '0.6rem', fontWeight: 700, color: '#166534',
                        background: C.successBg, padding: '2px 7px', borderRadius: '99px',
                        textTransform: 'uppercase',
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: C.success }} />
                        Ativo
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, color: '#991b1b',
                        background: C.dangerBg, padding: '2px 7px', borderRadius: '99px',
                        textTransform: 'uppercase',
                      }}>
                        Não Configurado
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.73rem', color: '#6b7280', margin: 0 }}>
                    Departamento alvo:{' '}
                    {contract.freshservice_dept?.trim() ? (
                      <span style={{
                        fontFamily: 'monospace', fontSize: '0.71rem',
                        background: '#f3f4f6', padding: '1px 6px',
                        borderRadius: '4px', border: '1px solid #e5e7eb', color: '#374151',
                      }}>
                        {contract.freshservice_dept}
                      </span>
                    ) : (
                      <span style={{ color: C.danger }}>Não definido</span>
                    )}
                  </p>
                </div>
              </div>
              <button title="Editar Departamento" style={{
                padding: '6px', color: '#9ca3af', background: 'transparent',
                border: '1px solid transparent', borderRadius: '6px', cursor: 'pointer',
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Volume de Contrato */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#9ca3af', margin: 0,
              }}>Volume de Contrato</h3>
              <div style={{ height: '1px', width: '60px', background: '#f3f4f6' }} />
            </div>
            <button style={{
              fontSize: '0.7rem', fontWeight: 700, color: C.purple,
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}>
              Editar Volumes
            </button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '10px',
          }}>
            {SERVICES.filter(s => Number(contract[s.key]) > 0).map(s => (
              <div key={s.key} style={{
                background: s.bg, padding: '12px', borderRadius: '10px',
                border: `1px solid ${s.color}20`, textAlign: 'center',
              }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, margin: '0 0 2px', lineHeight: 1 }}>
                  {contract[s.key]}
                </p>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, color: s.color, textTransform: 'uppercase', margin: 0 }}>
                  {s.label}
                </p>
              </div>
            ))}
            {/* Proposta Técnica */}
            {contract.proposta_tecnica_target && (
              <div style={{
                background: '#fff7ed', padding: '12px', borderRadius: '10px',
                border: '1px solid #fed7aa', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '2px' }}>📄</div>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', margin: 0 }}>
                  Proposta
                </p>
                <a href={contract.proposta_tecnica_target} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.62rem', color: C.blue, fontWeight: 600 }}>
                  Ver Link
                </a>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Modal Edição Contrato ────────────────────────────────────────────────────
function ContractEditModal({ contract, onClose, onSave, isSaving = false, saveError = '' }) {
  const [formData, setFormData] = useState({
    numero_contrato: contract.numero_contrato || '',
    inicio_contrato: contract.inicio_contrato || '',
    vencimento_contrato: contract.vencimento_contrato || '',
    sponsor_nome: contract.sponsor_nome || '',
    sponsor_cargo: contract.sponsor_cargo || '',
    sponsor_email: contract.sponsor_email || '',
    historico_sensivel: contract.historico_sensivel || '',
    contatos_tecnicos: contract.contatos_tecnicos && contract.contatos_tecnicos.length > 0 
      ? contract.contatos_tecnicos 
      : [{ nome: '', email: '' }],
    dpt_domains: contract.dpt_domains || '',
    workshop_target: contract.workshop_target || 0,
    assessment_target: contract.assessment_target || 0,
    treinamento_target: contract.treinamento_target || 0,
    maps_report_target: contract.maps_report_target || 0,
    suporte_target: contract.suporte_target || 0,
    proposta_tecnica_target: contract.proposta_tecnica_target || '',
  });

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handleTechChange = (index, field, value) => {
    const newTechs = [...formData.contatos_tecnicos];
    newTechs[index][field] = value;
    setFormData(prev => ({ ...prev, contatos_tecnicos: newTechs }));
  };
  const addTechContact = () => {
    setFormData(prev => ({ ...prev, contatos_tecnicos: [...prev.contatos_tecnicos, { nome: '', email: '' }] }));
  };
  const removeTechContact = (index) => {
    setFormData(prev => ({ ...prev, contatos_tecnicos: prev.contatos_tecnicos.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', marginBottom: '12px', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '4px' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: C.darkGreen }}>Editar Detalhes do Contrato</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.4rem' }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          
          <h3 style={{ fontSize: '0.85rem', color: C.purple, margin: '0 0 12px', borderBottom: `1px solid ${C.purpleBg}`, paddingBottom: '4px' }}>Dados do Contrato</h3>
          <label style={labelStyle}>Nº do Contrato</label>
          <input name="numero_contrato" value={formData.numero_contrato} onChange={handleChange} style={inputStyle} placeholder="Ex: CTR-2025-GEO" />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Início</label>
              <input name="inicio_contrato" value={formData.inicio_contrato} onChange={handleChange} style={inputStyle} placeholder="Jan 2025" />
            </div>
            <div>
              <label style={labelStyle}>Vencimento</label>
              <input name="vencimento_contrato" value={formData.vencimento_contrato} onChange={handleChange} style={inputStyle} placeholder="Dez 2025" />
            </div>
          </div>

          <h3 style={{ fontSize: '0.85rem', color: C.purple, margin: '16px 0 12px', borderBottom: `1px solid ${C.purpleBg}`, paddingBottom: '4px' }}>Domínios do Cliente</h3>
          <label style={labelStyle}>Domínios Registrados (Google Workspace/BigQuery)</label>
          <input name="dpt_domains" value={formData.dpt_domains} onChange={handleChange} style={inputStyle} placeholder="Ex: dominio.com.br, outro.com" />

          <h3 style={{ fontSize: '0.85rem', color: C.purple, margin: '16px 0 12px', borderBottom: `1px solid ${C.purpleBg}`, paddingBottom: '4px' }}>Volume Contratado</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Suporte</label>
              <input type="number" min="0" name="suporte_target" value={formData.suporte_target} onChange={handleChange} style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
            <div>
              <label style={labelStyle}>Maps Report</label>
              <input type="number" min="0" name="maps_report_target" value={formData.maps_report_target} onChange={handleChange} style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
            <div>
              <label style={labelStyle}>Workshop</label>
              <input type="number" min="0" name="workshop_target" value={formData.workshop_target} onChange={handleChange} style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
            <div>
              <label style={labelStyle}>Assessment</label>
              <input type="number" min="0" name="assessment_target" value={formData.assessment_target} onChange={handleChange} style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
            <div>
              <label style={labelStyle}>Treinamento</label>
              <input type="number" min="0" name="treinamento_target" value={formData.treinamento_target} onChange={handleChange} style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
          </div>
          <label style={labelStyle}>Proposta Técnica (Link)</label>
          <input name="proposta_tecnica_target" value={formData.proposta_tecnica_target} onChange={handleChange} style={inputStyle} placeholder="URL da proposta" />

          <h3 style={{ fontSize: '0.85rem', color: C.purple, margin: '16px 0 12px', borderBottom: `1px solid ${C.purpleBg}`, paddingBottom: '4px' }}>Contato Sponsor</h3>
          <label style={labelStyle}>Nome</label>
          <input name="sponsor_nome" value={formData.sponsor_nome} onChange={handleChange} style={inputStyle} placeholder="Ex: João Silva" />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Cargo</label>
              <input name="sponsor_cargo" value={formData.sponsor_cargo} onChange={handleChange} style={inputStyle} placeholder="Ex: Diretor de TI" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" name="sponsor_email" value={formData.sponsor_email} onChange={handleChange} style={inputStyle} placeholder="joao@empresa.com" />
            </div>
          </div>

          <h3 style={{ fontSize: '0.85rem', color: C.purple, margin: '16px 0 12px', borderBottom: `1px solid ${C.purpleBg}`, paddingBottom: '4px' }}>Contatos Técnicos</h3>
          {formData.contatos_tecnicos.map((tc, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end', marginBottom: '8px' }}>
              <div>
                {idx === 0 && <label style={labelStyle}>Nome Técnico</label>}
                <input value={tc.nome} onChange={e => handleTechChange(idx, 'nome', e.target.value)} style={{...inputStyle, marginBottom: 0}} placeholder="Ex: Maria" />
              </div>
              <div>
                {idx === 0 && <label style={labelStyle}>Email Técnico</label>}
                <input type="email" value={tc.email} onChange={e => handleTechChange(idx, 'email', e.target.value)} style={{...inputStyle, marginBottom: 0}} placeholder="maria@empresa.com" />
              </div>
              <button 
                type="button" 
                onClick={() => removeTechContact(idx)} 
                disabled={formData.contatos_tecnicos.length === 1}
                style={{ 
                  background: formData.contatos_tecnicos.length === 1 ? '#f3f4f6' : C.dangerBg, 
                  color: formData.contatos_tecnicos.length === 1 ? '#9ca3af' : C.danger, 
                  border: 'none', borderRadius: '6px', height: '33px', width: '33px', 
                  cursor: formData.contatos_tecnicos.length === 1 ? 'not-allowed' : 'pointer', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', paddingBottom: '2px'
                }} 
                title="Remover contato"
              >
                &times;
              </button>
            </div>
          ))}
          <button type="button" onClick={addTechContact} style={{ padding: '6px 10px', fontSize: '0.7rem', color: C.purple, background: C.purpleBg, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, marginTop: '4px' }}>
            + Adicionar Contato Técnico
          </button>

          <h3 style={{ fontSize: '0.85rem', color: C.warning, margin: '20px 0 12px', borderBottom: `1px solid ${C.warningBg}`, paddingBottom: '4px' }}>Histórico Sensível</h3>
          <label style={labelStyle}>Observações / Alinhamentos</label>
          <textarea name="historico_sensivel" value={formData.historico_sensivel} onChange={handleChange} style={{...inputStyle, minHeight: '80px', resize: 'vertical'}} placeholder="Anote aqui informações estratégicas ou sensíveis da conta..." />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px' }}>
            {saveError && (
              <p style={{ fontSize: '0.78rem', color: C.danger, background: C.dangerBg, padding: '8px 12px', borderRadius: '6px', margin: 0 }}>
                ⚠️ {saveError}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={onClose} disabled={isSaving} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancelar</button>
              <button type="submit" disabled={isSaving} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: isSaving ? '#9ca3af' : C.purple, color: 'white', fontWeight: 600, cursor: isSaving ? 'wait' : 'pointer' }}>
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterNoCX, setFilterNoCX] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const { isEditor, user } = useAuth();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSaveEdit = async (updatedData) => {
    if (!selectedId) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const role = user?.role || 'editor';
      // Mescla dados existentes do contrato com os campos editados no modal
      // para garantir que campos obrigatórios (como 'cliente') não sejam enviados como null
      const existingContract = contracts.find(c => c.id === selectedId) || {};
      const payload = { ...existingContract, ...updatedData };
      await axios.put(
        `${API_URL}/contracts/${selectedId}`,
        payload,
        { headers: { 'x-user-role': role } }
      );
      console.log('[handleSaveEdit] PUT success');
      // Atualiza estado local com dados retornados (contatos como array)
      setContracts(prev => prev.map(c =>
        c.id === selectedId ? { ...c, ...updatedData } : c
      ));
      setEditModalOpen(false);
    } catch (err) {
      console.error('[handleSaveEdit] ERROR:', err);
      const detailedError = err.response?.data?.error || `Falha (Status ${err.response?.status || 'S/Rede'}): ${err.message}`;
      setSaveError(detailedError);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => { fetchContracts(); }, []);

  const fetchContracts = async () => {
    try {
      const res = await axios.get(`${API_URL}/contracts`);
      // Parsear contatos_tecnicos de JSON para array
      const parsed = res.data.map(c => ({
        ...c,
        contatos_tecnicos: c.contatos_tecnicos
          ? (typeof c.contatos_tecnicos === 'string' ? JSON.parse(c.contatos_tecnicos) : c.contatos_tecnicos)
          : []
      }));
      setContracts(parsed);
      if (parsed.length > 0) setSelectedId(parsed[0].id);
    } catch (e) {
      console.error('Erro ao buscar contratos:', e);
    } finally {
      setLoading(false);
    }
  };

  const noCXCount = useMemo(() => contracts.filter(c => !c.responsavel_cs?.trim()).length, [contracts]);

  const filtered = useMemo(() => {
    return contracts.filter(c => {
      const matchSearch = c.cliente.toLowerCase().includes(search.toLowerCase()) ||
        (c.dpt_domains || '').toLowerCase().includes(search.toLowerCase());
      const matchCX = !filterNoCX || !c.responsavel_cs?.trim();
      return matchSearch && matchCX;
    });
  }, [contracts, search, filterNoCX]);

  const selectedContract = contracts.find(c => c.id === selectedId) || null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: `3px solid ${C.purple}`, borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 10px',
          }} />
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Carregando contratos...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px', background: 'white',
        padding: '14px 20px', borderRadius: '12px',
        border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexShrink: 0,
      }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.darkGreen, margin: 0 }}>
            Configuração de Contratos e Metas
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '3px 0 0' }}>
            {contracts.length} Contratos •{' '}
            <span style={{ color: noCXCount > 0 ? C.warning : C.success, fontWeight: 600 }}>
              {noCXCount} Sem CX Atribuído
            </span>
          </p>
        </div>
        {isEditor && (
          <button style={{
            padding: '8px 16px', background: C.purple, color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Novo Contrato
          </button>
        )}
      </div>

      {/* Split-View */}
      <div style={{
        display: 'flex', gap: '16px', flex: 1,
        overflow: 'hidden', minHeight: '500px',
      }}>
        {/* Coluna Esquerda */}
        <div style={{
          width: '42%', flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'white', borderRadius: '12px',
          border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}>
          {/* Barra de Pesquisa e Filtro */}
          <div style={{ padding: '12px', borderBottom: '1px solid #f3f4f6', background: '#fafafa', flexShrink: 0 }}>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
                width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Procurar cliente ou domínio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', paddingLeft: '32px', paddingRight: '10px',
                  paddingTop: '7px', paddingBottom: '7px', fontSize: '0.78rem',
                  border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none',
                  fontFamily: 'inherit', background: 'white',
                }}
                onFocus={e => e.target.style.borderColor = C.purple}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setFilterNoCX(false)} style={{
                padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700, borderRadius: '99px',
                border: '1px solid transparent', cursor: 'pointer',
                background: !filterNoCX ? '#374151' : '#f3f4f6',
                color: !filterNoCX ? 'white' : '#374151',
              }}>
                Todos ({contracts.length})
              </button>
              <button onClick={() => setFilterNoCX(true)} style={{
                padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700, borderRadius: '99px',
                border: `1px solid ${filterNoCX ? C.warning : '#e5e7eb'}`, cursor: 'pointer',
                background: filterNoCX ? C.warningBg : 'white',
                color: filterNoCX ? '#92400e' : '#6b7280',
              }}>
                Sem CX ({noCXCount})
              </button>
            </div>
          </div>

          {/* Lista */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', fontSize: '0.82rem' }}>
                Nenhum contrato encontrado.
              </div>
            ) : filtered.map(c => (
              <ContractListItem
                key={c.id}
                contract={c}
                isSelected={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
              />
            ))}
          </div>
        </div>

        {/* Coluna Direita */}
        <div style={{
          flex: 1, background: 'white', borderRadius: '12px',
          border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}>
          {selectedContract ? (
            <ContractDetail contract={selectedContract} onEditClick={() => setEditModalOpen(true)} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {isEditModalOpen && selectedContract && (
        <ContractEditModal 
          contract={selectedContract} 
          onClose={() => { setEditModalOpen(false); setSaveError(''); }} 
          onSave={handleSaveEdit}
          isSaving={isSaving}
          saveError={saveError}
        />
      )}
    </div>
  );
}
