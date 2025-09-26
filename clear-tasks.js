// Script para limpar todas as tasks do banco de dados
// Execute no console do navegador na página do Gerenciador de Tarefas

async function clearAllTasksFromDatabase() {
  try {
    console.log('🗑️ Iniciando limpeza do banco de dados...');

    // Importar o TaskService (assumindo que está disponível globalmente)
    const { TaskService } = await import('/src/services/taskService.ts');

    await TaskService.clearAllTasks();

    console.log('✅ Limpeza concluída! Todas as tasks foram removidas.');
    console.log('💡 Agora você pode gerar novas tasks usando o botão "Verificar Novas Tarefas"');

    // Recarregar a página automaticamente
    window.location.reload();

  } catch (error) {
    console.error('❌ Erro ao limpar banco:', error);
  }
}

// Executar automaticamente
clearAllTasksFromDatabase();