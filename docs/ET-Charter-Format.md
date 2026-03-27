# Exploratory Testing Charter (ET Charter)

## Visão Geral

ET Charters são documentos de teste exploratório usados para registrar descobertas durante sessões de teste exploratório. Testing exploratório é uma abordagem documentada para testar a funcionalidade de um sistema cuja arquitetura é em grande parte desconhecida.

## Estrutura do ET Charter

### 1. Informações Básicas
- **Charter**: Nome do charter (formato de frase, como nome de bug, termina com ponto)
- **Areas**: Áreas cobradas, descreve o test harness usado e as áreas testadas
- **Start**: Data e hora de início
- **Tester**: Nome do testador

### 2. Task Breakdown
- **Duration**: Short (30-60 mins) / Normal (60-90 mins) / Long (90-120 mins)
- **Test Design and Execution**: % de tempo na fase de design e execução
- **Bug Investigation and Reporting**: % de tempo em investigação e reporte de bugs
- **Session Setup**: % de tempo em setup da sessão
- **Charter vs Opportunity**: % de tempo em áreas esperadas vs inesperadas

### 3. Dados e Notas
- **Data Files**: Caminho para dados coletados (screen recordings, screenshots)
- **Test Notes**: Journal passo-a-passo do teste (formato: frase descrevendo ação + bullets de observações)
- **Opportunity**: Same format as Test Notes, mas cobre áreas inesperadas descobertas

### 4. Resultados
- **Bugs**: Bugs encontrados (formato: nome do bug + "Steps to Reproduce" + bullets + "Expected Results" + "Actual Results") - numerados
- **Issues**: Issues encontrados - numerados, descrição em uma ou mais sentenças

## Relacionamentos

```
Project
  └── Test Plan
        └── Test Suite
              ├── Test Case (0..N)
              └── ET Charter (0..N)
                    └── ET Charter Heuristic (N..N)
                          └── Heuristic (1..N)
                                └── Persona (1..N)
```

### Operações Disponíveis
- ✅ Create - Criar novo charter
- ✅ Read/List - Listar charters de uma suite
- ✅ Edit/Update - Editar charter
- ✅ Delete - Deletar charter
- ✅ Copy - Copiar para outra suite
- ✅ Move - Mover para outra suite
- ✅ Assign - Associar testador
- ✅ Link Bugs - Associar bugs descobertos
- ✅ Link Test Cases - Associar test cases relacionados

## Exemplo de ET Charter

```markdown
Charter: Verificar fluxo de checkout com múltiplos itens no carrinho.

Areas:
- Página de carrinho de compras
- Processo de checkout em 3 etapas
- Cálculo de frete e impostos
- Integração com gateway de pagamento

Start: 2024-01-15 09:00
Tester: João Silva

Task Breakdown:
- Duration: Normal (60-90 mins)
- Test Design and Execution: 40%
- Bug Investigation and Reporting: 30%
- Session Setup: 10%
- Charter vs Opportunity: 70/30

Data Files:
- /recordings/checkout-session-2024-01-15.webm
- /screenshots/checkout-error-001.png

Test Notes:
1. Naveguei para a página inicial do site
   - Observei que o banner principal está carregando corretamente
   -Cliquei no menu "Produtos" para ver o catálogo

2. Adicionei 3 itens diferentes ao carrinho
   - Observei que o contador do carrinho atualiza corretamente
   - Os preços unitários estão sendo exibidos corretamente

Opportunity:
1. Notei que o dropdown de categorias tem uma opção "Promoções" não documentada
   - Explorei essa área e encontrei desconto adicional

Bugs:
1. Frete não calcula corretamente para CEPs iniciados com 0.
   Steps to Reproduce:
   - Adicionei item ao carrinho
   - Informei CEP 01000-000
   - Cliquei em "Calcular Frete"
   Expected Results: Deve exibir opções de frete
   Actual Results: Campo fica vazio, nenhum valor exibido

2. Total não atualiza ao remover item do carrinho.
   Steps to Reproduce:
   - Adicionei 2 itens ao carrinho
   - Cliquei em "Remover" do primeiro item
   Expected Results: Total deve mostrar apenas valor do item restante
   Actual Results: Total continua somando os 2 itens

Issues:
1. Performance lenta ao carregar imagens dos produtos na página inicial
2. Botão "Finalizar Compra" não está destacado o suficiente visualmente
```

## Campos do Banco de Dados

### ETCharter
- id (UUID)
- suiteId (FK -> TestSuite)
- charter (TEXT) - nome do charter
- areas (TEXT[]) - lista de áreas cobradas
- startDate (DATETIME) - data/hora de início
- testerId (FK -> User) - testador designado
- duration (ENUM) - short/normal/long
- testDesignPercentage (INT)
- bugInvestigationPercentage (INT)
- sessionSetupPercentage (INT)
- charterVsOpportunity (INT) - % de tempo no charter
- dataFiles (TEXT[]) - caminhos para arquivos
- testNotes (JSON) - array de { action, bullets[] }
- opportunities (JSON) - array de { action, bullets[] }
- bugs (JSON) - array de bugs encontrados
- issues (JSON) - array de issues
- createdById (FK -> User)
- createdAt (DATETIME)
- updatedAt (DATETIME)

### ETCharterBug (many-to-many)
- etCharterId (FK)
- bugId (FK)

### ETCharterTestCase (many-to-many)
- etCharterId (FK)
- testCaseId (FK)
