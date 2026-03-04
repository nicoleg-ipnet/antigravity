// Configuração centralizada da API
// Em produção a API estará no mesmo endereço da aplicação
const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

export default API_URL;
