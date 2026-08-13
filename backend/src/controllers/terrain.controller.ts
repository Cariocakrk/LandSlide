import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getCoordinatesFromQuery } from '../lib/geocoding';
import { getElevationMatrix } from '../lib/elevation';
import { setActiveTerrainCep } from '../lib/whatsapp';

export async function generateTerrain(req: AuthRequest, res: Response) {
  try {
    const { cep, query } = req.body;
    const searchString = query || cep;
    
    if (!searchString || typeof searchString !== 'string') {
       return res.status(400).json({ error: 'Insira um CEP ou Endereço válido para gerar o terreno.' });
    }

    const isCep = /^\d{5}-?\d{3}$/.test(searchString.trim()) || /^\d{8}$/.test(searchString.trim());
    if (isCep) {
      setActiveTerrainCep(searchString);
    }

    const { lat, lon, name } = await getCoordinatesFromQuery(searchString);
    const { matrix, min, max } = await getElevationMatrix(lat, lon);
    
    return res.json({
       location: name,
       latitude: lat,
       longitude: lon,
       elevationMatrix: matrix,
       minElevation: min,
       maxElevation: max
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao gerar topografia' });
  }
}
