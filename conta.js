const SUPABASE_CONFIG_KEY = "fluxo-leve-supabase-config-v1";
const AUTH_EMAIL_KEY = "fluxo-leve-auth-email-v1";

const elements = {
  title: document.querySelector("#accountTitle"),
  subtitle: document.querySelector("#accountSubtitle"),
  tabs: document.querySelectorAll(".account-tab"),
  signupForm: document.querySelector("#signupForm"),
  signupNameInput: document.querySelector("#signupNameInput"),
  signupEmailInput: document.querySelector("#signupEmailInput"),
  signupPasswordInput: document.querySelector("#signupPasswordInput"),
  signupPasswordConfirmInput: document.querySelector("#signupPasswordConfirmInput"),
  signupButton: document.querySelector("#signupButton"),
  recoveryForm: document.querySelector("#recoveryForm"),
  recoveryEmailInput: document.querySelector("#recoveryEmailInput"),
  recoveryButton: document.querySelector("#recoveryButton"),
  newPasswordForm: document.querySelector("#newPasswordForm"),
  newPasswordInput: document.querySelector("#newPasswordInput"),
  newPasswordConfirmInput: document.querySelector("#newPasswordConfirmInput"),
  newPasswordButton: document.querySelector("#newPasswordButton"),
  message: document.querySelector("#accountMessage"),
};

const state = {
  mode: getInitialMode(),
  busy: false,
  supabaseClient: null,
};

bootstrap();

function bootstrap() {
  const config = loadSupabaseConfig();
  const emailFromUrl = new URLSearchParams(window.location.search).get("email") || "";

  elements.signupEmailInput.value = emailFromUrl;
  elements.recoveryEmailInput.value = emailFromUrl;

  bindEvents();

  if (!hasSupabaseConfig(config)) {
    setBusy(true);
    renderMode();
    setMessage(
      "A conexao com Supabase nao esta configurada. Confira o arquivo supabase-config.js.",
      "error",
    );
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    setBusy(true);
    renderMode();
    setMessage("Nao consegui carregar a biblioteca do Supabase. Confira sua internet.", "error");
    return;
  }

  state.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  state.supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      setMode("nova-senha");
      setMessage("Digite uma nova senha para concluir a recuperacao.", "success");
    }
  });

  renderMode();
}

function bindEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setMode(tab.dataset.mode);
    });
  });

  elements.signupForm.addEventListener("submit", handleSignup);
  elements.recoveryForm.addEventListener("submit", handleRecovery);
  elements.newPasswordForm.addEventListener("submit", handleNewPassword);
}

async function handleSignup(event) {
  event.preventDefault();

  const name = elements.signupNameInput.value.trim();
  const email = elements.signupEmailInput.value.trim().toLowerCase();
  const password = elements.signupPasswordInput.value;
  const passwordConfirm = elements.signupPasswordConfirmInput.value;

  if (!validateEmail(email) || !validatePasswordPair(password, passwordConfirm)) {
    return;
  }

  try {
    setBusy(true, "Criando...");
    const { data, error } = await state.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: getAppUrl(),
      },
    });

    if (error) {
      throw error;
    }

    localStorage.setItem(AUTH_EMAIL_KEY, email);
    clearPasswordFields();

    if (data.session?.user) {
      setMessage("Conta criada. Redirecionando para o app...", "success");
      window.setTimeout(() => {
        window.location.href = "./index.html";
      }, 900);
      return;
    }

    setMessage(
      "Conta criada. Confira seu e-mail para confirmar o acesso e depois entre no app.",
      "success",
    );
  } catch (error) {
    setMessage(formatAuthError(error, "Nao consegui criar a conta."), "error");
  } finally {
    setBusy(false);
  }
}

async function handleRecovery(event) {
  event.preventDefault();

  const email = elements.recoveryEmailInput.value.trim().toLowerCase();
  if (!validateEmail(email)) {
    return;
  }

  try {
    setBusy(true, "Enviando...");
    const { error } = await state.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: getAccountUrl("nova-senha"),
    });

    if (error) {
      throw error;
    }

    localStorage.setItem(AUTH_EMAIL_KEY, email);
    setMessage("E-mail de recuperacao enviado. Confira sua caixa de entrada.", "success");
  } catch (error) {
    setMessage(formatAuthError(error, "Nao consegui enviar a recuperacao."), "error");
  } finally {
    setBusy(false);
  }
}

async function handleNewPassword(event) {
  event.preventDefault();

  const password = elements.newPasswordInput.value;
  const passwordConfirm = elements.newPasswordConfirmInput.value;
  if (!validatePasswordPair(password, passwordConfirm)) {
    return;
  }

  try {
    setBusy(true, "Salvando...");
    const { error } = await state.supabaseClient.auth.updateUser({
      password,
    });

    if (error) {
      throw error;
    }

    clearPasswordFields();
    setMessage("Senha atualizada. Redirecionando para o app...", "success");
    window.setTimeout(() => {
      window.location.href = "./index.html";
    }, 900);
  } catch (error) {
    setMessage(formatAuthError(error, "Nao consegui atualizar sua senha."), "error");
  } finally {
    setBusy(false);
  }
}

