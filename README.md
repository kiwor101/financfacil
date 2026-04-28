# FinancFacil

Controle financeiro pessoal simples, responsivo e pensado para uso diário no celular e no computador.

> Projeto em desenvolvimento. A aplicação já possui uma versão funcional, mas ainda está recebendo melhorias de interface, experiência de uso, sincronização e organização dos dados.

## Sobre o projeto

O FinancFacil nasceu com a ideia de ser um controle financeiro prático, sem depender de planilhas complexas. O foco é registrar entradas, saídas, contas fixas, compras parceladas e acompanhar o saldo atual de forma rápida.

A proposta é manter uma interface compacta, limpa e fácil de usar no dia a dia, principalmente pelo celular.

## Funcionalidades atuais

- Saldo atual calculado a partir das entradas e saídas.
- Saldos iniciais para saldo atual, caixa de emergência e investimentos.
- Controle separado para caixa de emergência e investimentos.
- Cadastro de entradas e saídas por categoria.
- Campo personalizado para categorias do tipo `Outros`.
- Compras parceladas refletindo nos meses seguintes.
- Contas fixas mensais.
- Edição e exclusão de lançamentos.
- Histórico com busca e filtro.
- Login com e-mail e senha.
- Sincronização entre dispositivos usando Supabase.
- Modo claro e modo escuro.
- Suporte a instalação como PWA.

## Tecnologias

- HTML
- CSS
- JavaScript
- Supabase Auth
- Supabase Database
- GitHub Pages
- PWA

## Status

Este projeto ainda está em desenvolvimento ativo.

Prioridades atuais:

- melhorar a experiência no celular;
- refinar o visual da dashboard;
- evoluir os gráficos e resumos;
- melhorar fluxos de login e sincronização;
- preparar uma versão futura para app mobile.

## Como rodar localmente

Por ser um projeto estático, basta abrir o arquivo `index.html` no navegador.

Para testar login, sincronização e PWA com mais fidelidade, o ideal é usar a versão publicada no GitHub Pages.

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Rode o arquivo `supabase-setup.sql` no SQL Editor.
3. Copie a URL do projeto e a chave pública.
4. Configure o arquivo `supabase-config.js`.

Exemplo:

```js
window.FLUXO_SUPABASE_CONFIG = window.FLUXO_SUPABASE_CONFIG || {
  url: "https://seu-projeto.supabase.co",
  anonKey: "sua-chave-do-supabase",
};
```

Use somente a chave pública do Supabase, como `publishable key` ou `anon key`.

Nunca coloque `secret key` ou `service_role` no projeto, porque essas chaves não devem ir para o navegador nem para o GitHub.

Sempre que o arquivo `supabase-setup.sql` for atualizado, rode-o novamente no SQL Editor para aplicar novas colunas e ajustes.

## Estrutura principal

```text
.
|-- index.html
|-- conta.html
|-- styles.css
|-- app.js
|-- conta.js
|-- supabase-config.js
|-- supabase-setup.sql
|-- manifest.webmanifest
|-- sw.js
|-- pwa.js
|-- icon.svg
```

## Segurança

O app usa Supabase Auth e Row Level Security para separar os dados por usuário.

A chave pública do Supabase pode ficar no frontend, desde que as tabelas estejam protegidas com RLS e políticas corretas.

## Roadmap

- Melhorar os gráficos financeiros.
- Criar mais opções de resumo mensal.
- Refinar design mobile-first.
- Melhorar onboarding de novos usuários.
- Preparar empacotamento futuro para Android.

## Marca

Desenvolvido como projeto da marca **kiwors**.
