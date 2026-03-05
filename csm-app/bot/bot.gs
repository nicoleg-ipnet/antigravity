const RENDER_API_URL = "https://antigravity-pu34.onrender.com/api/bot/log";
const CONTRACTS_API_URL = "https://antigravity-pu34.onrender.com/api/contracts";
const SECRET_BOT_TOKEN = "csm_bot_secure_123";

/**
 * Função acionada quando o bot recebe uma mensagem (como "/geo")
 */
function onMessage(event) {
  if (event.message.text.includes('/geo')) {
    return createActivityFormCard();
  }
  return { text: "Comando não reconhecido. Use /geo para registar uma nova atividade." };
}

/**
 * Função auxiliar para buscar os clientes dinamicamente na nuvem (Render)
 */
function getClients() {
  try {
    const response = UrlFetchApp.fetch(CONTRACTS_API_URL);
    const contracts = JSON.parse(response.getContentText());
    
    return contracts.map(c => ({
      text: c.cliente,
      // Codificamos o ID e o Nome no valor para os usarmos mais tarde no submit
      value: c.id.toString() + "|||" + c.cliente,
      selected: false
    }));
  } catch (e) {
    return [{ text: "Erro ao carregar clientes", value: "0|||Erro", selected: true }];
  }
}

/**
 * Cria o Card Interativo Form
 */
