import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import prisma from './prisma';
import { getCoordinatesFromCEP } from './geocoding';
import { getElevationMatrix } from './elevation';
import { calculateGeotechnicalRisk } from './riskAlgorithm';
import axios from 'axios';
import fs from 'fs';

let client: Client | null = null;
let currentStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' = 'DISCONNECTED';
let qrCodeImage: string | null = null;
let clientNumber: string | null = null;
let socketIo: any = null;

// Caches para monitoramento geográfico e sensores ativos
let activeTerrainCep: string | null = null;
let activeSensors: Record<string, {
  sensorId: string;
  slope: number;
  moisture: number;
  rain: number;
  vibration: number;
  risk: number;
  timestamp: number;
}> = {};

export function setActiveTerrainCep(cep: string) {
  activeTerrainCep = cep.replace(/\D/g, '');
  activeSensors = {};
  console.log(`[WhatsApp Bot] CEP ativo do terreno no simulador atualizado para: ${activeTerrainCep}`);
}

export function getActiveTerrainCep(): string | null {
  return activeTerrainCep;
}

export function updateActiveSensor(data: {
  sensorId: string;
  slope: number;
  moisture: number;
  rain: number;
  vibration: number;
  risk: number;
}) {
  activeSensors[data.sensorId.toUpperCase()] = {
    ...data,
    timestamp: Date.now()
  };
}

