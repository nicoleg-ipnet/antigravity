const RENDER_BASE_URL = "https://antigravity-pu34.onrender.com/api";
const SECRET_BOT_TOKEN = "csm_bot_secure_123";

/**
 * Função principal do Google Chat para mensagens de texto
 */
function onMessage(event) {
  console.log("Evento onMessage recebido:", JSON.stringify(event));
  const isGeo = (event.message && event.message.text && event.message.text.includes('/geo'));
  if (isGeo) return createActivityFormCard();
  return { text: "Olá! Use o comando */geo* para abrir o formulário de registo de atividades." };
}

/**
 * Função obrigatória para comandos de barra (Slash Commands) configurados na Consola Cloud
 */
function onAppCommand(event) {
  console.log("Evento onAppCommand recebido:", JSON.stringify(event));
  // O ID 1 foi o que configuramos na Consola Cloud para o /geo
  if (event.appCommandId == "1") {
    return createActivityFormCard();
  }
}

/**
 * Busca clientes no Render com timeout e tratamento de erro
 */
function getClients() {
  const url = RENDER_BASE_URL + "/contracts";
  try {
    const response = UrlFetchApp.fetch(url, { 
      muteHttpExceptions: true,
      headers: { "Accept": "application/json" }
  const lista = [
    {id: 1, nome: "IPNET - GMP - SERPRO"},
    {id: 2, nome: "IPNET - GMP - ITAIPU"},
    {id: 3, nome: "IPNET - GMP - MOBI LOGISTICA"},
    {id: 4, nome: "IPNET - GMP - Omni Brasil"},
    {id: 5, nome: "IPNET - GMP - BAT BRASIL"},
    {id: 6, nome: "IPNET - GMP - TELECOM TRACK"},
    {id: 7, nome: "IPNET - GMP - Serasa Experian"},
    {id: 8, nome: "IPNET - GMP - Prodam"},
    {id: 9, nome: "IPNET - GMP - OI/VTal"},
    {id: 10, nome: "IPNET - GMP - Belotur"},
    {id: 11, nome: "IPNET - GMP - EMPREL/ PRODABEL"},
    {id: 12, nome: "IPNET - GMP - PETROBRAS"},
    {id: 13, nome: "IPNET - GMP - TCE - Pernambuco"},
    {id: 14, nome: "IPNET - GMP - SEPLAG"},
    {id: 15, nome: "IPNET - GMP - IMA"},
    {id: 16, nome: "IPNET - GMP - GM Rio"},
    {id: 17, nome: "IPNET - GMP - FIEC"},
    {id: 18, nome: "IPNET - GMP - Salvador (SEMIT)"},
    {id: 19, nome: "IPNET - GMP - Indaiatuba"},
    {id: 20, nome: "IPNET - GMP - Banco do Brasil"},
    {id: 21, nome: "IPNET - GMP - AplicaBus"},
    {id: 22, nome: "IPNET - GMP - Gaudium"}
  ];
  
  return lista.map(c => ({ 
    text: c.nome, 
    value: c.id.toString() + "|||" + c.nome 
  }));
}

function createActivityFormCard() {
  const clients = getClients();
  
  const today = new Date();
  const tzOffset = today.getTimezoneOffset() * 60000;
  const localDate = (new Date(today - tzOffset)).toISOString().split('T')[0];

  return {
    "cardsV2": [{
      "cardId": "activity_form",
      "card": {
        "header": {
          "title": "Novo Log de Atividade",
          "subtitle": "Preencha os detalhes da entrega",
          "imageUrl": "https://cdn-icons-png.flaticon.com/512/3233/3233483.png"
        },
        "sections": [{
          "widgets": [
            { "selectionInput": { "type": "DROPDOWN", "label": "Cliente", "name": "cliente_data", "items": clients } },
            { "selectionInput": { "type": "DROPDOWN", "label": "Serviço", "name": "tipo_entrega", "items": [
              {"text": "Workshop", "value": "Workshop", "selected": true},
              {"text": "Assessment", "value": "Assessment"},
              {"text": "Treinamento", "value": "Treinamento"},
              {"text": "Maps Report", "value": "Maps Report"},
              {"text": "Suporte", "value": "Suporte"},
              {"text": "Proposta técnica", "value": "Proposta técnica"}
            ]}},
            { "selectionInput": { "type": "DROPDOWN", "label": "Status", "name": "status_entrega", "items": [
              {"text": "Sucesso", "value": "Sucesso", "selected": true},
              {"text": "No-show", "value": "No-show"},
              {"text": "Reagendado", "value": "Reagendado"}
            ]}},
            { "selectionInput": { "type": "DROPDOWN", "label": "Responsável", "name": "responsavel", "items": [
              {"text": "Nicole Guimarães", "value": "Nicole Guimarães", "selected": true},
              {"text": "Caio Henrique", "value": "Caio Henrique"},
              {"text": "Thiago Alves", "value": "Thiago Alves"}
            ]}},
            { "textInput": { "name": "data_manual", "label": "Data (AAAA-MM-DD)", "value": localDate } },
            { "selectionInput": { "type": "DROPDOWN", "label": "Engajamento", "name": "engajamento", "items": [
              {"text": "5 - Excelente", "value": "5", "selected": true},
              {"text": "4 - Bom", "value": "4"},
              {"text": "3 - Regular", "value": "3"},
              {"text": "2 - Baixo", "value": "2"},
              {"text": "1 - Crítico", "value": "1"}
            ]}},
            { "selectionInput": { "type": "DROPDOWN", "label": "Alerta de Risco?", "name": "teve_risco", "items": [
              {"text": "Não", "value": "Não", "selected": true},
              {"text": "Sim", "value": "Sim"}
            ]}},
            { "textInput": { "name": "obs", "label": "Observações / Motivo do Risco", "type": "MULTIPLE_LINE" } },
            { "buttonList": { "buttons": [{
              "text": "Salvar Agora",
              "onClick": { "action": { "function": "handleFormSubmit" } }
            }]}}
          ]
        }]
      }
    }]
  };
}

function handleFormSubmit(event) {
  const inputs = event.common.formInputs;
  
  try {
    const rawCliente = inputs.cliente_data.stringInputs.value[0].split("|||");
    const payload = {
      cliente_id: parseInt(rawCliente[0]),
      responsavel_atendimento: inputs.responsavel.stringInputs.value[0],
      tipo_entrega: inputs.tipo_entrega.stringInputs.value[0],
      status_entrega: inputs.status_entrega.stringInputs.value[0],
      engajamento: parseInt(inputs.engajamento.stringInputs.value[0]),
      temperatura: parseInt(inputs.engajamento.stringInputs.value[0]) >= 4 ? "Quente" : "Fria",
      alerta_risco: inputs.teve_risco.stringInputs.value[0] === "Sim" ? (inputs.obs.stringInputs.value[0] || "Risco Reportado") : "Nenhum (Tudo certo)",
      observacoes: (inputs.obs.stringInputs.value[0] || "") + " | Via Chat (" + event.user.email + ")",
      data_manual: inputs.data_manual.stringInputs.value[0],
      bot_auth_token: SECRET_BOT_TOKEN
    };

    const res = UrlFetchApp.fetch(RENDER_BASE_URL + "/bot/log", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() >= 400) {
      return { text: "❌ Erro no Servidor (" + res.getResponseCode() + "): " + res.getContentText() };
    }

    return { text: "✅ Atividade registada com sucesso para *" + rawCliente[1] + "*!" };

  } catch (e) {
    console.error("Erro no Submit:", e.message);
    return { text: "❌ Erro ao processar formulário: " + e.message };
  }
}
