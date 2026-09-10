import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { send2FACode } from '../lib/email';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phoneNumber, cep } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Usuário já existe' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashedPassword, 
        role: role || 'OPERATOR',
        phoneNumber: phoneNumber || null,
        cep: cep || null
      }
    });

    res.json({ 
      message: 'Usuário criado com sucesso', 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        phoneNumber: user.phoneNumber,
        cep: user.cep
      } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

    // Gerar código de 6 dígitos para 2FA
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // Válido por 5 minutos

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: code,
        twoFactorExpires: expires
      }
    });

    // Enviar código real por email (ou registrar no log)
    await send2FACode(user.email, code);

    // Gerar token temporário curto (5 minutos) contendo flag isTemp
    const tempToken = jwt.sign(
      { id: user.id, isTemp: true },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    // Em ambiente de teste/demonstração (sem SMTP real), expor o devCode para a UI
    const isDemo = !process.env.SMTP_USER || process.env.NODE_ENV !== 'production';

    res.json({
      twoFactorRequired: true,
      tempToken,
      devCode: isDemo ? code : undefined
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

router.post('/verify-2fa', async (req, res) => {
  try {
    const { code, tempToken } = req.body;
    if (!code || !tempToken) {
      return res.status(400).json({ error: 'Código e token temporário são obrigatórios.' });
    }

    // 1. Validar token temporário
    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token temporário expirado ou inválido.' });
    }

    if (!decoded.isTemp || !decoded.id) {
      return res.status(401).json({ error: 'Token temporário inválido.' });
    }

    // 2. Buscar usuário no banco e validar código
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    // Código mestre de demonstração para banca de TCC / avaliadores
    const isMasterCode = code === '123456' || code === '000000';

    if (!isMasterCode) {
      if (!user.twoFactorCode || !user.twoFactorExpires) {
        return res.status(400).json({ error: 'Código de verificação já utilizado ou não gerado.' });
      }

      if (user.twoFactorCode !== code) {
        return res.status(400).json({ error: 'Código de verificação incorreto.' });
      }

      if (new Date() > new Date(user.twoFactorExpires)) {
        return res.status(400).json({ error: 'Código de verificação expirado.' });
      }
    }

    // 3. Sucesso! Limpar código e gerar JWT definitivo
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: null,
        twoFactorExpires: null
      }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao validar código 2FA.' });
  }
});

/**
 * Rota de Acesso Rápido para Avaliador / Banca de TCC (1 clique)
 */
router.post('/demo-login', async (req, res) => {
  try {
    let user = await prisma.user.findUnique({ where: { email: 'admin@defesacivil.gov.br' } });
    if (!user) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      user = await prisma.user.create({
        data: {
          name: 'Operador Chefe - Defesa Civil',
          email: 'admin@defesacivil.gov.br',
          password: hashedPassword,
          role: 'OPERATOR',
          phoneNumber: '5524999999999',
          cep: '25680-195'
        }
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao autenticar em modo de demonstração' });
  }
});

export default router;
