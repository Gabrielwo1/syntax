/**
 * Syntax Analytics Tracking Script
 * 
 * Como usar:
 * 1. Copie este código e cole antes do </body> no site do cliente
 * 2. Substitua 'SEU_SITE_ID' pelo ID do site no dashboard
 * 3. Substitua 'SEU_PROJECT_ID' pelo ID do seu projeto Supabase
 * 
 * Exemplo:
 * <script>
 *   window.SYNTAX_SITE_ID = 'site:1234567890:abc123';
 *   window.SYNTAX_PROJECT_ID = 'seu-project-id';
 * </script>
 * <script src="https://seu-dominio.com/syntax-analytics.js"></script>
 */

(function() {
  'use strict';

  // Configuração
  const SITE_ID = window.SYNTAX_SITE_ID;
  const PROJECT_ID = window.SYNTAX_PROJECT_ID || 'YOUR_PROJECT_ID';
  const API_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/make-server-cee56a32`;

  if (!SITE_ID) {
    console.warn('Syntax Analytics: SYNTAX_SITE_ID não foi definido');
    return;
  }

  // Função para enviar eventos
  function track(eventData) {
    const data = {
      siteId: SITE_ID,
      page: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      ...eventData
    };

    // Usar sendBeacon se disponível (melhor para page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(`${API_URL}/track`, blob);
    } else {
      // Fallback para fetch
      fetch(`${API_URL}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(err => console.error('Syntax Analytics error:', err));
    }
  }

  // Track pageview automaticamente
  track({ event: 'pageview' });

  // Track tempo na página
  let startTime = Date.now();
  let isActive = true;

  window.addEventListener('beforeunload', function() {
    const timeOnPage = Math.round((Date.now() - startTime) / 1000);
    track({
      event: 'session_end',
      duration: timeOnPage,
      active: isActive
    });
  });

  // Detectar inatividade
  let inactivityTimer;
  function resetInactivityTimer() {
    isActive = true;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      isActive = false;
    }, 30000); // 30 segundos de inatividade
  }

  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
  });

  resetInactivityTimer();

  // Track clicks em links externos
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && link.href) {
      const url = new URL(link.href, window.location.href);
      if (url.hostname !== window.location.hostname) {
        track({
          event: 'external_link',
          url: link.href,
          text: link.textContent.trim()
        });
      }
    }
  }, true);

  // API pública para tracking customizado
  window.syntaxAnalytics = {
    track: function(eventName, properties) {
      track({
        event: eventName,
        ...properties
      });
    }
  };

  console.log('Syntax Analytics initialized for site:', SITE_ID);
})();
