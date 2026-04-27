# Controle Financeiro

App web simples e responsivo para controle financeiro pessoal, feito para uso rapido no celular e no computador. Ele permite registrar entradas, saidas, compras parceladas e contas fixas, mantendo os dados sincronizados entre dispositivos com Supabase.

## Funcionalidades

- Resumo mensal com saldo, entradas, saidas e compromissos ativos.
- Lancamento rapido de receitas e despesas.
- Compras parceladas aparecendo automaticamente nos proximos meses.
- Contas fixas mensais com opcao de encerramento.
- Historico com busca e filtro por tipo.
- Login com e-mail e senha.
- Sincronizacao entre celular e PC usando Supabase.
- Funcionamento como site estatico, ideal para GitHub Pages.

## Tecnologias

- HTML
- CSS
- JavaScript
- Supabase Auth
- Supabase Database
- GitHub Pages

## Como Usar

Depois de publicado, abra o link do app no celular ou no computador.

1. Clique em `Conectar`.
2. Crie uma conta com e-mail e senha.
3. Confirme o e-mail, se o Supabase solicitar.
4. Entre com o mesmo e-mail e senha nos outros dispositivos.
5. Cadastre seus lancamentos normalmente.

Os dados ficam salvos no Supabase e aparecem nos dispositivos conectados com a mesma conta.

## Configuracao Do Supabase

Crie um projeto no Supabase e rode o arquivo `supabase-setup.sql` no `SQL Editor`.

Esse script cria as tabelas:

- `transactions`
- `recurring_rules`

Ele tambem ativa `Row Level Security`, garantindo que cada usuario veja apenas os proprios dados.

## Configuracao Do App

Edite o arquivo `supabase-config.js`:

```js
window.FLUXO_SUPABASE_CONFIG = window.FLUXO_SUPABASE_CONFIG || {
  url: "https://seu-projeto.supabase.co",
  anonKey: "sua-chave-publica",
};
```

Use apenas:

- `publishable key`
- ou `anon key`

Nunca use:

- `secret key`
- `service_role`

Essas chaves privadas dao acesso elevado ao projeto e nao devem ir para o navegador nem para o GitHub.

## Configuracao De Login

No Supabase, confira:

1. Abra `Authentication`.
2. Va em `Providers`.
3. Habilite o provedor `Email`.
4. Em `URL Configuration`, configure:

```text
Site URL: https://seu-usuario.github.io/nome-do-repositorio/
Redirect URLs: https://seu-usuario.github.io/nome-do-repositorio/
```

Para este projeto no GitHub Pages, o formato esperado e:

```text
https://kiwor101.github.io/financfacil/
```

## Publicacao No GitHub Pages

1. Envie os arquivos para um repositorio no GitHub.
2. Abra `Settings`.
3. Clique em `Pages`.
4. Em `Build and deployment`, selecione `Deploy from a branch`.
5. Escolha a branch `main`.
6. Escolha a pasta `/root`.
7. Clique em `Save`.

Depois de alguns minutos, o app ficara disponivel na URL do GitHub Pages.

## Rodando Localmente

Como o projeto e estatico, basta abrir o arquivo `index.html` no navegador.

Para testar o login do Supabase com redirecionamento, o ideal e usar a versao publicada no GitHub Pages.

## Estrutura

```text
.
+-- index.html
+-- styles.css
+-- app.js
+-- supabase-config.js
+-- supabase-setup.sql
+-- README.md
```

## Observacoes De Seguranca

A chave publica do Supabase pode aparecer no app. Em aplicacoes web, ela precisa ir para o navegador para que o cliente consiga se conectar ao Supabase.

A protecao dos dados vem de:

- login do Supabase Auth
- tabelas com `Row Level Security`
- politicas que limitam cada usuario ao proprio `user_id`

## Status

Projeto em evolucao, com foco em uso pessoal diario, interface compacta e sincronizacao simples entre celular e computador.
