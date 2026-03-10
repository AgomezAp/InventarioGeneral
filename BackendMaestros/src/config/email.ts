import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Verificar que las credenciales estén configuradas
console.log('📧 Configurando servicio de correo...');
console.log('   EMAIL_USER:', process.env.EMAIL_USER || '[NO CONFIGURADO]');
console.log('   EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'gmail (default)');
console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '[CONFIGURADO]' : '[NO CONFIGURADO]');

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verificar conexión al iniciar
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error configurando email:', error.message);
    console.error('   Detalle:', error);
  } else {
    console.log('✅ Servidor de correo listo y verificado');
  }
});

/**
 * Envía correo de solicitud de firma
 */
export async function enviarCorreoFirma(
  destinatario: string,
  nombreReceptor: string,
  token: string,
  dispositivos: any[],
  comentarios?: string
): Promise<boolean> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://inventarioap.com';
  const enlaceFirma = `${frontendUrl}/firmar/${token}`;
  
  // Crear lista de dispositivos para el correo
  const listaDispositivos = dispositivos.map(d => 
    `<tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.tipo}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.marca} ${d.modelo}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.serial || 'N/A'}</td>
    </tr>`
  ).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e88e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .button { display: inline-block; background: #1e88e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .button:hover { background: #1565c0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #1e88e5; color: white; padding: 10px; text-align: left; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
        .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Acta de Entrega de Equipos</h1>
        </div>
        <div class="content">
          <p>Estimado/a <strong>${nombreReceptor}</strong>,</p>
          
          <p>Se le ha asignado los siguientes equipos. Por favor revise la información y firme el acta de entrega:</p>
          
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Equipo</th>
                <th>Serial</th>
              </tr>
            </thead>
            <tbody>
              ${listaDispositivos}
            </tbody>
          </table>
          
          ${comentarios ? `
          <div class="warning">
            <strong>📝 Observaciones:</strong><br>
            ${comentarios}
          </div>
          ` : ''}
          
          <p style="text-align: center;">
            <a href="${enlaceFirma}" class="button">✍️ Firmar Acta de Entrega</a>
          </p>
          
          <p><strong>Instrucciones:</strong></p>
          <ol>
            <li>Haga clic en el botón para revisar el acta completa</li>
            <li>Verifique que la información sea correcta</li>
            <li>Firme digitalmente usando su dedo o mouse</li>
            <li>Si hay algún error, puede devolver el acta para corrección</li>
          </ol>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong> Al firmar, usted acepta la responsabilidad sobre los equipos listados.
          </div>
        </div>
        <div class="footer">
          <p>Este es un correo automático. Por favor no responda a este mensaje.</p>
          <p>Si tiene dudas, contacte al área de sistemas.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Generar IDs únicos para evitar que Gmail agrupe los correos en hilos
  const domain = process.env.EMAIL_SERVICE || 'gmail';
  const messageId = `<${crypto.randomUUID()}@${domain}.com>`;

  const mailOptions = {
    from: `"Sistema de Inventario" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: `[${crypto.randomUUID().substring(0, 8)}] 📋 Acta de Entrega de Equipos - Requiere su firma`,
    html: htmlContent,
    headers: {
      'Message-ID': messageId,
      'X-Entity-Ref-ID': crypto.randomUUID(),
      'Precedence': 'bulk',
      'Auto-Submitted': 'auto-generated',
      'X-Google-Thread-Id': crypto.randomUUID(),
    },
  };

  console.log('📨 Intentando enviar correo de firma...');
  console.log('   Destinatario:', destinatario);
  console.log('   Enlace de firma:', enlaceFirma);
  console.log('   Dispositivos:', dispositivos.length);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Correo de firma enviado exitosamente a: ${destinatario}`);
    console.log(`   Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error enviando correo:', error.message);
    console.error('   Stack:', error.stack);
    throw new Error(`Error enviando correo: ${error.message}`);
  }
}

/**
 * Envía copia del acta firmada
 */
export async function enviarActaFirmada(
  destinatarios: string[],
  nombreReceptor: string,
  dispositivos: any[],
  fechaFirma: Date,
  pdfBuffer?: Buffer
): Promise<boolean> {
  const listaDispositivos = dispositivos.map(d => 
    `<tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.tipo}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.marca} ${d.modelo}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.serial || 'N/A'}</td>
    </tr>`
  ).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #4caf50; color: white; padding: 10px; text-align: left; }
        .success { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 10px; margin: 15px 0; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Acta de Entrega Firmada</h1>
        </div>
        <div class="content">
          <div class="success">
            <strong>El acta ha sido firmada correctamente</strong>
          </div>
          
          <p><strong>Receptor:</strong> ${nombreReceptor}</p>
          <p><strong>Fecha de firma:</strong> ${fechaFirma.toLocaleString('es-MX')}</p>
          
          <h3>Equipos entregados:</h3>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Equipo</th>
                <th>Serial</th>
              </tr>
            </thead>
            <tbody>
              ${listaDispositivos}
            </tbody>
          </table>
          
          <p style="color: #666; font-size: 12px;">
            Este documento es una confirmación automática de la entrega de equipos.
          </p>
        </div>
        <div class="footer">
          <p>Sistema de Inventario - Notificación automática</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Generar IDs únicos para evitar que Gmail agrupe los correos en hilos
  const domain = process.env.EMAIL_SERVICE || 'gmail';
  const messageId = `<${crypto.randomUUID()}@${domain}.com>`;

  const mailOptions: any = {
    from: `"Sistema de Inventario" <${process.env.EMAIL_USER}>`,
    to: destinatarios.join(', '),
    subject: `[${crypto.randomUUID().substring(0, 8)}] ✅ Acta Firmada - ${nombreReceptor} - ${fechaFirma.toLocaleDateString('es-MX')}`,
    html: htmlContent,
    headers: {
      'Message-ID': messageId,
      'X-Entity-Ref-ID': crypto.randomUUID(),
      'Precedence': 'bulk',
      'Auto-Submitted': 'auto-generated',
      'X-Google-Thread-Id': crypto.randomUUID(),
    },
  };

  // Si hay PDF adjunto
  if (pdfBuffer) {
    mailOptions.attachments = [{
      filename: `Acta_Entrega_${nombreReceptor.replace(/\s+/g, '_')}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }];
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Acta firmada enviada a: ${destinatarios.join(', ')}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error enviando acta firmada:', error.message);
    throw new Error(`Error enviando correo: ${error.message}`);
  }
}

