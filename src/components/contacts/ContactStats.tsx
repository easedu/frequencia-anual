/**
 * ContactStats Component
 *
 * Estatísticas de contatos telefônicos.
 * Extrai ~40 linhas do componente telefones/page.tsx
 */

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, CheckCircle, MessageCircle, Smartphone, UserCheck, UserX } from "lucide-react";

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

interface ContactStatsProps {
  total: number;
  verified: number;
  withWhatsApp: number;
  mobile: number;
  studentsWithWhatsApp: number;
  studentsWithoutWhatsApp: number;
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════

export const ContactStats = memo(function ContactStats({
  total,
  verified,
  withWhatsApp,
  mobile,
  studentsWithWhatsApp,
  studentsWithoutWhatsApp,
}: ContactStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100 mb-1">Total de Contatos</p>
              <p className="text-3xl font-bold">{total}</p>
            </div>
            <Phone className="w-10 h-10 text-blue-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-100 mb-1">Verificados</p>
              <p className="text-3xl font-bold">{verified}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-100 mb-1">Com WhatsApp</p>
              <p className="text-3xl font-bold">{withWhatsApp}</p>
            </div>
            <MessageCircle className="w-10 h-10 text-purple-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-100 mb-1">Celulares</p>
              <p className="text-3xl font-bold">{mobile}</p>
            </div>
            <Smartphone className="w-10 h-10 text-orange-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-100 mb-1">Estudantes com WhatsApp</p>
              <p className="text-3xl font-bold">{studentsWithWhatsApp}</p>
            </div>
            <UserCheck className="w-10 h-10 text-teal-200" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-100 mb-1">Estudantes sem WhatsApp</p>
              <p className="text-3xl font-bold">{studentsWithoutWhatsApp}</p>
            </div>
            <UserX className="w-10 h-10 text-red-200" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
