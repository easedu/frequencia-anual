// Service Worker para Sistema de Frequência Escolar
// Versão: 1.0.1 - Fix: Não interceptar requisições POST

const CACHE_NAME = 'frequencia-escolar-v1.0.1';
const OFFLINE_URL = '/offline';

// Recursos essenciais para funcionamento offline
const ESSENTIAL_RESOURCES = [
  '/',
  '/home',
  '/controlar-faltas', 
  '/marcar-faltas',
  '/relatorio-bolsa-familia',
  '/offline',
  
  // CSS e JS essenciais (serão preenchidos automaticamente)
  '/_next/static/css/',
  '/_next/static/chunks/',
  
  // Ícones e imagens do sistema
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Dados que podem ser cachados para uso offline
const CACHEABLE_DATA_PATTERNS = [
  /^\/api\/students/,           // Lista de estudantes
  /^\/api\/attendance/,         // Dados de frequência  
  /^\/api\/school-calendar/,    // Calendário letivo
  /^\/api\/reports/,           // Relatórios gerados
];

// ============================================================================
// INSTALAÇÃO DO SERVICE WORKER
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  
  event.waitUntil(
    (async () => {
      try {
        // Abrir cache e adicionar recursos essenciais
        const cache = await caches.open(CACHE_NAME);
        
        // Cache de recursos estáticos
        await cache.addAll(ESSENTIAL_RESOURCES.filter(resource => 
          !resource.includes('_next') // Pular chunks que serão adicionados dinamicamente
        ));
        
        // Cache da página offline
        await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
        
        console.log('✅ Service Worker: Recursos essenciais cacheados');
        
        // Forçar ativação imediata
        self.skipWaiting();
        
      } catch (error) {
        console.error('❌ Service Worker: Erro na instalação:', error);
      }
    })()
  );
});

