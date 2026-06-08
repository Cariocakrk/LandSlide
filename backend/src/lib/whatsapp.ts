import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import { getCoordinatesFromCEP } from './geocoding';
import { getElevationMatrix } from './elevation';
import axios from 'axios';

const prisma = new PrismaClient();

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
  // Ao alterar o CEP gerado, limpamos os sensores antigos para dar lugar aos novos
  activeSensors = {};
  console.log(`[WhatsApp Bot] CEP ativo do terreno no simulador atualizado para: ${activeTerrainCep}`);
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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation,relativehumidity_2m&forecast_days=1&timezone=auto`;
  const response = await axios.get(url);
  return response.data;
}

export function initWhatsApp(io: any) {
  socketIo = io;
  console.log('[WhatsApp] Inicializando cliente...');
  currentStatus = 'CONNECTING';
  io.emit('whatsapp-status', { status: currentStatus });

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
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
    }
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

      // Caso a mensagem corresponda a uma consulta de sensor IoT ativo (ex: IOT-Z4A2)
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
          `• Vibração do Solo: *${sensor.vibration.toFixed(1)} Hz*\n\n` +
          `⚠️ *Risco Estrutural Localizado:* ${localRiskEmoji} *${sensor.risk}%*`
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
        
        // Atualizar ou criar usuário
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
          // Estimativa de inclinação média baseada na declividade do relevo
          const estimatedSlope = Math.min(80, Math.max(5, Math.round((elevationDiff / 120) * 45)));

          // 3. Obter dados meteorológicos de chuva e umidade atuais (Open-Meteo API)
          const weatherData = await fetchWeather(lat, lon);
          const currentHourIndex = new Date().getHours();
          const endIndex = Math.min(currentHourIndex + 6, weatherData.hourly.time.length);
          const hourlyRain = weatherData.hourly.precipitation.slice(currentHourIndex, endIndex);
          const hourlyHumidity = weatherData.hourly.relativehumidity_2m.slice(currentHourIndex, endIndex);
          
          const accumulatedRain6h = hourlyRain.reduce((acc: number, curr: number) => acc + curr, 0);
          const avgHumidity6h = hourlyHumidity.reduce((acc: number, curr: number) => acc + curr, 0) / hourlyHumidity.length;

          // 4. Calcular Risco Real Integrado (40% Inclinação + 40% Chuva Real + 20% Umidade do Ar Real)
          const slopeRiskWeight = (estimatedSlope / 45) * 40;
          const rainRiskWeight = Math.min(accumulatedRain6h / 80, 1) * 40; // 80mm de chuva = risco máximo
          const humidityRiskWeight = (avgHumidity6h / 100) * 20;
          
          const calculatedRisk = Math.min(100, Math.round(slopeRiskWeight + rainRiskWeight + humidityRiskWeight));
          
          let statusColor = "Verde";
          let riskEmoji = "🟢";
          if (calculatedRisk > 70) {
            statusColor = "Vermelho";
            riskEmoji = "🔴";
          } else if (calculatedRisk > 40) {
            statusColor = "Laranja";
            riskEmoji = "🟠";
          } else if (calculatedRisk > 15) {
            statusColor = "Amarelo";
            riskEmoji = "🟡";
          }

          let responseMessage = 
            `📍 *Status de Risco - ${locationName}*\n` +
            `• CEP Consultivo: *${user.cep}*\n` +
            `• Localização: *${lat.toFixed(4)}°, ${lon.toFixed(4)}°*\n\n` +
            `⛰️ *Topografia da Área (Reais):*\n` +
            `• Altitude Mínima: *${min.toFixed(1)}m*\n` +
            `• Altitude Máxima: *${max.toFixed(1)}m*\n` +
            `• Inclinação Estimada do Terreno: *${estimatedSlope.toFixed(0)}°*\n\n` +
            `☁️ *Condição Meteorológica Real:*\n` +
            `• Chuva Acumulada (Últimas 6h): *${accumulatedRain6h.toFixed(1)} mm*\n` +
            `• Umidade Relativa do Ar: *${Math.round(avgHumidity6h)}%*\n\n` +
            `⚠️ *Cálculo do Risco Geral de Deslizamento:* ${riskEmoji} *${calculatedRisk}%* (${statusColor.toUpperCase()})\n\n`;

          // 5. Verificar se o CEP consultado possui sensores ativos simulados no painel
          const cleanUserCep = user.cep.replace(/\D/g, '');
          const cleanActiveCep = activeTerrainCep ? activeTerrainCep.replace(/\D/g, '') : '';
          const hasSensors = cleanUserCep === cleanActiveCep && Object.keys(activeSensors).length > 0;

          if (hasSensors) {
            const sensorIds = Object.keys(activeSensors);
            const exampleSensorId = sensorIds[0] || 'IOT-XXXX';
            const sensorList = sensorIds
              .map(id => {
                const s = activeSensors[id];
                return s ? `• *${id}* (Risco do Setor: *${s.risk}%*)` : '';
              })
              .filter(Boolean)
              .join('\n');

            responseMessage += 
              `📡 *Sensores IoT Próximos na Encosta:*\n` +
              `Temos sensores físicos operando nesta encosta. Para consultar os dados brutos de um sensor específico, responda com o ID do sensor desejado:\n\n` +
              sensorList +
              `\n\n_Exemplo de comando: Envie apenas *${exampleSensorId}*_`;
          } else {
            responseMessage += `📡 *Sensores:* Nenhum sensor físico instalado nesta encosta no momento. Monitoramento por estimativa de relevo e satélite ativo.`;
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
          `*REGISTRAR 01310-200*\n\n` +
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
      } else {
        // Enviar Menu de Boas-vindas para qualquer outra mensagem
        await msg.reply(
          `*🤖 LandSlide Bot - Central de Alertas e Apoio*\n\n` +
          `Olá! Sou o assistente virtual do sistema de monitoramento de encostas e risco de deslizamento.\n\n` +
          `Por favor, digite o número correspondente à opção que deseja consultar:\n\n` +
          `1️⃣ *Ver Risco Atual* (Consulta os sensores do seu CEP cadastrado)\n` +
          `2️⃣ *Cadastrar Meu CEP* (Instruções para receber alertas da sua área)\n` +
          `3️⃣ *Pontos de Apoio* (Rotas de fuga e locais seguros)\n` +
          `4️⃣ *Contatos de Emergência* (Telefones da Defesa Civil/Bombeiros)\n\n` +
          `_Responda apenas com o número da opção desejada._`
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
    // Formatar número
    let cleaned = to.replace(/\D/g, '');
    if (cleaned.startsWith('whatsapp:')) {
      cleaned = cleaned.replace('whatsapp:', '');
    }
    
    // Adicionar código do Brasil se necessário (comprimento de 10 ou 11 dígitos)
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
