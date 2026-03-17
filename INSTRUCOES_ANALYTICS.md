# 📊 Sistema de Analytics Syntax - Instruções

## Como Funciona

O sistema de analytics da Syntax permite rastrear visitantes dos sites dos seus clientes em tempo real, sem depender de serviços terceiros como Google Analytics.

## Passo a Passo para Implementação

### 1. Adicionar Site no Dashboard

1. Acesse o dashboard
2. Clique em "Adicionar Site"
3. Preencha:
   - Nome do Cliente
   - URL do site
4. Clique em "Adicionar"

### 2. Obter o Código de Tracking

Após adicionar o site:

1. Clique no ícone `</>` (código) no card do site
2. Copie o código completo que aparece no modal
3. O código já vem configurado com o ID único do site

### 3. Instalar no Site do Cliente

**Onde colar o código:**

Cole o código copiado no site do cliente, logo **antes da tag `</body>`** (final do arquivo HTML).

```html
<!DOCTYPE html>
<html>
<head>
  <title>Site do Cliente</title>
</head>
<body>
  
  <!-- Conteúdo do site -->
  
  <!-- COLE O CÓDIGO DE TRACKING AQUI -->
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

### 4. Verificar se está Funcionando

1. Acesse o site do cliente no navegador
2. Abra o Console (F12 → Console)
3. Você deve ver: `"Syntax Analytics initialized"`
4. Volte ao dashboard e veja as estatísticas atualizando

## O Que é Rastreado Automaticamente

✅ **Pageviews** - Toda vez que uma página é carregada  
✅ **Tempo de permanência** - Quanto tempo o visitante ficou  
✅ **Dispositivo** - Desktop, mobile ou tablet  
✅ **Links externos** - Cliques em links que saem do site  
✅ **Página de origem** - De onde o visitante veio (referrer)  

## Rastreamento Personalizado (Opcional)

Você pode rastrear eventos customizados no site do cliente. Por exemplo:

### Exemplo 1: Rastrear clique em botão de compra

```javascript
document.getElementById('btnComprar').addEventListener('click', function() {
  window.syntaxAnalytics.track('clique_comprar', {
    produto: 'Plano Premium',
    valor: 99.90
  });
});
```

### Exemplo 2: Rastrear envio de formulário

```javascript
document.getElementById('formContato').addEventListener('submit', function() {
  window.syntaxAnalytics.track('formulario_enviado', {
    tipo: 'contato'
  });
});
```

### Exemplo 3: Rastrear scroll na página

```javascript
let scrollTracked = false;
window.addEventListener('scroll', function() {
  if (!scrollTracked && window.scrollY > 500) {
    window.syntaxAnalytics.track('scroll_profundo');
    scrollTracked = true;
  }
});
```

## Visualizando os Dados

### No Dashboard Principal

- Total de sites
- Visitas totais de todos os sites
- Visitantes únicos
- Taxa de rejeição média

### Na Página de Detalhes do Site

1. Clique em "Ver Detalhes" no card do site
2. Você verá:
   - Gráfico de visitantes dos últimos 7 dias
   - Distribuição por dispositivo (desktop/mobile/tablet)
   - Páginas mais visitadas
   - Informações do cliente

## Estrutura de Dados

Os dados são armazenados no Supabase usando a tabela KV (key-value):

```
site:xxxxx                    → Dados do site
site:xxxxx:stats              → Estatísticas agregadas
site:xxxxx:event:timestamp    → Cada evento individual
sites:list                    → Lista de todos os sites
```

## Limitações e Considerações

⚠️ **Privacidade**: O sistema não coleta dados pessoais identificáveis (PII)  
⚠️ **Performance**: O código é leve (~2KB) e não afeta a velocidade do site  
⚠️ **Ad Blockers**: Alguns bloqueadores de anúncio podem bloquear o tracking  
⚠️ **CORS**: O servidor está configurado para aceitar requisições de qualquer origem  

## Comparação com Google Analytics

| Recurso | Syntax Analytics | Google Analytics |
|---------|------------------|------------------|
| Configuração | Muito simples | Complexa |
| Dados | Seu servidor | Servidor do Google |
| Privacidade | Total controle | Dados compartilhados |
| Custo | Incluído | Grátis/Pago |
| Personalização | Total | Limitada |
| Tempo real | ✅ Sim | ✅ Sim |

## Solução de Problemas

### O código não está funcionando

1. Verifique se o código está antes do `</body>`
2. Abra o Console e procure por erros
3. Verifique se `SYNTAX_SITE_ID` e `SYNTAX_PROJECT_ID` estão corretos
4. Teste se o servidor está respondendo

### Os dados não aparecem no dashboard

1. Recarregue a página do dashboard
2. Verifique se o site está na lista
3. Acesse o site do cliente para gerar eventos
4. Aguarde alguns segundos e recarregue o dashboard

### Erro de CORS

- O servidor já está configurado com CORS aberto
- Se ainda assim houver erro, verifique o console do navegador

## Suporte Técnico

Para dúvidas ou problemas:
1. Verifique este documento primeiro
2. Consulte o código em `/supabase/functions/server/index.tsx`
3. Verifique os logs no console do navegador

---

**Desenvolvido pela Syntax Agency** 🚀
