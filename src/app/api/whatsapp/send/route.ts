import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando envio de mensagem WhatsApp...');

    // Debug das variáveis de ambiente
    console.log('📋 Verificando variáveis de ambiente:');
    console.log('- BASE_URL_API_HABIB_KYRILLOS:', process.env.BASE_URL_API_HABIB_KYRILLOS ? 'DEFINIDA' : 'NÃO DEFINIDA');
    console.log('- ENDPOINT_API_HABIB_KYRILLOS_WHATSAPP_SEND_MESSAGE:', process.env.ENDPOINT_API_HABIB_KYRILLOS_WHATSAPP_SEND_MESSAGE ? 'DEFINIDA' : 'NÃO DEFINIDA');
    console.log('- API_HABIB_KYRILLOS_USERNAME:', process.env.API_HABIB_KYRILLOS_USERNAME ? 'DEFINIDA' : 'NÃO DEFINIDA');
    console.log('- API_HABIB_KYRILLOS_PASSWORD:', process.env.API_HABIB_KYRILLOS_PASSWORD ? 'DEFINIDA' : 'NÃO DEFINIDA');

    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.BASE_URL_API_HABIB_KYRILLOS ||
        !process.env.ENDPOINT_API_HABIB_KYRILLOS_WHATSAPP_SEND_MESSAGE ||
        !process.env.API_HABIB_KYRILLOS_USERNAME ||
        !process.env.API_HABIB_KYRILLOS_PASSWORD) {
      console.error('❌ Variáveis de ambiente da API Habib Kyrillos não configuradas');
      return NextResponse.json(
        {
          success: false,
          message: 'Configuração da API de envio não encontrada'
        },
        { status: 500 }
      );
    }

    const { phone, message } = await request.json();
    console.log('📞 Dados recebidos:', { phone: `${phone.substring(0, 4)}****${phone.substring(phone.length - 4)}`, messageLength: message.length });

    if (!phone || !message) {
      console.error('❌ Dados inválidos - telefone ou mensagem ausentes');
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
    console.log('🔗 URL da API:', apiUrl);

    // Preparar credenciais Basic Auth
    const credentials = btoa(`${process.env.API_HABIB_KYRILLOS_USERNAME}:${process.env.API_HABIB_KYRILLOS_PASSWORD}`);
    console.log('🔐 Credenciais preparadas');

    console.log('📤 Enviando requisição para API externa...');

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

    console.log('📥 Resposta recebida - Status:', response.status, response.statusText);

    const result = await response.json();
    console.log('📋 Resultado da API:', result);

    if (response.ok && result.success) {
      console.log('✅ Mensagem enviada com sucesso!');
      return NextResponse.json({
        success: true,
        message: 'Mensagem enviada com sucesso!',
        data: result
      });
    } else {
      console.log('❌ Falha no envio:', result.message || 'Falha ao enviar mensagem');
      return NextResponse.json({
        success: false,
        message: result.message || 'Falha ao enviar mensagem'
      });
    }

  } catch (error) {
    console.error('💥 Erro interno na API route:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
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