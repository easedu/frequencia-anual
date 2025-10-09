import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('Iniciando envio de mensagem WhatsApp');

    // Debug das variáveis de ambiente
    logger.debug('Verificando variáveis de ambiente', {
      BASE_URL: process.env.BASE_URL_API_HABIB_KYRILLOS ? 'DEFINIDA' : 'NÃO DEFINIDA',
      ENDPOINT: process.env.ENDPOINT_API_HABIB_KYRILLOS_WHATSAPP_SEND_MESSAGE ? 'DEFINIDA' : 'NÃO DEFINIDA',
      USERNAME: process.env.API_HABIB_KYRILLOS_USERNAME ? 'DEFINIDA' : 'NÃO DEFINIDA',
      PASSWORD: process.env.API_HABIB_KYRILLOS_PASSWORD ? 'DEFINIDA' : 'NÃO DEFINIDA'
    });

    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.BASE_URL_API_HABIB_KYRILLOS ||
        !process.env.ENDPOINT_API_HABIB_KYRILLOS_WHATSAPP_SEND_MESSAGE ||
        !process.env.API_HABIB_KYRILLOS_USERNAME ||
        !process.env.API_HABIB_KYRILLOS_PASSWORD) {
      logger.error('Variáveis de ambiente da API Habib Kyrillos não configuradas');
      return NextResponse.json(
        {
          success: false,
          message: 'Configuração da API de envio não encontrada'
        },
        { status: 500 }
      );
    }

    const { phone, message } = await request.json();
    logger.debug('Dados recebidos', {
      phone: `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`,
      messageLength: message.length
    });

    if (!phone || !message) {
      logger.error('Dados inválidos - telefone ou mensagem ausentes');
      return NextResponse.json(
        {
          success: false,
          message: 'Telefone e mensagem são obrigatórios'
        },
        { status: 400 }
      );
    }

    // Construir URL completa
    const apiUrl = `${process.env.BASE_URL_API_HABIB_KYRILLOS}${process.env.ENDPOINT_API_HABIB_KYRILLOS_WHATSAPP_SEND_MESSAGE}`;
    logger.debug('URL da API construída');

    // Preparar credenciais Basic Auth
    const credentials = btoa(`${process.env.API_HABIB_KYRILLOS_USERNAME}:${process.env.API_HABIB_KYRILLOS_PASSWORD}`);
    logger.debug('Credenciais preparadas');

    logger.info('Enviando requisição para API externa');

    // Fazer requisição para a API do WhatsApp
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify({
        phone,
        message
      })
    });

    logger.debug('Resposta recebida', {
      status: response.status,
      statusText: response.statusText
    });

    const result = await response.json();
    logger.debug('Resultado da API', result);

    if (response.ok && result.success) {
      logger.whatsappOperation('send', phone, 'success', {
        messageLength: message.length
      });
      return NextResponse.json({
        success: true,
        message: 'Mensagem enviada com sucesso!',
        data: result
      });
    } else {
      logger.whatsappOperation('send', phone, 'failed', {
        reason: result.message || 'Falha ao enviar mensagem'
      });
      return NextResponse.json({
        success: false,
        message: result.message || 'Falha ao enviar mensagem'
      });
    }

  } catch (error) {
    logger.error('Erro interno na API route de WhatsApp', { error: error instanceof Error ? error.message : 'unknown' }, error as Error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}