// Helper para obter a previsão do tempo para cálculo de risco real
async function fetchWeather(lat: number, lng: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation,relativehumidity_2m,soil_moisture_0_to_1cm,soil_moisture_9_to_27cm&past_days=3&forecast_days=1&timezone=UTC`;
  const response = await axios.get(url);
  return response.data;
}

export function initWhatsApp(io: any) {
  socketIo = io;
  console.log('[WhatsApp] Inicializando cliente...');
  currentStatus = 'CONNECTING';
  io.emit('whatsapp-status', { status: currentStatus });

  const puppeteerOptions: any = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-default-apps',
      '--mute-audio',
      '--no-default-browser-check'
    ]
  };

  // Suporte multiplataforma para Chrome/Chromium
  const envChrome = process.env.PUPPETEER_EXECUTABLE_PATH;
  const windowsPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const linuxPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];

  if (envChrome && fs.existsSync(envChrome)) {
    puppeteerOptions.executablePath = envChrome;
  } else if (process.platform === 'win32') {
    const foundWin = windowsPaths.find(p => p && fs.existsSync(p));
    if (foundWin) puppeteerOptions.executablePath = foundWin;
  } else {
    const foundLinux = linuxPaths.find(p => fs.existsSync(p));
    if (foundLinux) puppeteerOptions.executablePath = foundLinux;
  }

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth'
    }),
    puppeteer: puppeteerOptions
  });

  client.on('qr', async (qr) => {
    try {
      console.log('[WhatsApp] QR Code recebido, gerando imagem...');
      currentStatus = 'DISCONNECTED';
      qrCodeImage = await QRCode.toDataURL(qr);
      io.emit('whatsapp-status', { status: currentStatus, qr: qrCodeImage });
    } catch (err) {
      console.error('[WhatsApp] Erro ao gerar imagem do QR Code:', err);
    }
  });

  client.on('loading_screen', (percent, message) => {
    console.log(`[WhatsApp] Carregando: ${percent}% - ${message}`);
    currentStatus = 'CONNECTING';
    io.emit('whatsapp-status', { status: currentStatus, progress: percent, message });
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Autenticado com sucesso!');
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Falha na autenticação:', msg);
    currentStatus = 'DISCONNECTED';
    qrCodeImage = null;
    io.emit('whatsapp-status', { status: currentStatus, error: msg });
  });

  client.on('ready', () => {
    console.log('[WhatsApp] Cliente pronto e ativo!');
    currentStatus = 'CONNECTED';
    qrCodeImage = null;
    clientNumber = client?.info?.wid?.user || null;
    io.emit('whatsapp-status', { status: currentStatus, number: clientNumber });
  });

  client.on('disconnected', (reason) => {
    console.log('[WhatsApp] Cliente desconectado:', reason);
    currentStatus = 'DISCONNECTED';
    qrCodeImage = null;
    clientNumber = null;
    io.emit('whatsapp-status', { status: currentStatus, reason });
  });

  // Listener de mensagens recebidas (Bot Interativo)
  client.on('message', async (msg) => {
    try {
      const text = msg.body.trim();
      const from = msg.from; // e.g. '5511999999999@c.us'
      const phone = from.split('@')[0] || '';

      // Ignora mensagens de grupos ou status ou se o telefone estiver vazio
      if (from.endsWith('@g.us') || from === 'status@broadcast' || !phone) {
        return;
      }

      console.log(`[WhatsApp Bot] Mensagem recebida de ${phone}: "${text}"`);
      const cleanText = text.toLowerCase();

      // Caso a mensagem corresponda a uma consulta de sensor IoT ativo (ex: EST-GEO-12X14)
      const uppercaseText = text.toUpperCase();
      if (activeSensors[uppercaseText]) {
        const sensor = activeSensors[uppercaseText];
        const localRiskEmoji = sensor.risk >= 70 ? '🔴' : sensor.risk >= 40 ? '🟠' : sensor.risk >= 15 ? '🟡' : '🟢';
        
        await msg.reply(
          `📡 *Telemetria em Tempo Real - Sensor ${sensor.sensorId}*\n\n` +
          `📊 *Medições Diretas do Dispositivo:*\n` +
          `• Umidade do Solo: *${sensor.moisture.toFixed(1)}%*\n` +
          `• Inclinação Local do Terreno: *${sensor.slope.toFixed(1)}°*\n` +
          `• Acúmulo de Chuva Local: *${sensor.rain.toFixed(1)} mm*\n` +
          `• Vibração do Solo: *${sensor.vibration.toFixed(1)} mm/s*\n\n` +
          `⚠️ *Risco Estrutural Localizado:* ${localRiskEmoji} *${sensor.risk}%*`
        );
        return;
      }

      // Detectar denúncia com foto ou relato de anomalia
      const isIncidentReport = msg.hasMedia || 
        cleanText.includes('denuncia') ||
        cleanText.includes('denúncia') ||
        cleanText.includes('alerta') ||
        cleanText.includes('trinca') ||
        cleanText.includes('rachadura') ||
        cleanText.includes('deslizamento') ||
        cleanText.includes('barrenta') ||
        cleanText.includes('desabamento') ||
        cleanText.includes('socorro') ||
        cleanText.includes('muro');

      if (isIncidentReport && text !== '1' && text !== '2' && text !== '3' && text !== '4' && text !== '5' && !cleanText.includes('registrar')) {
        let photoData: string | null = null;
        if (msg.hasMedia) {
          try {
            const media = await msg.downloadMedia();
            if (media && media.data) {
              photoData = `data:${media.mimetype};base64,${media.data}`;
            }
          } catch (mediaErr) {
            console.error('[WhatsApp Bot] Erro ao baixar foto:', mediaErr);
          }
        }

        const protocolCode = `DEF-WA-${Math.floor(100000 + Math.random() * 900000)}`;
        const incidentData = {
          id: `wa-${Date.now()}`,
          protocolCode,
          phone: `+${phone}`,
          description: text || (photoData ? 'Foto de anomalia e risco de deslizamento enviada por morador.' : 'Denúncia comunitária.'),
          photo: photoData,
          channel: 'WhatsApp',
          riskLevel: 90,
          status: 'Em análise',
          createdAt: new Date()
        };

        try {
          const created = await prisma.emergencyProtocol.create({
            data: {
              protocolCode,
              riskLevel: 90,
              description: JSON.stringify({
                text: incidentData.description,
                phone: incidentData.phone,
                photo: incidentData.photo,
                channel: 'WhatsApp'
              }),
              status: 'Em análise'
            }
          });
          incidentData.id = created.id;
        } catch (dbErr) {
          console.log('[WhatsApp Bot] Banco offline, emitindo denúncia via Socket.');
        }

        if (socketIo) {
          socketIo.emit('emergencyAlert', incidentData);
        }

        await msg.reply(
          `🚨 *DEFESA CIVIL - DENÚNCIA REGISTRADA!*\n\n` +
          `📋 *Protocolo Oficial:* *${protocolCode}*\n` +
          `📍 *Status:* Em triagem prioritária na Central CICC\n` +
          (photoData ? `📸 *Foto da Encosta:* Anexada com sucesso e enviada aos peritos.\n\n` : `\n`) +
          `Nossas equipes de geotecnia e resgate já receberam o seu alerta na tela da central.\n` +
          `⚠️ *Se notar ruídos ou água barrenta descendo o morro, evacue imediatamente para um ponto seguro!*`
        );
        return;
      }

      // Caso o usuário queira se cadastrar diretamente enviando o comando registrar
      if (cleanText.includes('registrar')) {
        const cepMatch = text.match(/\d{5}-?\d{3}/) || text.match(/\d{8}/);
        if (!cepMatch) {
          await msg.reply('❌ Formato inválido! Envie no formato: *REGISTRAR 12345-678*');
          return;
        }

        const cleanCep = cepMatch[0].replace(/\D/g, '');
        
        const formattedPhone = phone;
        const existingUser = await prisma.user.findFirst({
          where: { phoneNumber: formattedPhone }
        });

        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { cep: cleanCep, phoneNumber: formattedPhone }
          });
        } else {
          await prisma.user.create({
            data: {
              name: `Morador WhatsApp ${phone.slice(-4)}`,
              email: `wa-${phone}@landslide.local`,
              password: `pwd-${Math.random().toString(36).slice(-8)}`,
              role: 'USER',
              phoneNumber: formattedPhone,
              cep: cleanCep
            }
          });
        }
        await msg.reply(
          `✅ *Cadastro realizado com sucesso!*\n\n` +
          `Seu número foi vinculado ao CEP *${cleanCep}*.\n` +
          `Você receberá alertas automáticos caso sensores de risco detectem anormalidades em sua região.`
        );
        return;
      }

      // Responder de acordo com as opções do menu
      if (text === '1') {
        const formattedPhone = phone;
        const user = await prisma.user.findFirst({
          where: { phoneNumber: formattedPhone }
        });

        if (!user || !user.cep) {
          await msg.reply('ℹ️ Você ainda não registrou seu CEP. Digite *2* para saber como se registrar.');
          return;
        }

        try {
          await msg.reply('⏳ *Consultando base de dados topográficos, relevo e clima em tempo real...*');

          // 1. Obter coordenadas geográficas reais do CEP
          const { lat, lon, name: locationName } = await getCoordinatesFromCEP(user.cep);

          // 2. Extrair altitude da topografia global (módulo DEM)
          const { min, max } = await getElevationMatrix(lat, lon);
          const elevationDiff = max - min;
          const estimatedSlope = Math.min(80, Math.max(5, Math.round((elevationDiff / 120) * 45)));

          // 3. Obter dados meteorológicos reais (Open-Meteo API)
          const weatherData = await fetchWeather(lat, lon);
          const hourly = weatherData.hourly;
          const nowIsoPrefix = new Date().toISOString().slice(0, 13);
          let currentHourIndex = hourly?.time?.findIndex((t: string) => t.startsWith(nowIsoPrefix)) ?? -1;
          if (currentHourIndex === -1) {
            currentHourIndex = Math.min(72, (hourly?.time?.length || 1) - 1);
          }

          const precipitations: number[] = hourly?.precipitation || [];
          const start72h = Math.max(0, currentHourIndex - 72);
          const accumulatedRain72h = Number(
            precipitations.slice(start72h, currentHourIndex + 1).reduce((acc, curr) => acc + (curr || 0), 0).toFixed(1)
          );

          const sm0 = hourly?.soil_moisture_0_to_1cm?.[currentHourIndex] || 0.35;
          const smDeep = hourly?.soil_moisture_9_to_27cm?.[currentHourIndex] || 0.38;
          const soilSaturationPercent = Math.min(100, Math.round((((sm0 + smDeep) / 2) / 0.48) * 100));

          // 4. Calcular Risco Geotécnico Oficial (Mohr-Coulomb / Talude Infinito)
          const geoResult = calculateGeotechnicalRisk({
            slopeDeg: estimatedSlope,
            accumulatedRain72h,
            soilMoisturePercent: soilSaturationPercent
          });

          const riskEmoji =
            geoResult.statusColor === 'Vermelho' ? '🔴' :
            geoResult.statusColor === 'Laranja' ? '🟠' :
            geoResult.statusColor === 'Amarelo' ? '🟡' : '🟢';

          let responseMessage = 
            `📍 *Status Geotécnico - ${locationName}*\n` +
            `• CEP Consultivo: *${user.cep}*\n` +
            `• Localização: *${lat.toFixed(4)}°, ${lon.toFixed(4)}°*\n\n` +
            `⛰️ *Topografia da Área (SRTM 30m):*\n` +
            `• Altitude Mínima / Máxima: *${min.toFixed(1)}m / ${max.toFixed(1)}m*\n` +
            `• Declividade Estimada: *${estimatedSlope.toFixed(0)}°*\n\n` +
            `☁️ *Condição Hidrometeorológica Real:*\n` +
            `• Chuva Acumulada (72h CEMADEN): *${accumulatedRain72h.toFixed(1)} mm*\n` +
            `• Saturação do Solo: *${soilSaturationPercent}%*\n\n` +
            `🔬 *Estabilidade de Talude (Mohr-Coulomb):*\n` +
            `• Fator de Segurança: *FS = ${geoResult.safetyFactor >= 99 ? 'Estável' : geoResult.safetyFactor}*\n` +
            `• Classificação CPRM: ${riskEmoji} *${geoResult.riskLevelCode} - ${geoResult.classification}* (*${geoResult.risk}%*)\n\n`;

          // 5. Verificar se o CEP consultado possui sensores ativos simulados no painel
          const cleanUserCep = user.cep.replace(/\D/g, '');
          const cleanActiveCep = activeTerrainCep ? activeTerrainCep.replace(/\D/g, '') : '';
          const hasSensors = cleanUserCep === cleanActiveCep && Object.keys(activeSensors).length > 0;

          if (hasSensors) {
            const sensorIds = Object.keys(activeSensors);
            const exampleSensorId = sensorIds[0] || 'EST-GEO-1';
            const sensorList = sensorIds
              .map(id => {
                const s = activeSensors[id];
                return s ? `• *${id}* (Risco do Setor: *${s.risk}%*)` : '';
              })
              .filter(Boolean)
              .join('\n');

            responseMessage += 
              `📡 *Estações Geotécnicas Ativas na Encosta:*\n` +
              `Para consultar os dados brutos de uma estação específica, responda com o ID desejado:\n\n` +
              sensorList +
              `\n\n_Exemplo de comando: Envie apenas *${exampleSensorId}*_`;
          } else {
            responseMessage += `📡 *Monitoramento:* Análise orbital por Modelo Digital de Elevação (DEM 30m) e radar meteorológico ativa.`;
          }

          await msg.reply(responseMessage);
        } catch (err: any) {
          console.error('[WhatsApp Bot] Erro na consulta de status real:', err);
          await msg.reply('❌ Falha ao obter dados topográficos ou meteorológicos em tempo real. Verifique se o CEP cadastrado está correto.');
        }
      } else if (text === '2') {
        await msg.reply(
          `📝 *Como cadastrar seu CEP:*\n\n` +
          `Envie uma mensagem escrevendo *REGISTRAR* seguido pelo seu CEP de 8 dígitos.\n\n` +
          `Exemplo:\n` +
          `*REGISTRAR 25680-195*\n\n` +
          `Após o cadastro, seu número será incluído na lista de avisos da Defesa Civil.`
        );
      } else if (text === '3') {
        await msg.reply(
          `📍 *Rotas de Fuga e Pontos de Apoio:*\n\n` +
          `• *Ponto de Apoio 1:* Quadra da Escola Municipal Serrante (Rua das Encostas, 100)\n` +
          `• *Ponto de Apoio 2:* Salão Paroquial Comunidade Central (Praça Matriz, s/n)\n\n` +
          `🚨 *Atenção:* Em caso de sirenes de emergência, evacue com calma sua residência levando apenas documentos e remédios essenciais, e siga para o Ponto de Apoio mais próximo.`
        );
      } else if (text === '4') {
        await msg.reply(
          `📞 *Contatos Úteis de Emergência:*\n\n` +
          `• Defesa Civil Estadual/Municipal: *199*\n` +
          `• Corpo de Bombeiros (Resgate): *193*\n` +
          `• SAMU (Ambulância): *192*\n` +
          `• Polícia Militar: *190*`
        );
      } else if (text === '5') {
        await msg.reply(
          `📸 *Canal de Denúncias Comunitárias - Defesa Civil:*\n\n` +
          `Para registrar uma ocorrência de risco no seu setor, por favor:\n` +
          `1. Tire uma *foto nítida* da encosta, trinca no asfalto, muro inclinado ou vazamento de lama.\n` +
          `2. Envie a foto aqui acompanhada do endereço ou ponto de referência.\n\n` +
          `Sua mensagem e imagem serão transmitidas imediatamente para a tela dos operadores no CICC!`
        );
      } else {
        // Enviar Menu de Boas-vindas para qualquer outra mensagem
        await msg.reply(
          `*🤖 GeoShield Bot - Central de Alertas e Apoio*\n\n` +
          `Olá! Sou o assistente virtual do sistema de monitoramento de encostas e risco de deslizamento.\n\n` +
          `Por favor, digite o número correspondente à opção que deseja consultar:\n\n` +
          `1️⃣ *Ver Risco Atual* (Consulta a estabilidade do seu CEP cadastrado)\n` +
          `2️⃣ *Cadastrar Meu CEP* (Instruções para receber alertas da sua área)\n` +
          `3️⃣ *Pontos de Apoio* (Rotas de fuga e locais seguros)\n` +
          `4️⃣ *Contatos de Emergência* (Telefones da Defesa Civil/Bombeiros)\n` +
          `5️⃣ *Fazer Denúncia com Foto* (Enviar foto de trinca ou instabilidade)\n\n` +
          `_Você também pode enviar diretamente uma foto ou relato de risco a qualquer momento._`
        );
      }
    } catch (err) {
      console.error('[WhatsApp Bot] Erro ao processar mensagem:', err);
    }
  });

  if (client) {
    client.initialize().catch((err) => {
      console.error('[WhatsApp] Erro ao inicializar o cliente:', err);
      currentStatus = 'DISCONNECTED';
      io.emit('whatsapp-status', { status: currentStatus, error: err.message });
    });
  }
}

export function getWhatsAppStatus() {
  return {
    status: currentStatus,
    qr: qrCodeImage,
    number: clientNumber
  };
}

export async function disconnectWhatsApp() {
  if (client) {
    console.log('[WhatsApp] Desconectando sessão...');
    try {
      await client.logout();
      currentStatus = 'DISCONNECTED';
      qrCodeImage = null;
      clientNumber = null;
      console.log('[WhatsApp] Sessão encerrada com sucesso.');
    } catch (err) {
      console.error('[WhatsApp] Erro ao deslogar:', err);
      try {
        await client.destroy();
      } catch (destroyErr) {
        console.error('[WhatsApp] Erro ao destruir cliente:', destroyErr);
      }
      currentStatus = 'DISCONNECTED';
      qrCodeImage = null;
      clientNumber = null;
    }

    // Re-inicializar para gerar novo QR Code
    if (socketIo) {
      setTimeout(() => {
        initWhatsApp(socketIo);
      }, 1000);
    }
  }
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  if (currentStatus !== 'CONNECTED' || !client) {
    console.log('[WhatsApp] Não foi possível enviar mensagem: Cliente desconectado.');
    return false;
  }

  try {
    let cleaned = to.replace(/\D/g, '');
    if (cleaned.startsWith('whatsapp:')) {
      cleaned = cleaned.replace('whatsapp:', '');
    }
    
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }

    if (!cleaned.endsWith('@c.us')) {
      cleaned = cleaned + '@c.us';
    }

    console.log(`[WhatsApp] Enviando mensagem de alerta para ${cleaned}...`);
    await client.sendMessage(cleaned, message);
    return true;
  } catch (err) {
    console.error(`[WhatsApp] Falha ao enviar mensagem para ${to}:`, err);
    return false;
  }
}
