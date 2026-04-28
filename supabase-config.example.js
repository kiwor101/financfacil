window.FLUXO_APP_ENV = {
  name: "testes",
  label: "Ambiente de testes",
};

window.FLUXO_SUPABASE_CONFIG = window.FLUXO_SUPABASE_CONFIG || {
  // Use um projeto Supabase separado para testes.
  url: "https://seu-projeto-de-testes.supabase.co",
  anonKey: "sua-chave-publica-de-testes",
};