/**
 * Envía notificación de rechazo
 */
export async function enviarNotificacionRechazo(
  destinatario: string,
  nombreReceptor: string,
  motivo: string
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Acta Devuelta para Corrección</h1>
        </div>
        <div class="content">
          <p>El receptor <strong>${nombreReceptor}</strong> ha devuelto el acta de entrega para corrección.</p>
          
          <div class="warning">
            <strong>📝 Motivo:</strong><br>
            ${motivo}
          </div>
          
          <p>Por favor revise el acta, realice las correcciones necesarias y envíela nuevamente.</p>
        </div>
        <div class="footer">
          <p>Sistema de Inventario - Notificación automática</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Generar IDs únicos para evitar que Gmail agrupe los correos en hilos
  const domain = process.env.EMAIL_SERVICE || 'gmail';
  const messageId = `<${crypto.randomUUID()}@${domain}.com>`;

  const mailOptions = {
    from: `"Sistema de Inventario" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: `[${crypto.randomUUID().substring(0, 8)}] ⚠️ Acta Devuelta - ${nombreReceptor} solicita correcciones`,
    html: htmlContent,
    headers: {
      'Message-ID': messageId,
      'X-Entity-Ref-ID': crypto.randomUUID(),
      'Precedence': 'bulk',
      'Auto-Submitted': 'auto-generated',
      'X-Google-Thread-Id': crypto.randomUUID(),
    },
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Notificación de rechazo enviada a: ${destinatario}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error enviando notificación de rechazo:', error.message);
    throw new Error(`Error enviando correo: ${error.message}`);
  }
}

/**
 * Envía correo de solicitud de firma para devolución
 */
export async function enviarCorreoDevolucion(
  destinatario: string,
  nombreReceptor: string,
  token: string,
  dispositivos: any[],
  comentarios?: string
): Promise<boolean> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://inventarioap.com';
  const enlaceFirma = `${frontendUrl}/firmar-devolucion/${token}`;
  
  // Crear lista de dispositivos para el correo
  const listaDispositivos = dispositivos.map(d => 
    `<tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.tipo}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.marca} ${d.modelo}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.serial || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.imei || 'N/A'}</td>
    </tr>`
  ).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .button { display: inline-block; background: #4caf50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .button:hover { background: #388e3c; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #4caf50; color: white; padding: 10px; text-align: left; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
        .warning { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Devolución de Equipos</h1>
        </div>
        <div class="content">
          <p>Estimado/a <strong>${nombreReceptor}</strong>,</p>
          
          <p>Se ha registrado la siguiente devolución de equipos. Por favor revise y firme para confirmar la recepción:</p>
          
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Equipo</th>
                <th>Serial</th>
                <th>IMEI</th>
              </tr>
            </thead>
            <tbody>
              ${listaDispositivos}
            </tbody>
          </table>
          
          ${comentarios ? `
          <div class="warning">
            <strong>📝 Observaciones:</strong><br>
            ${comentarios}
          </div>
          ` : ''}
          
          <p style="text-align: center;">
            <a href="${enlaceFirma}" class="button">✍️ Firmar Acta de Devolución</a>
          </p>
          
          <p><strong>Instrucciones:</strong></p>
          <ol>
            <li>Haga clic en el botón para revisar los equipos a devolver</li>
            <li>Verifique que la información sea correcta</li>
            <li>Firme digitalmente para confirmar la devolución</li>
          </ol>
          
          <div class="warning">
            <strong>✅ Nota:</strong> Al firmar, confirma que los equipos listados han sido devueltos correctamente.
          </div>
        </div>
        <div class="footer">
          <p>Este es un correo automático. Por favor no responda a este mensaje.</p>
          <p>Si tiene dudas, contacte al área de sistemas.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Generar IDs únicos para evitar que Gmail agrupe los correos en hilos
  const domain = process.env.EMAIL_SERVICE || 'gmail';
  const messageId = `<${crypto.randomUUID()}@${domain}.com>`;

  const mailOptions = {
    from: `"Sistema de Inventario" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: `[${crypto.randomUUID().substring(0, 8)}] 📦 Devolución de Equipos - Requiere su firma`,
    html: htmlContent,
    headers: {
      'Message-ID': messageId,
      'X-Entity-Ref-ID': crypto.randomUUID(),
      'Precedence': 'bulk',
      'Auto-Submitted': 'auto-generated',
      'X-Google-Thread-Id': crypto.randomUUID(),
    },
  };

  console.log('📨 Intentando enviar correo de devolución...');
  console.log('   Destinatario:', destinatario);
  console.log('   Enlace de firma:', enlaceFirma);
  console.log('   Dispositivos:', dispositivos.length);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Correo de devolución enviado exitosamente a: ${destinatario}`);
    console.log(`   Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error enviando correo de devolución:', error.message);
    console.error('   Stack:', error.stack);
    throw new Error(`Error enviando correo: ${error.message}`);
  }
}

