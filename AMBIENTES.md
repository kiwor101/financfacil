# Ambientes do FinancFacil

Este repositório agora fica dividido em duas pastas de trabalho:

- `C:\Users\Ti\Documents\GitHub\financfacil`: produção, branch `main`.
- `C:\Users\Ti\Documents\GitHub\financfacil-teste`: testes, branch `develop`.

## Produção

Use a pasta `financfacil` para a versão estável do app, aquela que você usa no celular e no computador.

Evite fazer experimentos direto nela.

## Testes

Use a pasta `financfacil-teste` para novas ideias, mudanças grandes, testes de layout e ajustes que ainda podem quebrar alguma coisa.

Essa versão tem uma etiqueta visual de `Ambiente de testes` no topo da tela.

## Supabase

O arquivo `supabase-config.js` da branch `develop` vem sem URL e sem chave por padrão.

Para testar sincronização sem misturar dados reais:

1. Crie outro projeto no Supabase.
2. Rode o `supabase-setup.sql` nesse projeto novo.
3. Coloque a URL e a chave pública desse projeto de testes no `supabase-config.js` da pasta `financfacil-teste`.

Nunca coloque `secret key` ou `service_role` em nenhum arquivo do frontend.

## Fluxo seguro

1. Fazer mudanças na pasta `financfacil-teste`.
2. Testar no navegador e no celular.
3. Quando estiver estável, levar a mudança para `main`.
4. Só depois publicar a produção.
