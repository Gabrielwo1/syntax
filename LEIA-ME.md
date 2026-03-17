# 🚀 Sistema de Analytics Syntax

Sistema completo de gerenciamento e analytics para sites de clientes da agência Syntax.

## ✨ O Que Foi Criado

### 1. **Dashboard Principal**
- Visão geral de todos os sites
- Estatísticas agregadas (visitas totais, visitantes únicos, taxa de rejeição)
- Cards individuais para cada site com métricas
- Modo demonstração com dados fictícios

### 2. **Sistema de Analytics Próprio**
- Script de tracking JavaScript leve (~2KB)
- Backend em Supabase para armazenar dados
- Rastreamento em tempo real
- Sem dependência de Google Analytics ou outros serviços

### 3. **Página de Detalhes do Site**
- Gráfico de visitantes dos últimos 7 dias
- Distribuição por dispositivo (desktop/mobile/tablet)
- Páginas mais visitadas
- Informações do cliente

### 4. **Código de Tracking**
- Modal com código pronto para copiar
- Instruções de instalação
- Exemplos de uso personalizado

## 📁 Estrutura de Arquivos

```
/src/app/
├── App.tsx                    # Componente principal
├── routes.tsx                 # Configuração de rotas
├── components/
│   ├── Dashboard.tsx          # Dashboard principal
│   ├── SiteDetails.tsx        # Detalhes de cada site
│   ├── SiteCard.tsx           # Card de site individual
│   ├── AddSiteModal.tsx       # Modal para adicionar site
│   ├── TrackingCodeModal.tsx  # Modal com código de tracking
│   ├── QuickStartGuide.tsx    # Guia rápido visual
│   ├── Instructions.tsx       # Página de instruções
│   ├── Header.tsx             # Cabeçalho
│   └── Root.tsx               # Layout raiz
├── data/
│   └── mockData.ts            # Dados de demonstração
└── types/
    └── index.ts               # TypeScript types

/supabase/functions/server/
├── index.tsx                  # Servidor backend com APIs
└── kv_store.tsx              # Utilitários do banco de dados

/public/
├── syntax-analytics.js        # Script de tracking standalone
└── exemplo-site-cliente.html  # Exemplo de site com tracking
```

## 🎯 Como Usar

### Passo 1: Adicionar um Site

1. Clique em **"Adicionar Site"** no dashboard
2. Preencha:
   - Nome do Cliente
   - URL do site
3. Clique em **"Adicionar"**

### Passo 2: Obter o Código de Tracking

1. No card do site, clique no ícone **`</>` (código)**
2. Copie o código completo que aparece no modal
3. O código já vem configurado com o ID único do site

### Passo 3: Instalar no Site do Cliente

Cole o código copiado no site do cliente, **antes da tag `</body>`**:

```html
<!DOCTYPE html>
<html>
<body>
  <!-- Conteúdo do site -->
  
  <!-- COLE O CÓDIGO AQUI -->
  <script>
    window.SYNTAX_SITE_ID = 'site:xxxxx';
    window.SYNTAX_PROJECT_ID = 'seu-project-id';
  </script>
  <script>
    // ... código de tracking ...
  </script>
  
</body>
</html>
```

### Passo 4: Verificar

1. Acesse o site do cliente
2. Abra o Console (F12 → Console)
3. Procure por: `"Syntax Analytics initialized"`
4. Volte ao dashboard para ver os dados

## 📊 O Que é Rastreado

### Automático
- ✅ **Pageviews** - Toda visualização de página
- ✅ **Tempo de permanência** - Duração da sessão
- ✅ **Dispositivo** - Desktop, mobile ou tablet (baseado em screen width)
- ✅ **Links externos** - Cliques em links que saem do site
- ✅ **Referrer** - De onde o visitante veio

### Personalizado (Opcional)

Você pode rastrear eventos customizados:

```javascript
// Rastrear clique em botão
document.getElementById('btnComprar').addEventListener('click', function() {
  window.syntaxAnalytics.track('clique_comprar', {
    produto: 'Plano Premium',
    valor: 99.90
  });
});

// Rastrear envio de formulário
document.querySelector('form').addEventListener('submit', function() {
  window.syntaxAnalytics.track('formulario_enviado');
});
```

