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
- Instalacao como PWA no celular.

## Tecnologias

- HTML
- CSS
- JavaScript
- Supabase Auth
- Supabase Database
- GitHub Pages
- PWA

## Como Usar

Depois de publicado, abra o link do app no celular ou no computador.

1. Clique em `Conectar`.
2. Clique em `Criar conta`.
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

Adicione tambem a pagina de conta nas URLs permitidas:

```text
https://kiwor101.github.io/financfacil/conta.html
```

Essa pagina e usada para criar conta, recuperar senha e definir uma nova senha.

## Entrega De E-mails

O Supabase envia e-mails de confirmacao e recuperacao de senha. Em projetos reais, configure um SMTP proprio para melhorar a entrega e reduzir a chance de cair no spam.

Boas praticas:

- usar um provedor de e-mail transacional
- configurar SPF, DKIM e DMARC no dominio de envio
- usar um remetente proprio, como `no-reply@seudominio.com`
- evitar textos promocionais nos e-mails de autenticacao
- configurar um dominio customizado no Supabase quando possivel

Nao existe garantia de cair sempre na caixa principal, porque isso depende dos filtros do provedor de e-mail do usuario, mas essas configuracoes melhoram bastante a reputacao do envio.

## Publicacao No GitHub Pages

1. Envie os arquivos para um repositorio no GitHub.
2. Abra `Settings`.
3. Clique em `Pages`.
4. Em `Build and deployment`, selecione `Deploy from a branch`.
5. Escolha a branch `main`.
6. Escolha a pasta `/root`.
7. Clique em `Save`.

Depois de alguns minutos, o app ficara disponivel na URL do GitHub Pages.

## Usando Como App No Celular

O projeto tem suporte a PWA com:

- `manifest.webmanifest`
- `sw.js`
- `pwa.js`
- `icon.svg`

No Android, abra a URL publicada pelo Chrome e use `Adicionar a tela inicial` ou `Instalar app`.

## Publicacao Na Google Play

O caminho mais simples para publicar este projeto na Google Play e empacotar a PWA como um app Android usando Trusted Web Activity.

Fluxo recomendado:

1. Publique o app no GitHub Pages.
2. Garanta que a PWA esteja funcionando.
3. Use PWABuilder ou Bubblewrap para gerar o projeto Android.
4. Gere um Android App Bundle, arquivo `.aab`.
5. Crie uma conta no Google Play Console.
6. Envie o `.aab` para revisao.

Pontos importantes:

- A Google Play exige conta de desenvolvedor.
- O app precisa ser assinado.
- A publicacao passa por revisao da Google.
- Para Trusted Web Activity, o dominio precisa ser verificado com Digital Asset Links.
- Este projeto usa GitHub Pages, entao a URL publicada precisa estar estavel antes de empacotar.

## Rodando Localmente

Como o projeto e estatico, basta abrir o arquivo `index.html` no navegador.

Para testar o login do Supabase com redirecionamento, o ideal e usar a versao publicada no GitHub Pages.

## Estrutura

```text
.
+-- index.html
+-- conta.html
+-- styles.css
+-- app.js
+-- conta.js
+-- manifest.webmanifest
+-- sw.js
+-- pwa.js
+-- icon.svg
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
