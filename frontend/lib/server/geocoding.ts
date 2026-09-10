// Cache simples em memória da instância serverless
const cache = new Map<string, { lat: number; lon: number; name: string }>();

export async function getCoordinatesFromCEP(cep: string): Promise<{ lat: number; lon: number; name: string }> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) throw new Error('CEP inválido. Digite 8 dígitos numéricos.');

  if (cache.has(cleanCep)) {
    return cache.get(cleanCep)!;
  }

  // 1. Tentar BrasilAPI v2 (retorna coordenadas lat/lon nativas com alta precisão para CEPs brasileiros)
  try {
    const brasilApiRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (brasilApiRes.ok) {
      const data = await brasilApiRes.json();
      const coords = data.location?.coordinates;
      if (coords?.latitude && coords?.longitude) {
        const lat = parseFloat(coords.latitude);
        const lon = parseFloat(coords.longitude);
        const name = `${data.street ? data.street + ', ' : ''}${data.neighborhood ? data.neighborhood + ', ' : ''}${data.city} - ${data.state}`;
        const result = { lat, lon, name };
        cache.set(cleanCep, result);
        return result;
      }
    }
  } catch (e) {
    // Continuar para fallback ViaCEP
  }

  // 2. Fallback: ViaCEP + Nominatim
  try {
    const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!viaCepRes.ok) throw new Error('CEP não encontrado na base nacional.');
    const viaData = await viaCepRes.json();
    if (viaData.erro) throw new Error('CEP não localizado.');

    const { localidade, uf, logradouro } = viaData;
    const query = `${logradouro ? logradouro + ', ' : ''}${localidade}, ${uf}, Brasil`;

    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const nomRes = await fetch(nomUrl, {
      headers: { 'User-Agent': 'GeoShield-Monitor-TCC/2.0 (contato@geoshield.edu)' }
    });

    const nomData = await nomRes.json();

    if (nomData && nomData.length > 0) {
      const result = {
        lat: parseFloat(nomData[0].lat),
        lon: parseFloat(nomData[0].lon),
        name: `${logradouro ? logradouro + ', ' : ''}${localidade} - ${uf}`
      };
      cache.set(cleanCep, result);
      return result;
    }

    // Fallback apenas pela cidade se o logradouro falhar no OpenStreetMap
    const cityUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${localidade}, ${uf}, Brasil`)}&format=json&limit=1`;
    const cityRes = await fetch(cityUrl, {
      headers: { 'User-Agent': 'GeoShield-Monitor-TCC/2.0 (contato@geoshield.edu)' }
    });
    const cityData = await cityRes.json();

    if (cityData && cityData.length > 0) {
      const result = {
        lat: parseFloat(cityData[0].lat),
        lon: parseFloat(cityData[0].lon),
        name: `${localidade} - ${uf}`
      };
      cache.set(cleanCep, result);
      return result;
    }

    throw new Error('Coordenadas geográficas não encontradas para este CEP.');
  } catch (err: any) {
    throw new Error(err.message || 'Falha no serviço de localização geográfica.');
  }
}

export async function getCoordinatesFromQuery(query: string): Promise<{ lat: number; lon: number; name: string }> {
  const cleanQuery = query.trim();
  if (!cleanQuery) throw new Error('Consulta de busca não pode estar vazia.');

  const isCep = /^\d{5}-?\d{3}$/.test(cleanQuery) || /^\d{8}$/.test(cleanQuery);
  if (isCep) {
    return getCoordinatesFromCEP(cleanQuery);
  }

  if (cache.has(cleanQuery)) {
    return cache.get(cleanQuery)!;
  }

  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery + ', Brasil')}&format=json&limit=1`;
    const nomRes = await fetch(nomUrl, {
      headers: { 'User-Agent': 'GeoShield-Monitor-TCC/2.0 (contato@geoshield.edu)' }
    });

    const nomData = await nomRes.json();

    if (!nomData || nomData.length === 0) {
      throw new Error(`Endereço "${cleanQuery}" não encontrado.`);
    }

    const result = {
      lat: parseFloat(nomData[0].lat),
      lon: parseFloat(nomData[0].lon),
      name: nomData[0].display_name
    };

    cache.set(cleanQuery, result);
    return result;
  } catch (err: any) {
    throw new Error(err.message || 'Falha ao buscar endereço.');
  }
}
