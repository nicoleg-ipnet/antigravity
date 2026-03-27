// Configuração centralizada da API
// Em produção a API estará no mesmo endereço da aplicação
// Usar window.location.hostname permite que outras pessoas na mesma rede local (Wi-Fi) acessem a API.
const API_URL = import.meta.env.DEV ? `http://${window.location.hostname}:3000/api` : '/api';

export default API_URL;
