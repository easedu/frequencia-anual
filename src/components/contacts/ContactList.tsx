/**
 * ContactList Component
 *
 * Tabela de contatos telefônicos com ações de verificação e WhatsApp.
 * Extrai ~200 linhas do componente telefones/page.tsx
 */

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Phone,
  MessageCircle,
  XCircle,
  RefreshCw,
  GraduationCap,
  Copy,
  CheckCircle,
} from "lucide-react";
import type { PhoneContact } from "@/hooks/useContactsManagement";

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

interface ContactListProps {
  contacts: PhoneContact[];
  formatPhone: (phone: string) => string;
  copyPhone: (phone: string) => Promise<void>;
  verifyWhatsApp: (phone: string) => Promise<void>;
  openWhatsAppModal: (contact: PhoneContact) => void;
  verifyingPhone: string | null;
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════

export const ContactList = memo(function ContactList({
  contacts,
  formatPhone,
  copyPhone,
  verifyWhatsApp,
  openWhatsAppModal,
  verifyingPhone,
}: ContactListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Turma
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estudante
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contato
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Parentesco
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Telefone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              WhatsApp
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {contacts.map((contact, index) => (
            <tr
              key={`${contact.telefone}-${index}`}
              className="hover:bg-blue-50/50 transition-colors duration-150"
            >
              {/* Turma */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-bold text-gray-900">{contact.turma}</div>
                    <div className="text-xs text-gray-500">{contact.turno}</div>
                  </div>
                </div>
              </td>

              {/* Estudante */}
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">{contact.estudanteNome}</div>
              </td>

              {/* Contato */}
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{contact.nome}</div>
              </td>

              {/* Parentesco */}
              <td className="px-6 py-4">
                <div className="text-sm text-gray-600">
                  {contact.parentesco || <span className="text-gray-400 italic">N/A</span>}
                </div>
              </td>

              {/* Telefone */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="font-mono text-sm font-medium text-gray-900">
                    {formatPhone(contact.telefone)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyPhone(contact.telefone)}
                    className="h-6 w-6 p-0 hover:bg-blue-100"
                    title="Copiar telefone"
                  >
                    <Copy className="h-3 w-3 text-gray-500" />
                  </Button>
                </div>
              </td>

              {/* WhatsApp Status */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center justify-center">
                  {contact.whatsAppVerified ? (
                    contact.hasWhatsApp ? (
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100" title="WhatsApp verificado e disponível">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100" title="Verificado - sem WhatsApp">
                        <XCircle className="h-4 w-4 text-gray-500" />
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100" title="Não verificado">
                      <RefreshCw className="h-4 w-4 text-orange-500" />
                    </div>
                  )}
                </div>
              </td>

              {/* Ações */}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  {contact.hasWhatsApp && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openWhatsAppModal(contact)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Enviar
                    </Button>
                  )}

                  {(!contact.whatsAppVerified || (contact.whatsAppVerified && !contact.hasWhatsApp)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verifyWhatsApp(contact.telefone)}
                      disabled={verifyingPhone === contact.telefone}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      {verifyingPhone === contact.telefone ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verificar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
