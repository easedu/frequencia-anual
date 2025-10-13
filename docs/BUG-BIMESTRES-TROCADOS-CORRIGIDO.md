# 🐛 BUG CORRIGIDO: Bimestres Trocados

**Data**: 11 de Outubro de 2025
**Reportado por**: Usuário
**Local**: `/controlar-faltas` (Dashboard de Frequência)
**Status**: ✅ **CORRIGIDO**

---

## 📋 Descrição do Problema

**Sintoma**: Os bimestres estavam aparecendo em ordem errada na página `/controlar-faltas`

**Exemplo**:
- Filtro mostrava "1º Bimestre" mas exibia dados do 2º ou 3º
- Ordem dos bimestres inconsistente
- Datas não correspondiam aos períodos corretos

---

## 🔍 Causa Raiz

**Arquivo**: `src/hooks/attendance/useBimesterPeriods.ts`
**Linhas**: 33-42 (antes da correção)

### Código Problemático

```typescript
// ❌ CÓDIGO BUGADO
Object.keys(anoLetivoData).forEach((key, index) => {
  if (key.includes('Bimestre')) {
    const bimesterData = anoLetivoData[key];
    if (bimesterData && bimesterData.startDate && bimesterData.endDate) {
      periods[index + 1] = {  // ← PROBLEMA AQUI!
        start: bimesterData.startDate,
        end: bimesterData.endDate,
      };
    }
  }
});
```

### Por Que Estava Errado?

**JavaScript não garante ordem de chaves em objetos!**

Quando você usa `Object.keys(obj)`, a ordem retornada:
- ✅ É **previsível** para números inteiros (0, 1, 2...)
- ❌ É **IMPREVISÍVEL** para strings ('primeiroBimestre', 'segundoBimestre'...)

**Exemplo do problema**:
```javascript
const data = {
  'quartoBimestre': { ... },
  'primeiroBimestre': { ... },
  'terceiroBimestre': { ... },
  'segundoBimestre': { ... }
};

Object.keys(data);
// Pode retornar em QUALQUER ordem!
// Resultado: bimestres mapeados errado
```

O código usava `index + 1` baseado na **ordem de iteração**, não no **nome do bimestre**:
- Se `quartoBimestre` fosse o primeiro key → mapeado como bimestre 1 ❌
- Se `primeiroBimestre` fosse o terceiro key → mapeado como bimestre 3 ❌

---

## ✅ Solução Aplicada

### Código Corrigido

```typescript
// ✅ CÓDIGO CORRETO
const bimesterMap: Record<string, number> = {
  'primeiroBimestre': 1,
  'segundoBimestre': 2,
  'terceiroBimestre': 3,
  'quartoBimestre': 4,
};

Object.keys(anoLetivoData).forEach((key) => {
  const bimesterNumber = bimesterMap[key];  // ← Mapeia explicitamente!
  if (bimesterNumber) {
    const bimesterData = anoLetivoData[key];
    if (bimesterData && bimesterData.startDate && bimesterData.endDate) {
      periods[bimesterNumber] = {  // ← Usa número correto
        start: bimesterData.startDate,
        end: bimesterData.endDate,
      };
    }
  }
});
```

### Mudanças

1. **Mapeamento Explícito**: Criado `bimesterMap` que mapeia **nome → número**
2. **Não Usa Index**: Removido `index + 1`, usa `bimesterMap[key]`
3. **Ordem Garantida**: Cada bimestre sempre mapeia para o número correto

---

## 📊 Resultados

### Antes (Bugado)
```
Dados do Firestore:
{
  quartoBimestre: { start: '01/10/2025', end: '31/12/2025' },
  primeiroBimestre: { start: '01/02/2025', end: '30/04/2025' },
  ...
}

Mapeamento (ERRADO):
1 → quartoBimestre (deveria ser primeiroBimestre) ❌
2 → primeiroBimestre (deveria ser segundoBimestre) ❌
```

### Depois (Corrigido)
```
Dados do Firestore:
{
  quartoBimestre: { start: '01/10/2025', end: '31/12/2025' },
  primeiroBimestre: { start: '01/02/2025', end: '30/04/2025' },
  ...
}

Mapeamento (CORRETO):
1 → primeiroBimestre ✅
2 → segundoBimestre ✅
3 → terceiroBimestre ✅
4 → quartoBimestre ✅
```

---

## 🧪 Como Testar

1. Acesse: http://localhost:3000/controlar-faltas

2. Selecione "1º Bimestre" no filtro

3. Verifique:
   - ✅ Datas mostradas são de Fevereiro a Abril (1º Bimestre)
   - ✅ Dados de frequência correspondem ao período correto
   - ✅ KPIs e gráficos mostram dados consistentes

4. Repita para os outros bimestres (2º, 3º, 4º)

---

## 📚 Lições Aprendidas

### JavaScript Object Keys

**Sempre lembre**:
- ✅ `Object.keys()` **não garante ordem** para string keys
- ✅ Use mapeamento explícito quando ordem importa
- ✅ Ou use `Map` se precisar de ordem garantida

**Exemplo seguro**:
```javascript
// ✅ BOM: Ordem garantida
const bimestres = new Map([
  ['primeiroBimestre', 1],
  ['segundoBimestre', 2],
  ['terceiroBimestre', 3],
  ['quartoBimestre', 4],
]);

// ✅ BOM: Mapeamento explícito
const map = { 'primeiroBimestre': 1, ... };
```

**Exemplo perigoso**:
```javascript
// ❌ RUIM: Assume ordem
Object.keys(obj).forEach((key, index) => {
  data[index + 1] = obj[key];  // Ordem imprevisível!
});
```

### Sempre Mapear Explicitamente

Quando dados têm **significado semântico** (primeiro, segundo, terceiro...):
- ❌ **NÃO** confie em ordem de iteração
- ✅ **SEMPRE** mapeie explicitamente usando o nome/chave

---

## 🔗 Arquivos Relacionados

- `src/hooks/attendance/useBimesterPeriods.ts` - Hook corrigido
- `src/app/controlar-faltas/page.tsx` - Página afetada
- `src/components/cards/FiltersCard.tsx` - Filtro de bimestres

---

## ✅ Checklist de Correção

- [x] Identificado causa raiz (Object.keys sem ordem)
- [x] Implementado mapeamento explícito
- [x] Testado com dados reais
- [x] Verificado todos os 4 bimestres
- [x] Documentado problema e solução
- [x] Adicionado comentário no código

---

**Status**: ✅ **CORRIGIDO**
**Impacto**: Alto (afetava principal página de frequência)
**Complexidade**: Baixa (mudança de 10 linhas)
**Teste**: Manual (verificar cada bimestre)
