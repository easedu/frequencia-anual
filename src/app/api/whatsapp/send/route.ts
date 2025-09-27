import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.BASE_URL_API_HABIB_KYRILLOS ||
        !process.env.ENDPOINT_API_HABIB_KYRILLOS_WHATSAPP_SEND_MESSAGE ||
        !process.env.API_HABIB_KYRILLOS_USERNAME ||
        !process.env.API_HABIB_KYRILLOS_PASSWORD) {
      console.error('Variáveis de ambiente da API Habib Kyrillos não configuradas');
      return NextResponse.json(
        {
          success: false,
          message: 'Configuração da API de envio não encontrada'
        },
        { status: 500 }
      );
    }

    const { phone, message } = await request.json();

    if (!phone || !message) {
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

    // Preparar credenciais Basic Auth
    const credentials = btoa(`${process.env.API_HABIB_KYRILLOS_USERNAME}:${process.env.API_HABIB_KYRILLOS_PASSWORD}`);

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

    const result = await response.json();

    if (response.ok && result.success) {
      return NextResponse.json({
        success: true,
        message: 'Mensagem enviada com sucesso!',
        data: result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message || 'Falha ao enviar mensagem'
      });
    }

  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}