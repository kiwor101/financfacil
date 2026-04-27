# Controle Financeiro

App simples para registrar entradas, saidas, compras parceladas e contas fixas, com sincronizacao entre celular e computador usando Supabase.

## Caminho Mais Facil

Use esta combinacao:

- `GitHub Pages` para publicar o app.
- `Supabase` para login e banco de dados.
- O mesmo e-mail no celular e no PC para ver os mesmos dados.

## 1. Criar O Banco No Supabase

1. Crie um projeto em https://supabase.com.
2. Abra `SQL Editor`.
3. Rode o conteudo de `supabase-setup.sql`.
4. Confira se as tabelas `transactions` e `recurring_rules` foram criadas.

O SQL ja ativa `Row Level Security`, entao cada conta acessa somente os proprios dados.

## 2. Configurar O Login

No Supabase, abra:

`Authentication` > `URL Configuration`

Depois preencha:

- `Site URL`: a URL publicada do app.
- `Redirect URLs`: a mesma URL publicada do app.

No GitHub Pages, essa URL normalmente fica parecida com:

```text
https://seu-usuario.github.io/nome-do-repositorio/
```

## 3. Configurar A Conexao Do App

Abra `supabase-config.js` e preencha:

```js
window.FLUXO_SUPABASE_CONFIG = window.FLUXO_SUPABASE_CONFIG || {
  url: "https://seu-projeto.supabase.co",
  anonKey: "sua-chave-publica",
};
```

Use somente:

- `publishable key`, quando estiver disponivel.
- ou `anon key`, em projetos que ainda usam as chaves antigas.

Nunca use:

- `secret key`
- `service_role`

Essas chaves privadas dao acesso elevado e nao devem aparecer no navegador nem no GitHub.

## 4. Publicar No GitHub Pages

1. Crie um repositorio no GitHub.
2. Envie estes arquivos para o repositorio.
3. Abra `Settings` > `Pages`.
4. Em `Build and deployment`, escolha publicar a branch `main`.
5. Abra a URL gerada pelo GitHub Pages.

Depois disso, crie uma conta com e-mail e senha no app. Use o mesmo e-mail e senha no celular e no PC. Os lancamentos passam a ficar salvos no Supabase.

Se o Supabase pedir confirmacao de e-mail na criacao da conta, confirme pelo link recebido uma unica vez. Depois disso, o login passa a ser por senha.

## Observacao Importante

A `publishable key` ou `anon key` pode aparecer no app. A seguranca dos dados vem do login do Supabase e das regras `Row Level Security` criadas em `supabase-setup.sql`.
