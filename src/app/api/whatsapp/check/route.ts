import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppVerificationService } from '@/services/whatsappVerificationService';

export async function POST(request: NextRequest) {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.WHATSAPP_VERIFICATION_API_URL) {
      console.error('WHATSAPP_VERIFICATION_API_URL não configurada');
      return NextResponse.json(
        {
          success: false,
          hasWhatsApp: false,
          error: 'Configuração da API não encontrada'
        },
        { status: 500 }
      );
    }

    const { phone } = await request.json();

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

    // Apenas verificar (sem salvar)
    const result = await WhatsAppVerificationService.checkWhatsAppNumber(phone);

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