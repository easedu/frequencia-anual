# 📦 Backups

Esta pasta contém backups automáticos criados durante migrações e operações críticas.

## ⚠️ Importante

- ✅ **Backups são locais** e não são commitados no git (.gitignore)
- ✅ **Backup da migração:** `students-backup-2025-09-30T10-26-57-332Z.json`
- ✅ **735 estudantes** preservados em JSON
- ✅ **1.4 MB** de dados

## 🗑️ Quando deletar?

Após confirmar que a migração funcionou perfeitamente (1-2 semanas), você pode deletar os backups antigos.

## 🔄 Restauração

Se precisar restaurar os dados antigos:

```bash
# O backup está no formato:
{
  "timestamp": "2025-09-30T10:26:57.332Z",
  "year": "2025",
  "totalStudents": 735,
  "data": [...]
}
```

Para restaurar, você precisaria criar um script customizado que leia o JSON e reinsira os dados.