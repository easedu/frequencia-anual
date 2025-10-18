# 🎓 Configurar Ano Letivo 2025

## ❌ Problema Identificado

Os **dias letivos estão zerados** porque o ano letivo 2025 **não está cadastrado** no Supabase.

**Log no console**:
```
✅ Dias letivos carregados {
  bimester1: 0,
  bimester2: 0,
  bimester3: 0,
  bimester4: 0,
  total: 0
}
```

---

## ✅ Soluções

### **Opção 1: Cadastrar pela Interface (RECOMENDADO)**

1. **Acesse a página de cadastro**:
   ```
   http://localhost:3000/cadastrar-ano-letivo
   ```

2. **Preencha os dados de 2025**:
   - **1º Bimestre**: 03/02/2025 - 30/04/2025
   - **2º Bimestre**: 05/05/2025 - 11/07/2025
   - **3º Bimestre**: 28/07/2025 - 03/10/2025
   - **4º Bimestre**: 06/10/2025 - 19/12/2025

3. **Marque os dias letivos**:
   - Sistema sugere automaticamente (seg-sex, exceto feriados)
   - Ajuste manualmente se necessário

4. **Salve**:
   - Clique em "Salvar Ano Letivo"
   - Aguarde confirmação

5. **Recarregue o dashboard**:
   - Os dias letivos aparecerão automaticamente

---

### **Opção 2: Usar Script Rápido**

Se quiser configurar rapidamente com valores padrão:

```bash
# 1. Rodar script que gera o JSON
node scripts/setup-academic-year-2025.mjs

# 2. Copiar o JSON gerado

# 3. Colar na interface de cadastro ou usar API diretamente
```

**Dados gerados pelo script**:
- ✅ **~50 dias letivos** por bimestre
- ✅ **~200 dias letivos** no ano
- ✅ Exclui **finais de semana**
- ✅ Exclui **feriados nacionais e SP**
- ✅ Formato compatível com a API

---

### **Opção 3: Migrar do Firebase (se houver dados lá)**

Se você já tem o ano letivo cadastrado no Firebase (antigo):

1. **Verificar no Firebase Console**:
   - Ir para Firestore
   - Verificar coleção `2025/ano_letivo`

2. **Exportar manualmente**:
   - Copiar dados do Firebase
   - Colar na interface de cadastro

3. **Ou usar migration script** (se disponível)

---

## 📋 Dados Padrão Sugeridos para 2025

### Calendário Escolar São Paulo 2025

**1º Bimestre** (50 dias letivos)
- Início: 03/02/2025 (Segunda-feira após Carnaval)
- Fim: 30/04/2025
- Feriados: Carnaval (17-19/02), Paixão (18/04), Tiradentes (21/04)

**2º Bimestre** (48 dias letivos)
- Início: 05/05/2025
- Fim: 11/07/2025
- Feriados: Trabalho (01/05), Corpus Christi (19/06), Rev. Const. (09/07)

**Recesso Escolar**: 14/07/2025 - 25/07/2025

**3º Bimestre** (52 dias letivos)
- Início: 28/07/2025
- Fim: 03/10/2025
- Feriados: Independência (07/09)

**4º Bimestre** (50 dias letivos)
- Início: 06/10/2025
- Fim: 19/12/2025
- Feriados: N. Sra. Aparecida (12/10), Finados (02/11), Proclamação (15/11), Consciência Negra (20/11)

**TOTAL**: ~200 dias letivos

---

## 🔍 Como Verificar se Funcionou

Após cadastrar, recarregue o dashboard e verifique o console:

### ✅ ANTES (Problema):
```javascript
✅ Dias letivos carregados {
  bimester1: 0,
  bimester2: 0,
  bimester3: 0,
  bimester4: 0,
  total: 0
}
```

### ✅ DEPOIS (Funcionando):
```javascript
✅ Dias letivos carregados {
  bimester1: 50,
  bimester2: 48,
  bimester3: 52,
  bimester4: 50,
  total: 200
}
```

---

## 🚀 Próximos Passos Após Configurar

1. ✅ **Dashboard mostrará KPIs corretos**
2. ✅ **Cálculo de frequência funcionará** (faltas / dias letivos)
3. ✅ **Alertas de faltas** serão precisos
4. ✅ **Relatórios** terão dados corretos

---

## 📞 Suporte

Se tiver problemas:

1. **Verifique logs no console** (F12 → Console)
2. **Verifique se salvou corretamente**: API retorna 201 Created
3. **Recarregue a página** após salvar

**Erros comuns**:
- ❌ Datas em formato errado (use DD/MM/YYYY)
- ❌ Bimestres sem dias marcados
- ❌ Não salvou no Supabase (verificar API)

---

**Última atualização**: 2025-10-18
