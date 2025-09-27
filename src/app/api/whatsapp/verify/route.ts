import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppVerificationService } from '@/services/whatsappVerificationService';

export async function POST(request: NextRequest) {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.BASE_URL_API_HABIB_KYRILLOS ||
        !process.env.ENDPOINT_API_HABIB_KYRILLOS_WHATSAPP_NUMBER_VERIFICATION ||
        !process.env.API_HABIB_KYRILLOS_USERNAME ||
        !process.env.API_HABIB_KYRILLOS_PASSWORD) {
      console.error('Variáveis de ambiente da API Habib Kyrillos não configuradas');
      return NextResponse.json(
        {
          success: false,
          hasWhatsApp: false,
          error: 'Configuração da API não encontrada'
        },
        { status: 500 }
      );
    }

    const { phone, studentId, contactName } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Número de telefone é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se é elegível para WhatsApp
    if (!WhatsAppVerificationService.isWhatsAppEligible(phone)) {
      return NextResponse.json({
        success: false,
        hasWhatsApp: false,
        error: 'Número não é elegível para WhatsApp'
      });
    }

    // Verificar e salvar status do WhatsApp
    const result = await WhatsAppVerificationService.checkAndSaveWhatsAppStatus(
      phone,
      studentId,
      contactName
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Erro na API de verificação do WhatsApp:', error);
    return NextResponse.json(
      {
        success: false,
        hasWhatsApp: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}