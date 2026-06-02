const axios = require('axios');

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

async function axiosGet(url, options = {}) {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT_MS || 15000);
  
  const response = await axios.get(url, {
    timeout,
    headers: { ...HTTP_HEADERS, ...options.headers },
    ...options
  });
  
  return response;
}

async function axiosPost(url, data, options = {}) {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT_MS || 15000);
  
  const response = await axios.post(url, data, {
    timeout,
    headers: { ...HTTP_HEADERS, ...options.headers },
    ...options
  });
  
  return response;
}

module.exports = { axiosGet, axiosPost, HTTP_HEADERS };