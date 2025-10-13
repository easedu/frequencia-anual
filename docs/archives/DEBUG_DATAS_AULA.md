# 🔍 Debug: Data da Aula não aparece

## Problema
O campo "Data da Aula" não exibe opções no dropdown.

## Causa Provável
O documento `/2025/ano_letivo` pode estar:
1. Vazio
2. Sem o campo `dates` nos bimestres
3. Sem datas marcadas como `isChecked: true`

---

## 🧪 Como Verificar

### Opção 1: Firebase Console (Mais Fácil)

1. Acesse: https://console.firebase.google.com/project/frequencia-anual/firestore/data

2. Navegue para: **2025 → ano_letivo**

3. Verifique a estrutura:
```
ano_letivo
├── 1º Bimestre
│   ├── startDate: "2025-02-03"
│   ├── endDate: "2025-04-30"
│   └── dates: [
│       { date: "01/02/2025", isChecked: true },
│       { date: "02/02/2025", isChecked: true },
│       ...
│   ]
├── 2º Bimestre
│   └── ...
└── ...
```

4. **Verifique:**
   - ✅ Campo `dates` existe em cada bimestre?
   - ✅ Array `dates` tem elementos?
   - ✅ Datas têm `isChecked: true`?

---

### Opção 2: Console do Navegador (Desenvolvedor)

1. Abra a aplicação
2. Pressione **F12** (DevTools)
3. Vá na aba **Console**
4. Cole e execute:

\`\`\`javascript
// Verificar ano_letivo
(async () => {
  const { getDoc, doc } = await import('firebase/firestore');
  const { db } = await import('./firebase.config');

  const docRef = doc(db, '2025', 'ano_letivo');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    console.log('✅ ano_letivo encontrado!');
    console.log('Bimestres:', Object.keys(data));

    // Ver estrutura de cada bimestre
    Object.entries(data).forEach(([bim, value]) => {
      console.log(\`\n📅 \${bim}:\`);
      console.log('  startDate:', value?.startDate);
      console.log('  endDate:', value?.endDate);
      console.log('  Total datas:', value?.dates?.length || 0);
      console.log('  Datas marcadas:', value?.dates?.filter(d => d.isChecked).length || 0);

      if (value?.dates?.length > 0) {
        console.log('  Primeiras 3 datas:', value.dates.slice(0, 3));
      }
    });
  } else {
    console.error('❌ ano_letivo NÃO ENCONTRADO!');
  }
})();
\`\`\`

---

## 🔧 Soluções

### Se o documento não existe:

1. Vá em: `/cadastrar-ano-letivo`
2. Configure o ano letivo
3. Marque as datas de aula
4. Salve

### Se o documento existe mas está vazio:

Use o Firebase Console para adicionar manualmente:

1. Clique em **2025**
2. Clique em **ano_letivo**
3. Adicione campo:
   - **Nome:** `1º Bimestre`
   - **Tipo:** `map`
   - **Valor:**
     ```json
     {
       "startDate": "2025-02-03",
       "endDate": "2025-04-30",
       "dates": [
         {"date": "03/02/2025", "isChecked": true},
         {"date": "04/02/2025", "isChecked": true},
         {"date": "05/02/2025", "isChecked": true}
       ]
     }
     ```

### Se as datas estão no formato errado:

O código espera datas em formato **DD/MM/YYYY**:
- ✅ Correto: `"01/02/2025"`
- ❌ Errado: `"2025-02-01"` (ISO)

---

## 🎯 Teste Rápido

Execute isto no console para ver quantas datas válidas existem:

\`\`\`javascript
(async () => {
  const { getDoc, doc } = await import('firebase/firestore');
  const { db } = await import('./firebase.config');

  const docRef = doc(db, '2025', 'ano_letivo');
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    console.error('❌ Documento ano_letivo não existe!');
    return;
  }

  const data = docSnap.data();
  let totalDates = 0;
  let checkedDates = 0;

  Object.values(data).forEach(bim => {
    if (bim?.dates) {
      totalDates += bim.dates.length;
      checkedDates += bim.dates.filter(d => d.isChecked).length;
    }
  });

  console.log(\`📊 Resumo:\`);
  console.log(\`  Total de datas: \${totalDates}\`);
  console.log(\`  Datas marcadas (isChecked): \${checkedDates}\`);

  if (checkedDates === 0) {
    console.warn('⚠️ Nenhuma data está marcada! Vá em /cadastrar-ano-letivo e marque as datas.');
  } else {
    console.log(\`✅ \${checkedDates} datas disponíveis para seleção!\`);
  }
})();
\`\`\`

---

## 📋 Checklist de Verificação

- [ ] Documento `/2025/ano_letivo` existe?
- [ ] Contém bimestres (1º, 2º, 3º, 4º)?
- [ ] Cada bimestre tem campo `dates`?
- [ ] Array `dates` não está vazio?
- [ ] Datas têm formato DD/MM/YYYY?
- [ ] Datas têm `isChecked: true`?
- [ ] Permissões de leitura no Firestore OK?

---

## 🚨 Se Ainda Não Funcionar

Verifique os logs do navegador (F12 → Console) procurando por:

\`\`\`
ERROR: Erro ao carregar ano letivo
ERROR: permission-denied
Dados do ano letivo não encontrados
\`\`\`

Se aparecer **permission-denied**, o problema são as Firestore Rules.

Se aparecer **não encontrados**, o problema é que o documento não existe ou está vazio.

---

## ✅ Solução Rápida

**A forma mais rápida de resolver:**

1. Acesse: http://localhost:3000/cadastrar-ano-letivo
2. Preencha as datas do ano letivo
3. Marque pelo menos 1 data em cada bimestre
4. Clique em **Salvar**
5. Volte para **Marcar Faltas**
6. O dropdown deve mostrar as datas agora

---

**Me diga o que você encontrou ao verificar o documento ano_letivo!**