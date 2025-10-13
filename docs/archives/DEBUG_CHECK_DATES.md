# 🔍 Debug: Verificar Formato das Datas

## Passo 1: Abrir Firebase Console

1. Acesse: https://console.firebase.google.com/project/frequencia-anual/firestore/data

2. Navegue: **2025** → **ano_letivo**

3. Expanda **1º Bimestre**

4. Expanda **dates** (é um array)

5. Clique no primeiro item (index 0)

6. Veja o campo **date**

**Qual formato você vê?**
- ( ) `2025-09-30` - Formato ISO
- ( ) `30/09/2025` - Formato BR
- ( ) Outro: _______________

---

## Passo 2: Verificar na Aplicação

No console do navegador (F12), cole:

```javascript
// Debug inline na aplicação
(async () => {
  const { getDoc, doc } = await import('firebase/firestore');
  const { db } = await import('./firebase.config');

  const docRef = doc(db, '2025', 'ano_letivo');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const bim1 = data['1º Bimestre'];

    console.log('=== DEBUG DATAS ===');
    console.log('Bimestre completo:', bim1);
    console.log('');

    if (bim1?.dates && bim1.dates.length > 0) {
      console.log('Total de datas:', bim1.dates.length);
      console.log('Primeiras 3 datas:');
      bim1.dates.slice(0, 3).forEach((d, i) => {
        console.log(`  [${i}] date: "${d.date}" | isChecked: ${d.isChecked}`);
        console.log(`      Formato detectado: ${
          /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? 'ISO (YYYY-MM-DD)' :
          /^\d{2}\/\d{2}\/\d{4}$/.test(d.date) ? 'BR (DD/MM/YYYY)' :
          'DESCONHECIDO'
        }`);
      });
    } else {
      console.error('❌ Array dates está vazio ou não existe!');
    }
  } else {
    console.error('❌ Documento ano_letivo não existe!');
  }
})();
```

---

## Passo 3: Testar Conversão Manual

Cole no console:

```javascript
// Testar a função de conversão
function testConversion(dateStr) {
  console.log(`\nTestando: "${dateStr}"`);

  // ISO para DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    const converted = `${day}/${month}/${year}`;
    console.log(`  Formato: ISO → Convertido para: ${converted}`);
    return converted;
  }

  // Já está em DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    console.log(`  Formato: BR → Sem conversão necessária`);
    return dateStr;
  }

  console.log(`  Formato: DESCONHECIDO`);
  return dateStr;
}

// Teste com diferentes formatos
testConversion('2025-09-30');
testConversion('30/09/2025');
testConversion('invalid');
```

---

## Resultados Esperados

Se o formato no banco é **ISO (YYYY-MM-DD)**:
```
Testando: "2025-09-30"
  Formato: ISO → Convertido para: 30/09/2025
```

Se o formato no banco é **BR (DD/MM/YYYY)**:
```
Testando: "30/09/2025"
  Formato: BR → Sem conversão necessária
```

---

## Passo 4: Me Diga

1. **Qual formato você viu no Firebase Console?**
   - ISO ou BR?

2. **Qual formato o console log mostrou?**
   - ISO ou BR?

3. **A conversão funcionou no teste manual?**
   - Sim ou Não?

Com essas informações, posso ajustar o código exatamente para o formato que está no seu banco!