// ============================================================================
// ATIVAÇÃO DO SERVICE WORKER  
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Ativando...');
  
  event.waitUntil(
    (async () => {
      try {
        // Limpar caches antigos
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log(`🗑️ Removendo cache antigo: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
        
        // Assumir controle imediato de todas as abas
        await clients.claim();
        
      } catch (error) {
        console.error('❌ Service Worker: Erro na ativação:', error);
      }
    })()
  );
});

// ============================================================================
// INTERCEPTAÇÃO DE REQUISIÇÕES (CORAÇÃO DO OFFLINE)
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requisições de outros domínios e extensões do navegador
  if (!url.origin.includes(location.origin) || url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // IMPORTANTE: Não interceptar requisições POST, PUT, DELETE, PATCH
  // Deixar essas requisições irem direto para o servidor
  if (request.method !== 'GET') {
    return fetch(request);
  }

  try {
    // 1. ESTRATÉGIA: Network First para dados críticos (sempre tentar buscar online primeiro)
    if (isCriticalData(url)) {
      return await networkFirstStrategy(request);
    }

    // 2. ESTRATÉGIA: Cache First para recursos estáticos (CSS, JS, imagens)
    if (isStaticResource(url)) {
      return await cacheFirstStrategy(request);
    }

    // 3. ESTRATÉGIA: Stale While Revalidate para páginas HTML
    if (isHTMLPage(url)) {
      return await staleWhileRevalidateStrategy(request);
    }

    // 4. ESTRATÉGIA padrão: Network First
    return await networkFirstStrategy(request);

  } catch (error) {
    console.error('❌ Service Worker: Erro ao processar requisição:', error);
    return await getFallbackResponse(request);
  }
}

// ============================================================================
// ESTRATÉGIAS DE CACHE
// ============================================================================

// NETWORK FIRST: Tentar rede primeiro, fallback para cache
async function networkFirstStrategy(request) {
  try {
    // Tentar buscar online com timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), 5000)
      )
    ]);
    
    // Se sucesso, cachear a resposta
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log(`🔄 Network falhou, usando cache para: ${request.url}`);
    
    // Fallback para cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Se não tem cache, retornar página offline
    return await getFallbackResponse(request);
  }
}

// CACHE FIRST: Verificar cache primeiro, rede como fallback  
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Se não está no cache, buscar online e cachear
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    return await getFallbackResponse(request);
  }
}

// STALE WHILE REVALIDATE: Usar cache e atualizar em background
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  // Atualizar em background (não esperar)
  const networkResponsePromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request.clone(), response.clone());
    }
    return response;
  }).catch(error => {
    console.log(`Background update falhou para: ${request.url}`, error);
  });
  
  // Retornar cache imediatamente se disponível
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Se não tem cache, esperar pela rede
  try {
    return await networkResponsePromise;
  } catch (error) {
    return await getFallbackResponse(request);
  }
}

// ============================================================================
// FUNÇÕES DE CLASSIFICAÇÃO
// ============================================================================

function isCriticalData(url) {
  return CACHEABLE_DATA_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isStaticResource(url) {
  return url.pathname.includes('_next/static') ||
         url.pathname.includes('.js') ||
         url.pathname.includes('.css') ||
         url.pathname.includes('.png') ||
         url.pathname.includes('.jpg') ||
         url.pathname.includes('.ico');
}

function isHTMLPage(url) {
  return !url.pathname.includes('.') || url.pathname.endsWith('.html');
}

// ============================================================================
// FALLBACKS E PÁGINAS OFFLINE
// ============================================================================

async function getFallbackResponse(request) {
  const url = new URL(request.url);
  
  // Para páginas HTML, mostrar página offline customizada
  if (isHTMLPage(url)) {
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }
  }
  
  // Para dados de API, retornar resposta JSON vazia
  if (url.pathname.includes('/api/')) {
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'Esta funcionalidade requer conexão com a internet',
      offline: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Fallback genérico
  return new Response('Recurso não disponível offline', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// ============================================================================
// SINCRONIZAÇÃO EM BACKGROUND
// ============================================================================

// Eventos para sincronização quando voltar online
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Evento de sincronização:', event.tag);
  
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncAttendanceData());
  }
  
  if (event.tag === 'reports-sync') {
    event.waitUntil(syncReportData());
  }
});

async function syncAttendanceData() {
  try {
    console.log('📡 Sincronizando dados de frequência...');
    
    // Notificar as abas para obter dados pendentes do localStorage
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      // Enviar mensagem para aplicação processar sync
      clients.forEach(client => {
        client.postMessage({
          type: 'PROCESS_ATTENDANCE_SYNC'
        });
      });
    }
    
    console.log('✅ Solicitação de sincronização enviada');
    
  } catch (error) {
    console.error('❌ Erro na sincronização de frequência:', error);
  }
}

// ============================================================================
// COMUNICAÇÃO COM A APLICAÇÃO
// ============================================================================

self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheSize().then(cacheSize => {
        event.ports[0].postMessage({
          cacheSize,
          isOnline: navigator.onLine
        });
      }).catch(error => {
        event.ports[0].postMessage({
          error: 'Erro ao obter tamanho do cache: ' + error.message,
          cacheSize: 0,
          isOnline: navigator.onLine
        });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'CACHE_ATTENDANCE_DATA':
      // Cache dados de frequência para uso offline
      console.log('Cache de dados de frequência solicitado:', data);
      break;
  }
});

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

async function getCacheSize() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  return keys.length;
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

async function syncReportData() {
  try {
    console.log('📡 Sincronizando relatórios...');
    
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({
          type: 'PROCESS_REPORTS_SYNC'
        });
      });
    }
    
    console.log('✅ Solicitação de sincronização de relatórios enviada');
    
  } catch (error) {
    console.error('❌ Erro na sincronização de relatórios:', error);
  }
}

console.log('🎯 Service Worker carregado e pronto para uso!');