window.FLUXO_APP_ENV = {
  name: "testes",
  label: "Ambiente de testes",
};

window.FLUXO_SUPABASE_CONFIG = window.FLUXO_SUPABASE_CONFIG || {
  // Use aqui um projeto Supabase separado do ambiente de produção.
  // Nunca use secret key ou service_role no navegador.
  url: "",
  anonKey: "",
};
