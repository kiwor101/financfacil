const SUPABASE_CONFIG_KEY = "fluxo-leve-supabase-config-v1";
const AUTH_EMAIL_KEY = "fluxo-leve-auth-email-v1";

const AVATARS = [
  { id: "kiwi", label: "K", tone: "green" },
  { id: "fox", label: "F", tone: "orange" },
  { id: "ocean", label: "O", tone: "blue" },
  { id: "moon", label: "M", tone: "purple" },
  { id: "sun", label: "S", tone: "gold" },
  { id: "leaf", label: "L", tone: "mint" },
];

const elements = {
  title: document.querySelector("#accountTitle"),
  subtitle: document.querySelector("#accountSubtitle"),
  tabs: document.querySelectorAll(".account-tab"),
  profileForm: document.querySelector("#profileForm"),
  profileNameInput: document.querySelector("#profileNameInput"),
  profileEmailInput: document.querySelector("#profileEmailInput"),
  profilePasswordInput: document.querySelector("#profilePasswordInput"),
  profilePasswordConfirmInput: document.querySelector("#profilePasswordConfirmInput"),
  profileButton: document.querySelector("#profileButton"),
  profileAvatarPreview: document.querySelector("#profileAvatarPreview"),
  profileDisplayName: document.querySelector("#profileDisplayName"),
  profileDisplayEmail: document.querySelector("#profileDisplayEmail"),
  avatarPicker: document.querySelector("#avatarPicker"),
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
  currentUser: null,
  selectedAvatar: "kiwi",
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

  state.supabaseClient.auth.getSession().then(({ data }) => {
    state.currentUser = data.session?.user || null;
    if (state.mode === "perfil") {
      hydrateProfile();
    }
    renderMode();
  });

  renderAvatarOptions();
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
  elements.profileForm.addEventListener("submit", handleProfileSave);
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
          avatar_id: state.selectedAvatar,
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

async function handleProfileSave(event) {
  event.preventDefault();

  if (!state.currentUser) {
    setMessage("Entre na conta pelo app antes de editar o perfil.", "error");
    return;
  }

  const fullName = elements.profileNameInput.value.trim();
  const password = elements.profilePasswordInput.value;
  const passwordConfirm = elements.profilePasswordConfirmInput.value;
  const updatePayload = {
    data: {
      full_name: fullName,
      avatar_id: state.selectedAvatar,
    },
  };

  if (password || passwordConfirm) {
    if (!validatePasswordPair(password, passwordConfirm)) {
      return;
    }
    updatePayload.password = password;
  }

  try {
    setBusy(true, "Salvando...");
    const { data, error } = await state.supabaseClient.auth.updateUser(updatePayload);
    if (error) {
      throw error;
    }

    state.currentUser = data.user || state.currentUser;
    clearPasswordFields();
    hydrateProfile();
    setMessage("Conta atualizada com sucesso.", "success");
  } catch (error) {
    setMessage(formatAuthError(error, "Nao consegui atualizar a conta."), "error");
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
  elements.profileForm.hidden = mode !== "perfil";
  elements.signupForm.hidden = mode !== "criar";
  elements.recoveryForm.hidden = mode !== "recuperar";
  elements.newPasswordForm.hidden = mode !== "nova-senha";

  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
    tab.hidden = mode === "nova-senha" || mode === "perfil";
  });

  if (mode === "perfil") {
    elements.title.textContent = "Minha conta";
    elements.subtitle.textContent = "Atualize seu nome, avatar ou senha.";
    hydrateProfile();
    setMessage("Essas informacoes ficam salvas na sua conta.", "muted");
    return;
  }

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
  elements.profileButton.disabled = isBusy;
  elements.signupButton.disabled = isBusy;
  elements.recoveryButton.disabled = isBusy;
  elements.newPasswordButton.disabled = isBusy;

  elements.profileButton.textContent = isBusy && state.mode === "perfil" ? label : "Salvar conta";
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
  elements.profilePasswordInput.value = "";
  elements.profilePasswordConfirmInput.value = "";
}

function renderAvatarOptions() {
  elements.avatarPicker.innerHTML = "";
  AVATARS.forEach((avatar) => {
    const button = document.createElement("button");
    button.className = "avatar-option";
    button.type = "button";
    button.dataset.avatarId = avatar.id;
    button.dataset.tone = avatar.tone;
    button.textContent = avatar.label;
    button.addEventListener("click", () => {
      state.selectedAvatar = avatar.id;
      updateAvatarSelection();
    });
    elements.avatarPicker.append(button);
  });

  updateAvatarSelection();
}

function hydrateProfile() {
  if (!state.currentUser) {
    elements.profileNameInput.value = "";
    elements.profileEmailInput.value = "";
    elements.profileDisplayName.textContent = "Conta nao conectada";
    elements.profileDisplayEmail.textContent = "Volte ao app e faca login.";
    return;
  }

  const metadata = state.currentUser.user_metadata || {};
  const fullName = String(metadata.full_name || metadata.name || "").trim();
  const email = state.currentUser.email || "";
  state.selectedAvatar = metadata.avatar_id || state.selectedAvatar || "kiwi";
  elements.profileNameInput.value = fullName;
  elements.profileEmailInput.value = email;
  elements.profileDisplayName.textContent = fullName || email.split("@")[0] || "Minha conta";
  elements.profileDisplayEmail.textContent = email;
  updateAvatarSelection();
}

function updateAvatarSelection() {
  const selected = AVATARS.find((avatar) => avatar.id === state.selectedAvatar) || AVATARS[0];
  state.selectedAvatar = selected.id;
  elements.profileAvatarPreview.textContent = selected.label;
  elements.profileAvatarPreview.dataset.tone = selected.tone;

  elements.avatarPicker.querySelectorAll(".avatar-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.avatarId === selected.id);
  });
}

function getInitialMode() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const type = params.get("type") || hash.get("type");

  if (params.get("modo") === "perfil") {
    return "perfil";
  }

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
