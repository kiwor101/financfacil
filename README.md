# FinancFacil

Controle financeiro pessoal simples, responsivo e pensado para uso diario no celular e no computador.

> Projeto em desenvolvimento. A aplicacao ja possui uma versao funcional, mas ainda esta recebendo melhorias de interface, experiencia de uso, sincronizacao e organizacao dos dados.

## Sobre o projeto

O FinancFacil nasceu com a ideia de ser um controle financeiro pratico, sem depender de planilhas complexas. O foco e registrar entradas, saidas, contas fixas, compras parceladas e acompanhar o saldo atual de forma rapida.

A proposta e manter uma interface compacta, limpa e facil de usar no dia a dia, principalmente pelo celular.

## Funcionalidades atuais

- Saldo atual calculado a partir das entradas e saidas.
- Controle separado para caixa de emergencia e investimentos.
- Cadastro de entradas e saidas por categoria.
- Campo personalizado para categorias do tipo `Outros`.
- Compras parceladas refletindo nos meses seguintes.
- Contas fixas mensais.
- Edicao e exclusao de lancamentos.
- Historico com busca e filtro.
- Login com e-mail e senha.
- Sincronizacao entre dispositivos usando Supabase.
- Modo claro e modo escuro.
- Suporte a instalacao como PWA.

## Tecnologias

- HTML
- CSS
- JavaScript
- Supabase Auth
- Supabase Database
- GitHub Pages
- PWA

## Status

Este projeto ainda esta em desenvolvimento ativo.

Prioridades atuais:

- melhorar a experiencia no celular;
- refinar o visual da dashboard;
- evoluir os graficos e resumos;
- melhorar fluxos de login e sincronizacao;
- preparar uma versao futura para app mobile.

## Como rodar localmente

Por ser um projeto estatico, basta abrir o arquivo `index.html` no navegador.

Para testar login, sincronizacao e PWA com mais fidelidade, o ideal e usar a versao publicada no GitHub Pages.

## Configuracao do Supabase

1. Crie um projeto no Supabase.
2. Rode o arquivo `supabase-setup.sql` no SQL Editor.
3. Copie a URL do projeto e a chave publica.
4. Configure o arquivo `supabase-config.js`.

Exemplo:

```js
window.FLUXO_SUPABASE_CONFIG = window.FLUXO_SUPABASE_CONFIG || {
  url: "https://seu-projeto.supabase.co",
  anonKey: "sua-chave-publica",
};
```

Use somente a chave publica do Supabase, como `publishable key` ou `anon key`.

Nunca coloque `secret key` ou `service_role` no projeto, porque essas chaves nao devem ir para o navegador nem para o GitHub.

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

## Seguranca

O app usa Supabase Auth e Row Level Security para separar os dados por usuario.

A chave publica do Supabase pode ficar no frontend, desde que as tabelas estejam protegidas com RLS e politicas corretas.

## Roadmap

- Melhorar os graficos financeiros.
- Criar mais opcoes de resumo mensal.
- Refinar design mobile-first.
- Melhorar onboarding de novos usuarios.
- Preparar empacotamento futuro para Android.

## Marca

Desenvolvido como projeto da marca **kiwors**.
