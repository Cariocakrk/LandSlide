import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

export async function send2FACode(to: string, code: string): Promise<boolean> {
  console.log(`[2FA] Código gerado para ${to}: ${code}`);

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[2FA] SMTP_USER ou SMTP_PASS não configurados no .env. Imprimindo o código no terminal e pulando o envio de e-mail real.');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // SSL para 465, TLS para outras portas
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const mailOptions = {
      from: `"GeoShield Monitor" <${SMTP_USER}>`,
      to,
      subject: 'Seu Código de Segurança de Dois Fatores (2FA)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; text-align: center; margin-bottom: 30px;">GeoShield Monitor</h2>
          <p style="font-size: 16px; color: #333333; line-height: 1.5;">Olá,</p>
          <p style="font-size: 16px; color: #333333; line-height: 1.5;">Você está tentando realizar o login no painel de monitoramento do <strong>GeoShield Monitor</strong>. Utilize o código de segurança abaixo para confirmar sua identidade:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5; background-color: #f3f4f6; padding: 15px 30px; border-radius: 6px; border: 1px dashed #4f46e5;">
              ${code}
            </span>
          </div>

          <p style="font-size: 14px; color: #ef4444; font-weight: bold; line-height: 1.5;">⚠️ Importante: Este código é válido por apenas 5 minutos. Não o compartilhe com ninguém.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #6b7280; text-align: center; line-height: 1.5;">Este é um e-mail automático enviado pelo sistema de segurança GeoShield Monitor. Por favor, não responda a esta mensagem.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[2FA] E-mail enviado com sucesso! Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[2FA] Falha ao enviar e-mail de 2FA para ${to}:`, error);
    return false;
  }
}
