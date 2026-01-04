# VECTRA AI - Plano de Estabilização e Escalabilidade

## Data: 2026-01-04
## Status: Pré-Lançamento Beta

---

## 1. ANÁLISE DA SITUAÇÃO ATUAL

### 1.1 Problemas Identificados

#### CRÍTICO - Afeta Produção Agora
1. **CSP (Content Security Policy) muito restritiva** ✅ CORRIGIDO
   - Bloqueava imagens da ModelsLab e R2
   - Imagens apareciam como caixas pretas na galeria

2. **Imagens .base64 não processadas** ✅ CORRIGIDO
   - Backend não convertia corretamente URLs `.base64` da ModelsLab
   - Causava broken image icons

#### ALTO - Precisa Resolver Antes do Lançamento
3. **Complexidade do modelslab-studio.tsx (142KB)**
   - Arquivo gigante difícil de manter
   - Alto risco de bugs não detectados

4. **Input Sanitization quebrando dados válidos**
   - O middleware `inputSanitizer` pode estar modificando prompts
   - Caracteres especiais podem ser removidos/escapados incorretamente

5. **Sem observabilidade em produção**
   - Não há logs centralizados
   - Não há health check endpoint
   - Erros não são rastreados

#### MÉDIO - Melhorar para Escalabilidade
6. **routes_legacy.ts ainda existe (125KB)**
   - Código duplicado
   - Aumenta bundle size

7. **Rate limiting pode ser agressivo**
   - Usuários legítimos podem ser bloqueados

---

## 2. PLANO DE AÇÃO IMEDIATO

### Fase 1: Estabilização (Hoje)
- [ ] Verificar se correções de CSP e base64 funcionam em produção
- [ ] Relaxar input sanitization para não quebrar prompts
- [ ] Adicionar health check endpoint

### Fase 2: Simplificação (Próximos 2 dias)
- [ ] Remover routes_legacy.ts se não for usado
- [ ] Revisar rate limiting para não bloquear usuários reais
- [ ] Adicionar error boundaries no frontend

### Fase 3: Observabilidade (Antes do lançamento)
- [ ] Implementar logging estruturado
- [ ] Adicionar tracking de erros básico
- [ ] Criar dashboard de status simples

---

## 3. DECISÕES TÉCNICAS

### O que MANTER
- Stack atual (React + Express + PostgreSQL)
- Integração com ModelsLab
- Sistema de autenticação existente
- Stripe para pagamentos

### O que SIMPLIFICAR
- Security middleware (remover sanitização agressiva)
- CSP (já ajustado para permitir fontes necessárias)
- Rate limiting (aumentar limites ou relaxar)

### O que REMOVER
- Código não usado (routes_legacy.ts?)
- Logs de desenvolvimento em produção
- Features não essenciais para MVP

---

## 4. PRÓXIMOS PASSOS

1. **AGORA**: Faça redeploy no Railway para testar correções de CSP/imagens
2. **TESTE**: Gere uma imagem e veja se aparece corretamente
3. **REPORTE**: Me diga o resultado para continuar com próximas correções

---

## NOTAS

### Conexão Local com Supabase
O Supabase Session Pooler (porta 6543) pode rejeitar conexões externas.
Para desenvolvimento local, considere usar a conexão direta (porta 5432)
ou continue testando via Railway.

### Arquivos Críticos
- `server/middleware/security.ts` - CSP e segurança
- `server/routes/image-generation.ts` - Geração de imagens
- `client/src/pages/modelslab-studio.tsx` - Interface principal
- `server/routes/gallery.ts` - Galeria e proxy