## 🔧 Endpoints da API

### Backend (Supabase Functions)

```
POST /make-server-cee56a32/track
- Recebe eventos de tracking
- Body: { siteId, event, page, referrer, userAgent, screenSize }

GET /make-server-cee56a32/analytics/:siteId
- Retorna estatísticas de um site

GET /make-server-cee56a32/events/:siteId
- Retorna eventos recentes

POST /make-server-cee56a32/sites
- Cria um novo site
- Body: { name, url, clientName, clientEmail, clientPhone }

GET /make-server-cee56a32/sites
- Lista todos os sites com estatísticas
```

## 💾 Estrutura de Dados (KV Store)

```
site:xxxxx                    → Dados do site
site:xxxxx:stats              → Estatísticas agregadas
  - totalVisits
  - uniqueVisitors
  - pageViews (objeto com páginas)
  - devices (desktop, mobile, tablet)
site:xxxxx:event:timestamp    → Evento individual
sites:list                    → Array com IDs de todos os sites
```

## 🧪 Testar Localmente

1. Abra `/public/exemplo-site-cliente.html`
2. Cole seu código de tracking no arquivo
3. Abra no navegador
4. Interaja com a página
5. Veja os dados no dashboard

## 🎨 Recursos Visuais

- **Dashboard**: Cards com métricas em tempo real
- **Gráficos**: Recharts para visualizações
- **Responsivo**: Funciona em desktop e mobile
- **Dark/Light Code**: Syntax highlighting nos códigos

## ⚙️ Tecnologias Utilizadas

- **Frontend**: React, React Router, Tailwind CSS
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Backend**: Supabase Edge Functions (Deno + Hono)
- **Banco de Dados**: Supabase KV Store

## 🔒 Privacidade

- ✅ Não coleta dados pessoais identificáveis (PII)
- ✅ Dados armazenados no seu servidor Supabase
- ✅ Você tem controle total dos dados
- ✅ Código leve e não invasivo

## ⚠️ Limitações

- Ad blockers podem bloquear o tracking
- Requer JavaScript habilitado
- Dados em KV store (não relacional)
- Sem histórico de longo prazo (pode ser implementado)

## 🚀 Próximos Passos Possíveis

1. **Visitantes únicos reais** - Usar cookies ou localStorage
2. **Taxa de rejeição calculada** - Baseada em interações
3. **Funil de conversão** - Rastrear jornada do usuário
4. **Relatórios PDF** - Exportar dados
5. **Notificações** - Alertas de picos de tráfego
6. **Heatmaps** - Mapas de calor de cliques
7. **A/B Testing** - Testes de variações
8. **Dashboard do cliente** - Acesso restrito por cliente

## 📚 Documentação Adicional

- `/INSTRUCOES_ANALYTICS.md` - Instruções completas
- `/public/syntax-analytics.js` - Script standalone
- `/public/exemplo-site-cliente.html` - Exemplo prático

## 💡 Dicas

1. **Teste primeiro** - Use o exemplo HTML para testar
2. **Console é seu amigo** - Sempre verifique o console
3. **CORS está aberto** - O servidor aceita requisições de qualquer origem
4. **Dados persistem** - Armazenados no Supabase KV
5. **Leve e rápido** - Script ~2KB não afeta performance

## 🆘 Solução de Problemas

### Dados não aparecem no dashboard
- Recarregue a página
- Verifique se o site foi criado
- Confirme que o tracking está instalado
- Abra o console e procure por erros

### "Syntax Analytics não inicializado"
- Verifique se `SYNTAX_SITE_ID` está correto
- Confirme que `SYNTAX_PROJECT_ID` está correto
- Certifique-se que o código está antes do `</body>`

### Erro de CORS
- O servidor já está configurado com CORS aberto
- Verifique se a URL da API está correta
- Teste o endpoint no navegador

---

**Desenvolvido para Syntax Agency** 🎨  
Sistema de analytics próprio, sem dependências externas.