function createActivityFormCard() {
  const clients = getClients();
  if (clients.length > 0) {
      clients[0].selected = true;
  }

  // Obter data de hoje no formato YYYY-MM-DD para default
  const today = new Date();
  const tzOffset = today.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(today - tzOffset)).toISOString().split('T')[0];

  const card = {
    "cardsV2": [
      {
        "cardId": "activity_form_card",
        "card": {
          "header": {
            "title": "Registo de Atividade / Log",
            "subtitle": "Atualize o status das entregas",
            "imageUrl": "https://cdn-icons-png.flaticon.com/512/3233/3233483.png",
            "imageType": "CIRCLE"
          },
          "sections": [
            {
              "widgets": [
                {
                  "selectionInput": {
                    "type": "DROPDOWN",
                    "label": "Cliente",
                    "name": "cliente_data",
                    "items": clients
                  }
                },
                {
                  "selectionInput": {
                    "type": "DROPDOWN",
                    "label": "Serviço Prestado",
                    "name": "tipo_entrega",
                    "items": [
                      {"text": "Workshop", "value": "Workshop", "selected": true},
                      {"text": "Assessment", "value": "Assessment", "selected": false},
                      {"text": "Treinamento", "value": "Treinamento", "selected": false},
                      {"text": "Maps Report", "value": "Maps Report", "selected": false},
                      {"text": "Suporte", "value": "Suporte", "selected": false},
                      {"text": "Proposta técnica", "value": "Proposta técnica", "selected": false}
                    ]
                  }
                },
                {
                  "selectionInput": {
                    "type": "DROPDOWN",
                    "label": "Status da Atividade",
                    "name": "status_entrega",
                    "items": [
                      {"text": "Sucesso", "value": "Sucesso", "selected": true},
                      {"text": "No-show", "value": "No-show", "selected": false},
                      {"text": "Reagendado", "value": "Reagendado", "selected": false}
                    ]
                  }
                },
                {
                  "selectionInput": {
                    "type": "DROPDOWN",
                    "label": "Responsável pelo Atendimento",
                    "name": "responsavel_atendimento",
                    "items": [
                      {"text": "Nicole Guimarães", "value": "Nicole Guimarães", "selected": true},
                      {"text": "Caio Henrique", "value": "Caio Henrique", "selected": false},
                      {"text": "Thiago Alves", "value": "Thiago Alves", "selected": false}
                    ]
                  }
                },
                {
                  "textInput": {
                    "name": "data",
                    "label": "Data da Atividade (AAAA-MM-DD)",
                    "value": localISOTime
                  }
                },
                {
                  "selectionInput": {
                    "type": "DROPDOWN",
                    "label": "Nível de Engajamento do Cliente",
                    "name": "engajamento",
                    "items": [
                      {"text": "5 - Excelente", "value": "5", "selected": true},
                      {"text": "4 - Muito Bom", "value": "4", "selected": false},
                      {"text": "3 - Bom", "value": "3", "selected": false},
                      {"text": "2 - Regular", "value": "2", "selected": false},
                      {"text": "1 - Fraco", "value": "1", "selected": false}
                    ]
                  }
                },
                {
                  "selectionInput": {
                    "type": "DROPDOWN",
                    "label": "Houve Alerta de Risco?",
                    "name": "teve_risco",
                    "items": [
                      {"text": "Não", "value": "Não", "selected": true},
                      {"text": "Sim", "value": "Sim", "selected": false}
                    ]
                  }
                },
                {
                  "textInput": {
                    "name": "observacoes",
                    "label": "Observações ou Motivo do Risco",
                    "type": "MULTIPLE_LINE"
                  }
                }
              ]
            },
            {
              "widgets": [
                {
                  "buttonList": {
                    "buttons": [
                      {
                        "text": "Salvar no Dashboard",
                        "color": {
                          "red": 0.1,
                          "green": 0.7,
                          "blue": 0.5,
                          "alpha": 1.0
                        },
                        "onClick": {
                          "action": {
                            "function": "handleFormSubmit"
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  };
  return card;
}

/**
 * Função acionada quando o botão "Salvar no Dashboard" é clicado
 */
function handleFormSubmit(event) {
  const inputs = event.common.formInputs;
  
  // Extrair valores
  const clienteData = inputs.cliente_data.stringInputs.value[0].split("|||");
  const cliente_id = clienteData[0];
  const cliente_nome = clienteData[1];
  
  const tipo_entrega = inputs.tipo_entrega.stringInputs.value[0];
  const status_entrega = inputs.status_entrega.stringInputs.value[0];
  const responsavel_atendimento = inputs.responsavel_atendimento.stringInputs.value[0];
  const engajamento = inputs.engajamento.stringInputs.value[0];
  const teve_risco = inputs.teve_risco.stringInputs.value[0];
  
  let observacoesRaw = "";
  if (inputs.observacoes && inputs.observacoes.stringInputs && inputs.observacoes.stringInputs.value) {
    observacoesRaw = inputs.observacoes.stringInputs.value[0];
  }

  const email_sender = event.user.email;
  const data = inputs.data ? inputs.data.stringInputs.value[0] : new Date().toISOString().split('T')[0];

  let alerta_risco = "Nenhum (Tudo certo)";
  let observacoesFinal = observacoesRaw;

  // Lógica se usuário marcou "Houve Risco: Sim"
  if (teve_risco === "Sim") {
     alerta_risco = observacoesRaw.trim() !== "" ? observacoesRaw : "Alerta de Risco Reportado (Sem justificação)";
     observacoesFinal = "[ALERTA REPORTADO PELO CHAT]";
  }

  // Prepara dados para enviar à API do Render
  const payload = {
    cliente_id: parseInt(cliente_id),
    responsavel_atendimento: responsavel_atendimento,
    tipo_entrega: tipo_entrega,
    status_entrega: status_entrega,
    engajamento: parseInt(engajamento),
    temperatura: engajamento >= 4 ? "Quente" : (engajamento == 3 ? "Morna" : "Fria"),
    alerta_risco: alerta_risco,
    observacoes: observacoesFinal + " | Enviado via Google Chat (" + email_sender + ")",
    bot_auth_token: SECRET_BOT_TOKEN
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(RENDER_API_URL, options);
    
    // Sucesso - Retorna mensagem no chat para confirmar ação
    return {
      actionResponse: {
        type: "NEW_MESSAGE"
      },
      text: "✅ Atividade registada com código de sucesso para o cliente *" + cliente_nome + "* no serviço *" + tipo_entrega + "*!"
    };
  } catch (e) {
    return {
      actionResponse: {
        type: "NEW_MESSAGE"
      },
      text: "❌ Ocorreu um erro de conexão com o sistema. Motivo: " + e.message
    };
  }
}
