/**
 * Script para automatizar o envio de tickets do BigQuery para o CSM App.
 * Este script deve rodar no Google Apps Script vinculado à conta Google da empresa.
 * 
 * ATENÇÃO: É necessário habilitar o "Serviço Adicional" -> "BigQuery API" no editor do Apps Script 
 * (menu à esquerda -> Serviços + -> BigQuery API).
 */

function exportBigQueryToCSM() {
  // CONFIGURAÇÕES
  const projectId = 'ipnet-freshservice';
  // Substitua pela URL de Produção do Render quando for pro Ar
  const targetUrl = 'https://csm-app-sua-url.onrender.com/api/import-bq'; 
  
  // Consulta apenas as atividades fechadas nos últimos 5 dias para não pesar muito
  // (A API do CSM App na tabela 'activities' não replica ID repetido)
  const query = `
    SELECT
      t.id, t.subject, t.requesters_first_name, t.dpt_domains, 
      t.status, t.agent_first_name, t.item_category, tr.csat_score, t.closed_at
    FROM
      \`ipnet-freshservice.FreshService_prd_semanticmodel.tickets\` as t 
    LEFT JOIN 
      \`billing-accounts-dashboard.tracksale.fato_tracksale_freshservice_distinct\` as tr on t.id=tr.id 
    WHERE 
      (t.status="Resolvido" or t.status="Encerrado") 
      AND t.agent_group_name="MS Geo" 
      AND t.category like "%MSP%" 
      AND UPPER(t.sub_category) LIKE "%GEO%"
      AND t.closed_at >= DATETIME_SUB(CURRENT_DATETIME(), INTERVAL 5 DAY);
  `;

  const request = {
    query: query,
    useLegacySql: false
  };

  let queryResults;
  try {
    queryResults = BigQuery.Jobs.query(request, projectId);
  } catch (e) {
    console.error('Erro ao consultar BigQuery:', e);
    return;
  }

  const jobId = queryResults.jobReference.jobId;
  let sleepTimeMs = 500;
  while (!queryResults.jobComplete) {
    Utilities.sleep(sleepTimeMs);
    sleepTimeMs *= 2;
    queryResults = BigQuery.Jobs.getQueryResults(projectId, jobId);
  }

  const rows = queryResults.rows;
  if (!rows || rows.length === 0) {
    console.log('Nenhum dado novo encontrado nesta janela de 5 dias.');
    return;
  }

  // Extrai e formata o resultado
  const headers = queryResults.schema.fields.map(f => f.name);
  const dataPayload = [];

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].f;
    let rowObj = {};
    for (let j = 0; j < cols.length; j++) {
      rowObj[headers[j]] = cols[j].v;
    }
    dataPayload.push(rowObj);
  }

  console.log('Enviando ' + dataPayload.length + ' registros recentes para a API do CSM...');

  // Dispara POST para a API
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(dataPayload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(targetUrl, options);
    console.log('Resposta da API CSM:', response.getContentText());
  } catch (err) {
    console.error('Erro ao chamar a API:', err);
  }
}
