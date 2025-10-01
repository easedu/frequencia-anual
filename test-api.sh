#!/bin/bash

echo "Testando API de múltiplos de faltas..."
echo ""

# Testar a API
curl -X GET "http://localhost:3000/api/students/absence-multiples?absenceMultiple=3&referenceMonth=9" \
  -H "Authorization: Basic aGFiaWItYXBpOnRuTFZFVHdjd0w4Z3k0WkpUdFVETEFBZEw0QlhtOA==" \
  -s | jq

echo ""
echo "Teste concluído."
