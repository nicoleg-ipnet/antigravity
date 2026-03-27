# Documentação Técnica - PULSO (MVP)

## 1. Visão Geral do Produto
O **PULSO (Plataforma de Unificação, Logs e Sucesso Operacional)** é uma ferramenta de gestão estratégica projetada para o acompanhamento do Customer Success (CS) da IPNET. 

**Problema que resolve:** 
Atualmente na versão MVP local, o sistema centraliza a governança de contratos, a visibilidade de execução de serviços (Workshops, Assessments, Treinamentos, etc.) e o engajamento do cliente. Ele soluciona a dor de informações fragmentadas ao fornecer uma **Visão 360** da carteira de clientes, facilitando o acompanhamento de metas contratuais, identificação proativa de riscos de *churn* (alertas de risco) e o histórico de atividades e logs operacionais em uma única interface.

---

## 2. Stack Tecnológica Atual (MVP)

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **Roteamento:** React Router DOM
- **Gráficos e UI:** Recharts (para visualização de dados) e Lucide-React (ícones)
- **Estilização:** CSS puro com variáveis globais (sem Tailwind configurado no package.json, porém utilizando um design system moderno).

### Backend
- **Ambiente:** Node.js
- **Framework Web:** Express.js
- **CORS:** Ativado para comunicação entre portas (via biblioteca `cors`)

### Banco de Dados
- **Relacional em Arquivo:** SQLite (via biblioteca `sqlite3`)

---

## 3. Arquitetura de Banco de Dados

O banco de dados funciona localmente e está contido no arquivo físico `server/csm.db`. A inicialização e as migrações automáticas de esquema ("schema") estão definidas no arquivo `server/database.js`. Toda vez que o servidor é iniciado, ele verifica e injeta as colunas e tabelas necessárias caso não existam.

### Principais Tabelas e Entidades

1. **`contracts` (Contratos e Clientes)**
   - **Campos Principais:** `id`, `cliente`, `numero_contrato`, `inicio_contrato`, `vencimento_contrato`, `responsavel_cs` (O `PULSO da Conta`), `dpt_domains` (domínios para integração).
   - **Volumes (Targets):** Metas de `workshop_target`, `suporte_target`, etc.
   - **Contatos:** `sponsor_nome`, `sponsor_email`, `contatos_tecnicos` (em JSON).
   - **Detalhes Estratégicos:** `historico_sensivel` e `dores_caso_uso`.

2. **`activities` (Log de Atividades e Logs Operacionais)**
   - **Relacionamento:** Vinculada a um contrato (`contract_id`).
   - **Campos Principais:** `data`, `responsavel_atendimento`, `tipo_entrega` (ex: Workshop, Suporte), `status_entrega`.
   - **Saúde do Cliente:** `engajamento` (1 a 5), `temperatura`, `alerta_risco` e `observacoes`.

3. **`usuarios` (Autenticação)**
   - **Campos Principais:** `nome`, `email`, `senha`, `role` (editor ou viewer).

---

## 4. Mapa de Arquivos (Directory Structure)

Uma visão simplificada da arquitetura de diretórios do projeto:

```text
csm-app/
│
├── client/                     # Frontend da aplicação (React)
│   ├── index.html              # Ponto de entrada do documento HTML
│   ├── package.json            # Dependências do frontend
│   └── src/
│       ├── App.jsx             # Estrutura principal, Layout (Sidebar) e Roteamento
│       └── components/         # Componentes Visuais do Sistema
│           ├── GlobalDashboard.jsx  # Renderiza métricas executivas e painel global
│           ├── Dashboard.jsx        # Visão de execução da Carteira de Clientes (Realizado vs Contratado)
│           ├── Contracts.jsx        # Módulo de cadastro e gestão detalhada dos contratos
│           ├── ClientDashboard.jsx  # Visão 360º de um único cliente (termômetro e histórico)
│           ├── ActivityLog.jsx      # Tabela central de logs e registro de novas atividades
│           └── Login.jsx            # Autenticação e entrada de usuários
│
├── server/                     # Backend da aplicação (Node.js)
│   ├── package.json            # Dependências do servidor
│   ├── index.js                # Arquivo principal: Servidor Express e todas as rotas da API
│   ├── database.js             # Configuração, criação de tabelas e injeção de dados no SQLite
│   └── csm.db                  # Arquivo físico do Banco de Dados local
```

---

## 5. Fluxo de Integrações (Webhooks)

Para automatizar a entrada de dados de outras plataformas (como o Chat do Google ou Freshservice), o sistema possui rotas dedicadas (`webhooks`) no backend que permitem inserções remotas:

- **`POST /api/bot/log`**: Endpoint criado explicitamente para receber *payloads* externos (ex: Google Apps Script). Valida a requisição através de um token hardcoded (`bot_auth_token`) e insere o registro operacional dietamente na tabela `activities`.
- **`POST /api/import-bq`**: Endpoint (mapeado em `import_bq.js`) que processa eventuais sincronizações de métricas provenientes de cargas de dados do BigQuery com base nos domínios do cliente (`dpt_domains`).

---

## 6. Roadmap Técnico (Próximos Passos)

Visando a transição do ambiente MVP local para um ambiente *Enterprise* seguro na infraestrutura Google Cloud (GCP) da IPNET, as próximas etapas profundas de refatoração incluem:

1. **Criação de Variáveis de Ambiente (`.env`):** Remoção de credenciais, portas e tokens sensíveis diretamente do código base (hardcoded) para torná-los injetáveis via ambiente.
2. **Versionamento no Git:** Inicialização de repositório seguro para rastreabilidade do código fonte e colaboração contínua.
3. **Migração do SQLite para PostgreSQL (Cloud SQL):** Troca do banco de dados de arquivo local para uma arquitetura relacional robusta, escalável e de alta disponibilidade nativa do Google Cloud.
4. **Hospedagem no ambiente CSI da IPNET:** Preenchimento de *pipelines* e *deploy* em orquestradores em nuvem (como Cloud Run ou App Engine) para o cliente final, garantindo acesso web global.
