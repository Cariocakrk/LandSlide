import axios from 'axios';

// Cache simples para evitar sobrecarga no ViaCEP e Nominatim
const cache = new Map<string, { lat: number, lon: number, name: string }>();

export const getCoordinatesFromCEP = async (cep: string) => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) throw new Error('CEP inválido');

  // 1. Check cache
  if (cache.has(cleanCep)) {
    return cache.get(cleanCep)!;
  }

  try {
    // 2. Buscar cidade no ViaCEP
    const viaCepUrl = `https://viacep.com.br/ws/${cleanCep}/json/`;
    const viaCepRes = await axios.get(viaCepUrl);
    
    if (viaCepRes.data.erro) {
      throw new Error('CEP não encontrado');
    }

    const { localidade, uf, logradouro } = viaCepRes.data;
    const query = `${logradouro ? logradouro + ', ' : ''}${localidade}, ${uf}, Brasil`;

    // 3. Converter em Lat/Lng usando Nominatim (OpenStreetMap)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search`;
    const nomRes = await axios.get(nominatimUrl, {
      params: { q: query, format: 'json', limit: 1 },
      headers: {
        'User-Agent': 'Landslide-Monitor-TCC/1.0' // Nominatim requires User-Agent
      }
    });

    if (!nomRes.data || nomRes.data.length === 0) {
      // Fallback: Busca apenas pela cidade se o endereço completo falhar
      const fallbackNomRes = await axios.get(nominatimUrl, {
        params: { q: `${localidade}, ${uf}, Brasil`, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'Landslide-Monitor-TCC/1.0' }
      });
      
      if (!fallbackNomRes.data || fallbackNomRes.data.length === 0) {
          throw new Error('Coordenadas geográficas não encontradas para este CEP');
      }
      
      const result = {
        lat: parseFloat(fallbackNomRes.data[0].lat),
        lon: parseFloat(fallbackNomRes.data[0].lon),
        name: localidade
      };
      cache.set(cleanCep, result);
      return result;
    }

    const result = {
      lat: parseFloat(nomRes.data[0].lat),
      lon: parseFloat(nomRes.data[0].lon),
      name: `${logradouro}, ${localidade}`
    };
    
    cache.set(cleanCep, result);
    return result;

  } catch (error: any) {
    if (error.message.includes('CEP')) throw error;
    throw new Error('Falha ao processar provedor de Geocoding Externo.');
  }
};

export const getCoordinatesFromQuery = async (query: string) => {
  const cleanQuery = query.trim();
  if (!cleanQuery) throw new Error('Query de pesquisa vazia');

  // Se for CEP (formato 12345-678 ou 12345678)
  const isCep = /^\d{5}-?\d{3}$/.test(cleanQuery) || /^\d{8}$/.test(cleanQuery);
  if (isCep) {
    return getCoordinatesFromCEP(cleanQuery);
  }

  // Se for endereço comum, buscar direto no Nominatim
  if (cache.has(cleanQuery)) {
    return cache.get(cleanQuery)!;
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search`;
    const nomRes = await axios.get(nominatimUrl, {
      params: { q: cleanQuery, format: 'json', limit: 1 },
      headers: {
        'User-Agent': 'Landslide-Monitor-TCC/1.0'
      }
    });

    if (!nomRes.data || nomRes.data.length === 0) {
      throw new Error('Endereço não encontrado');
    }

    const result = {
      lat: parseFloat(nomRes.data[0].lat),
      lon: parseFloat(nomRes.data[0].lon),
      name: nomRes.data[0].display_name
    };

    cache.set(cleanQuery, result);
    return result;
  } catch (error: any) {
    if (error.message.includes('não encontrado')) throw error;
    throw new Error('Falha ao processar provedor de Geocoding Externo.');
  }
};