/**
 * Envía confirmación de devolución completada
 */
export async function enviarConfirmacionDevolucion(
  destinatarios: string[],
  nombreReceptor: string,
  dispositivos: any[],
  fechaDevolucion: Date
): Promise<boolean> {
  const listaDispositivos = dispositivos.map(d => 
    `<tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.tipo}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.marca} ${d.modelo}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.serial || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${d.estadoDevolucion}</td>
    </tr>`
  ).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #4caf50; color: white; padding: 10px; text-align: left; }
        .success { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 10px; margin: 15px 0; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Devolución Completada</h1>
        </div>
        <div class="content">
          <div class="success">
            <strong>La devolución ha sido registrada correctamente</strong>
          </div>
          
          <p><strong>Receptor:</strong> ${nombreReceptor}</p>
          <p><strong>Fecha de devolución:</strong> ${fechaDevolucion.toLocaleString('es-MX')}</p>
          
          <h3>Equipos devueltos:</h3>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Equipo</th>
                <th>Serial</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${listaDispositivos}
            </tbody>
          </table>
          
          <p style="color: #666; font-size: 12px;">
            Este documento es una confirmación automática de la devolución de equipos.
          </p>
        </div>
        <div class="footer">
          <p>Sistema de Inventario - Notificación automática</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Generar IDs únicos
  const domain = process.env.EMAIL_SERVICE || 'gmail';
  const messageId = `<${crypto.randomUUID()}@${domain}.com>`;

  const mailOptions = {
    from: `"Sistema de Inventario" <${process.env.EMAIL_USER}>`,
    to: destinatarios.join(', '),
    subject: `[${crypto.randomUUID().substring(0, 8)}] ✅ Devolución Completada - ${nombreReceptor} - ${fechaDevolucion.toLocaleDateString('es-MX')}`,
    html: htmlContent,
    headers: {
      'Message-ID': messageId,
      'X-Entity-Ref-ID': crypto.randomUUID(),
      'Precedence': 'bulk',
      'Auto-Submitted': 'auto-generated',
      'X-Google-Thread-Id': crypto.randomUUID(),
    },
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Confirmación de devolución enviada a: ${destinatarios.join(', ')}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error enviando confirmación de devolución:', error.message);
    throw new Error(`Error enviando correo: ${error.message}`);
  }
}

/**
 * Envía correo de solicitud de firma para actas de consumibles (Aseo/Papelería)
 */
export async function enviarCorreoFirmaConsumible(
  destinatario: string,
  nombreReceptor: string,
  numeroActa: string,
  token: string,
  tipoInventario: string // 'aseo' o 'papeleria'
): Promise<boolean> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://inventarioap.com';
  const enlaceFirma = `${frontendUrl}/firmar-consumible/${token}`;
  
  // Configuración según tipo
  const config = {
    aseo: {
      titulo: 'Artículos de Aseo',
      icono: '🧹',
      color: '#0dcaf0',
      colorDark: '#0aa2c0'
    },
    papeleria: {
      titulo: 'Artículos de Papelería',
      icono: '📎',
      color: '#ffc107',
      colorDark: '#d4a106'
    }
  };
  
  const cfg = config[tipoInventario as keyof typeof config] || config.aseo;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${cfg.color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .button { display: inline-block; background: ${cfg.color}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .button:hover { background: ${cfg.colorDark}; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
        .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 10px; margin: 15px 0; }
        .acta-info { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .acta-numero { font-size: 18px; font-weight: bold; color: ${cfg.color}; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${cfg.icono} Acta de Entrega - ${cfg.titulo}</h1>
        </div>
        <div class="content">
          <p>Estimado/a <strong>${nombreReceptor}</strong>,</p>
          
          <p>Se le ha entregado artículos de ${cfg.titulo.toLowerCase()}. Por favor revise la información y firme el acta de entrega:</p>
          
          <div class="acta-info">
            <span class="acta-numero">📋 ${numeroActa}</span>
          </div>
          
          <p style="text-align: center;">
            <a href="${enlaceFirma}" class="button">✍️ Ver y Firmar Acta</a>
          </p>
          
          <p><strong>Instrucciones:</strong></p>
          <ol>
            <li>Haga clic en el botón para revisar el acta completa</li>
            <li>Verifique que los artículos y cantidades sean correctos</li>
            <li>Firme digitalmente usando su dedo o mouse</li>
            <li>Si hay algún error, puede rechazar el acta indicando el motivo</li>
          </ol>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong> Al firmar, usted confirma haber recibido los artículos listados en el acta.
          </div>
        </div>
        <div class="footer">
          <p>Este es un correo automático. Por favor no responda a este mensaje.</p>
          <p>Si tiene dudas, contacte al área administrativa.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Generar IDs únicos
  const domain = process.env.EMAIL_SERVICE || 'gmail';
  const messageId = `<${crypto.randomUUID()}@${domain}.com>`;

  const mailOptions = {
    from: `"Sistema de Inventario" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: `[${numeroActa}] ${cfg.icono} Acta de Entrega de ${cfg.titulo} - Requiere su firma`,
    html: htmlContent,
    headers: {
      'Message-ID': messageId,
      'X-Entity-Ref-ID': crypto.randomUUID(),
      'Precedence': 'bulk',
      'Auto-Submitted': 'auto-generated',
      'X-Google-Thread-Id': crypto.randomUUID(),
    },
  };

  console.log('📨 Intentando enviar correo de firma (consumibles)...');
  console.log('   Destinatario:', destinatario);
  console.log('   Tipo:', tipoInventario);
  console.log('   Acta:', numeroActa);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Correo de firma (consumibles) enviado a: ${destinatario}`);
    console.log(`   Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error enviando correo:', error.message);
    throw new Error(`Error enviando correo: ${error.message}`);
  }
}

/**
 * Envía correo de solicitud de firma para actas de mobiliario
 */
export async function enviarCorreoFirmaMobiliario(
  destinatario: string,
  nombreReceptor: string,
  token: string,
  muebles: { nombre: string; categoria: string; cantidad: number; unidad: string }[],
  observaciones?: string
): Promise<boolean> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://inventarioap.com';
  const enlaceFirma = `${frontendUrl}/firmar-mobiliario/${token}`;

  const listaMuebles = muebles.map(m =>
    `<tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${m.nombre}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${m.categoria || '-'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${m.cantidad}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${m.unidad || 'und.'}</td>
    </tr>`
  ).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #5d4037; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .button { display: inline-block; background: #5d4037; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
        .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 10px; margin: 15px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #5d4037; color: white; padding: 8px; text-align: left; }
        .obs { background: #f3e5f5; border-left: 4px solid #7b1fa2; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🪑 Acta de Entrega de Mobiliario</h1>
        </div>
        <div class="content">
          <p>Estimado/a <strong>${nombreReceptor}</strong>,</p>
          <p>Se le ha asignado mobiliario. Por favor revise la información y firme el acta de entrega:</p>

          <table>
            <thead>
              <tr>
                <th>Mueble</th>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th>Unidad</th>
              </tr>
            </thead>
            <tbody>
              ${listaMuebles}
            </tbody>
          </table>

          ${observaciones ? `<div class="obs"><strong>📝 Observaciones:</strong> ${observaciones}</div>` : ''}

          <p style="text-align: center;">
            <a href="${enlaceFirma}" class="button">✍️ Ver y Firmar Acta</a>
          </p>

          <p><strong>Instrucciones:</strong></p>
          <ol>
            <li>Haga clic en el botón para revisar el acta completa</li>
            <li>Verifique que los muebles y cantidades sean correctos</li>
            <li>Firme digitalmente usando su dedo o mouse</li>
            <li>Si hay algún error, puede rechazar el acta indicando el motivo</li>
          </ol>

          <div class="warning">
            <strong>⚠️ Importante:</strong> Al firmar, usted confirma haber recibido el mobiliario listado en el acta.
          </div>
        </div>
        <div class="footer">
          <p>Este es un correo automático. Por favor no responda a este mensaje.</p>
          <p>Si tiene dudas, contacte al área administrativa.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const domain = process.env.EMAIL_SERVICE || 'gmail';
  const messageId = `<${crypto.randomUUID()}@${domain}.com>`;

  const mailOptions = {
    from: `"Sistema de Inventario" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: `🪑 Acta de Entrega de Mobiliario - Requiere su firma`,
    html: htmlContent,
    headers: {
      'Message-ID': messageId,
      'X-Entity-Ref-ID': crypto.randomUUID(),
      'Precedence': 'bulk',
      'Auto-Submitted': 'auto-generated',
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Correo firma mobiliario enviado a: ${destinatario} — ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error enviando correo mobiliario:', error.message);
    throw new Error(`Error enviando correo: ${error.message}`);
  }
}

/**
 * Envía correo de confirmación cuando el acta de mobiliario es firmada
 */
export async function enviarActaMobiliarioFirmada(
  destinatarios: string[],
  nombreReceptor: string,
  muebles: { nombre: string; categoria: string; cantidad: number }[],
  fechaFirma: Date
): Promise<boolean> {
  const listaMuebles = muebles.map(m =>
    `<tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${m.nombre}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${m.categoria || '-'}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${m.cantidad}</td>
    </tr>`
  ).join('');

  const fechaFormateada = new Date(fechaFirma).toLocaleString('es-CO', {
    dateStyle: 'full', timeStyle: 'short'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2e7d32; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .success { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 10px; margin: 15px 0; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #2e7d32; color: white; padding: 8px; text-align: left; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Acta de Mobiliario Firmada</h1>
        </div>
        <div class="content">
          <div class="success">
            <strong>✅ El acta de entrega de mobiliario ha sido firmada exitosamente.</strong>
          </div>

          <p><strong>Receptor:</strong> ${nombreReceptor}</p>
          <p><strong>Fecha de firma:</strong> ${fechaFormateada}</p>

          <table>
            <thead>
              <tr>
                <th>Mueble</th>
                <th>Categoría</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${listaMuebles}
            </tbody>
          </table>

          <p>El acta ha quedado registrada en el sistema de inventario.</p>
        </div>
        <div class="footer">
          <p>Este es un correo automático. Por favor no responda a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const domain = process.env.EMAIL_SERVICE || 'gmail';
  const messageId = `<${crypto.randomUUID()}@${domain}.com>`;

  const mailOptions = {
    from: `"Sistema de Inventario" <${process.env.EMAIL_USER}>`,
    to: destinatarios.join(','),
    subject: `✅ Acta de Mobiliario Firmada - ${nombreReceptor}`,
    html: htmlContent,
    headers: {
      'Message-ID': messageId,
      'X-Entity-Ref-ID': crypto.randomUUID(),
      'Precedence': 'bulk',
      'Auto-Submitted': 'auto-generated',
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Confirmación firma mobiliario enviada — ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error enviando confirmación mobiliario:', error.message);
    throw new Error(`Error enviando correo: ${error.message}`);
  }
}

export default transporter;