function setMode(mode) {
  state.mode = mode;
  const url = new URL(window.location.href);
  url.searchParams.set("modo", mode);
  window.history.replaceState({}, "", url);
  renderMode();
}

function renderMode() {
  const mode = state.mode;
  elements.signupForm.hidden = mode !== "criar";
  elements.recoveryForm.hidden = mode !== "recuperar";
  elements.newPasswordForm.hidden = mode !== "nova-senha";

  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
    tab.hidden = mode === "nova-senha";
  });

  if (mode === "recuperar") {
    elements.title.textContent = "Recuperar senha";
    elements.subtitle.textContent = "Informe seu e-mail para receber o link de recuperacao.";
    setMessage("Use o e-mail cadastrado na sua conta.", "muted");
    return;
  }

  if (mode === "nova-senha") {
    elements.title.textContent = "Nova senha";
    elements.subtitle.textContent = "Crie uma senha nova para voltar a acessar o app.";
    setMessage("Digite e confirme sua nova senha.", "muted");
    return;
  }

  elements.title.textContent = "Criar conta";
  elements.subtitle.textContent =
    "Use um e-mail e senha para acessar seus dados no celular e no computador.";
  setMessage("Se ja tiver conta, volte para o app e entre com e-mail e senha.", "muted");
}

function setBusy(isBusy, label = "") {
  state.busy = isBusy;
  elements.signupButton.disabled = isBusy;
  elements.recoveryButton.disabled = isBusy;
  elements.newPasswordButton.disabled = isBusy;

  elements.signupButton.textContent = isBusy && state.mode === "criar" ? label : "Criar conta";
  elements.recoveryButton.textContent =
    isBusy && state.mode === "recuperar" ? label : "Enviar recuperacao";
  elements.newPasswordButton.textContent =
    isBusy && state.mode === "nova-senha" ? label : "Salvar nova senha";
}

function setMessage(message, tone = "muted") {
  elements.message.dataset.tone = tone;
  elements.message.textContent = message;
}

function validateEmail(email) {
  if (!email || !email.includes("@")) {
    setMessage("Digite um e-mail valido.", "error");
    return false;
  }

  return true;
}

function validatePasswordPair(password, passwordConfirm) {
  if (!password || password.length < 6) {
    setMessage("A senha precisa ter pelo menos 6 caracteres.", "error");
    return false;
  }

  if (password !== passwordConfirm) {
    setMessage("As senhas precisam ser iguais.", "error");
    return false;
  }

  return true;
}

function clearPasswordFields() {
  elements.signupPasswordInput.value = "";
  elements.signupPasswordConfirmInput.value = "";
  elements.newPasswordInput.value = "";
  elements.newPasswordConfirmInput.value = "";
}

function getInitialMode() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const type = params.get("type") || hash.get("type");

  if (type === "recovery" || params.get("modo") === "nova-senha") {
    return "nova-senha";
  }

  return params.get("modo") === "recuperar" ? "recuperar" : "criar";
}

function getAppUrl() {
  return new URL("./index.html", window.location.href).href;
}

function getAccountUrl(mode) {
  const url = new URL("./conta.html", window.location.href);
  url.searchParams.set("modo", mode);
  return url.href;
}

function loadSupabaseConfig() {
  const embedded = normalizeSupabaseConfig(window.FLUXO_SUPABASE_CONFIG || {});

  try {
    const rawStored = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (!rawStored) {
      return embedded;
    }

    const stored = normalizeSupabaseConfig(JSON.parse(rawStored));
    return {
      url: stored.url || embedded.url,
      anonKey: stored.anonKey || embedded.anonKey,
    };
  } catch (error) {
    console.warn("Nao foi possivel recuperar a configuracao do Supabase.", error);
    return embedded;
  }
}

function normalizeSupabaseConfig(value) {
  return {
    url: String(value?.url || "").trim(),
    anonKey: String(value?.anonKey || "").trim(),
  };
}

function hasSupabaseConfig(config) {
  return Boolean(config.url && config.anonKey);
}

function formatAuthError(error, fallback) {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("already registered") || message.includes("already exists")) {
    return "Esse e-mail ja tem conta. Volte para o app e entre com sua senha.";
  }

  if (message.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }

  if (message.includes("password")) {
    return "Confira a senha e tente novamente.";
  }

  if (message.includes("rate limit")) {
    return "Espere um pouco antes de tentar de novo.";
  }

  return fallback;
}
