const STORAGE_KEY = "fluxo-leve-v1";
const SUPABASE_CONFIG_KEY = "fluxo-leve-supabase-config-v1";
const AUTH_EMAIL_KEY = "fluxo-leve-auth-email-v1";
const LEGACY_IMPORT_KEY = "fluxo-leve-legacy-import-v1";
const LEGACY_CAPTURE_DONE_KEY = "fluxo-leve-legacy-capture-done-v1";
const CLOUD_REFRESH_INTERVAL_MS = 45000;
const MAX_INSTALLMENTS = 1200;
const ALLOCATION_CATEGORIES = {
  emergencyFund: "Caixa de emergencia",
  investments: "Investimentos",
  investmentWithdrawal: "Saque investimentos",
};

const CLOUD_TABLES = {
  transactions: "transactions",
  recurringRules: "recurring_rules",
  balances: "account_balances",
};

const categories = {
  expense: [
    "Moradia",
    "Alimentacao",
    "Transporte",
    "Saude",
    "Lazer",
    "Educacao",
    "Cartao de credito",
    "Imprevistos",
    ALLOCATION_CATEGORIES.emergencyFund,
    ALLOCATION_CATEGORIES.investmentWithdrawal,
    "Outros",
  ],
  income: [
    "Salario",
    "Freela",
    "Presentes",
    ALLOCATION_CATEGORIES.emergencyFund,
    ALLOCATION_CATEGORIES.investments,
    "Outros",
  ],
};

const monthNamesShort = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const monthNamesLong = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

const elements = {
  monthSelect: document.querySelector("#monthSelect"),
  yearInput: document.querySelector("#yearInput"),
  yearOptions: document.querySelector("#yearOptions"),
  syncPill: document.querySelector("#syncPill"),
  syncMessage: document.querySelector("#syncMessage"),
  toggleAuthButton: document.querySelector("#toggleAuthButton"),
  signOutButton: document.querySelector("#signOutButton"),
  authPanel: document.querySelector("#authPanel"),
  supabaseUrlInput: document.querySelector("#supabaseUrlInput"),
  supabaseKeyInput: document.querySelector("#supabaseKeyInput"),
  authEmailInput: document.querySelector("#authEmailInput"),
  authPasswordInput: document.querySelector("#authPasswordInput"),
  cloudConfigFields: document.querySelectorAll(".cloud-config-field"),
  saveConfigButton: document.querySelector("#saveConfigButton"),
  passwordLoginButton: document.querySelector("#passwordLoginButton"),
  createAccountButton: document.querySelector("#createAccountButton"),
  recoverPasswordButton: document.querySelector("#recoverPasswordButton"),
  syncFooterMessage: document.querySelector("#syncFooterMessage"),
  summaryGrid: document.querySelector("#summaryGrid"),
  balanceValue: document.querySelector("#balanceValue"),
  balanceHint: document.querySelector("#balanceHint"),
  incomeValue: document.querySelector("#incomeValue"),
  expenseValue: document.querySelector("#expenseValue"),
  emergencyFundValue: document.querySelector("#emergencyFundValue"),
  investmentsValue: document.querySelector("#investmentsValue"),
  entryForm: document.querySelector("#entryForm"),
  submitButton: document.querySelector("#submitEntryButton"),
  amountInput: document.querySelector("#amountInput"),
  categoryInput: document.querySelector("#categoryInput"),
  categoryCustomField: document.querySelector("#categoryCustomField"),
  categoryCustomInput: document.querySelector("#categoryCustomInput"),
  dateInput: document.querySelector("#dateInput"),
  noteInput: document.querySelector("#noteInput"),
  planTypeInput: document.querySelector("#planTypeInput"),
  planBox: document.querySelector("#planBox"),
  installmentsField: document.querySelector("#installmentsField"),
  installmentsInput: document.querySelector("#installmentsInput"),
  planHelper: document.querySelector("#planHelper"),
  searchInput: document.querySelector("#searchInput"),
  typeFilter: document.querySelector("#typeFilter"),
  recurringList: document.querySelector("#recurringList"),
  installmentList: document.querySelector("#installmentList"),
  entryList: document.querySelector("#entryList"),
  entryTemplate: document.querySelector("#entryTemplate"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  trendBars: document.querySelector("#trendBars"),
};

const today = new Date();
const state = loadState();

let currentSupabaseConfig = loadSupabaseConfig();
let supabaseClient = null;
let authSubscription = null;
let currentSession = null;
let currentUser = null;
let authPanelOpen = false;
let lastCloudSyncAt = null;
let cloudRefreshTimer = null;
let cloudReloadPromise = null;
let entryBusy = false;
let authBusy = false;
let editingEntry = null;
let syncNotice = {
  tone: "muted",
  label: "Modo local",
  message: "Configure o Supabase para usar os mesmos dados no celular e no computador.",
};

ensureLegacyImportSnapshot();
bootstrap().catch((error) => {
  console.error("Falha ao iniciar o app.", error);
  setSyncNotice(
    "Atencao",
    "O app abriu, mas houve um problema ao preparar a sincronizacao.",
    "error",
  );
});

async function bootstrap() {
  populateMonthOptions();
  populateYearOptions();
  syncPeriodInputs();
  elements.dateInput.value = formatDateInput(today);
  elements.installmentsInput.value = "2";
  populateCategoryOptions(getSelectedEntryType());
  hydrateAuthFields();
  bindEvents();
  updatePlanModeUI();
  renderApp(true);
  renderAuthUI();
  await initializeCloud();
}

function bindEvents() {
  elements.entryForm.addEventListener("submit", handleEntrySubmit);
  elements.searchInput.addEventListener("input", () => renderEntries());
  elements.typeFilter.addEventListener("change", () => renderEntries());
  elements.monthSelect.addEventListener("change", handlePeriodChange);
  elements.yearInput.addEventListener("change", handlePeriodChange);
  elements.yearInput.addEventListener("blur", handlePeriodChange);
  elements.yearInput.addEventListener("input", handleYearTyping);
  elements.planTypeInput.addEventListener("change", updatePlanModeUI);
  elements.installmentsInput.addEventListener("input", updatePlanModeUI);
  elements.amountInput.addEventListener("input", updatePlanModeUI);
  elements.dateInput.addEventListener("change", updatePlanModeUI);
  elements.categoryInput.addEventListener("change", updateCustomCategoryUI);
  elements.cancelEditButton.addEventListener("click", () => {
    resetEntryForm(elements.dateInput.value || formatDateInput(today));
  });

  elements.entryForm.querySelectorAll('input[name="entryType"]').forEach((input) => {
    input.addEventListener("change", () => {
      populateCategoryOptions(getSelectedEntryType());
      updatePlanModeUI();
    });
  });

  elements.toggleAuthButton.addEventListener("click", () => {
    if (currentUser) {
      openAccountPage("perfil");
      return;
    }

    authPanelOpen = !authPanelOpen;
    renderAuthUI();
  });

  elements.saveConfigButton.addEventListener("click", handleSaveConfig);
  elements.passwordLoginButton.addEventListener("click", handlePasswordLogin);
  elements.createAccountButton.addEventListener("click", () => openAccountPage("criar"));
  elements.recoverPasswordButton.addEventListener("click", () => openAccountPage("recuperar"));
  elements.signOutButton.addEventListener("click", handleSignOut);
  elements.authPasswordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handlePasswordLogin();
    }
  });

  window.addEventListener("focus", () => {
    void refreshCloudData("focus");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void refreshCloudData("visibility");
    }
  });
}

function hydrateAuthFields() {
  elements.supabaseUrlInput.value = currentSupabaseConfig.url;
  elements.supabaseKeyInput.value = currentSupabaseConfig.anonKey;
  elements.authEmailInput.value =
    currentUser?.email || localStorage.getItem(AUTH_EMAIL_KEY) || "";
}

function renderAuthUI() {
  const configured = hasSupabaseConfig(readSupabaseConfigInputs()) || hasSupabaseConfig();
  const embeddedConfig = hasEmbeddedSupabaseConfig();

  elements.syncPill.dataset.tone = syncNotice.tone;
  elements.syncPill.textContent = syncNotice.label;
  elements.syncMessage.textContent = syncNotice.message;
  if (elements.syncFooterMessage) {
    elements.syncFooterMessage.textContent = getFooterSyncText();
    elements.syncFooterMessage.hidden = !elements.syncFooterMessage.textContent;
  }

  elements.authPanel.hidden = Boolean(currentUser) || !authPanelOpen;
  elements.signOutButton.hidden = !currentUser;
  elements.signOutButton.disabled = authBusy;
  elements.toggleAuthButton.disabled = authBusy;
  elements.saveConfigButton.disabled = authBusy;
  elements.saveConfigButton.hidden = embeddedConfig;
  elements.passwordLoginButton.disabled = authBusy || !configured;
  elements.passwordLoginButton.hidden = Boolean(currentUser);
  elements.createAccountButton.disabled = authBusy || !configured;
  elements.createAccountButton.hidden = Boolean(currentUser);
  elements.recoverPasswordButton.disabled = authBusy || !configured;
  elements.recoverPasswordButton.hidden = Boolean(currentUser);
  elements.cloudConfigFields.forEach((field) => {
    field.hidden = embeddedConfig;
  });

  elements.toggleAuthButton.textContent = getToggleButtonLabel();
  elements.saveConfigButton.textContent = configured ? "Atualizar conexao" : "Salvar conexao";

  if (currentUser?.email && elements.authEmailInput.value.trim() !== currentUser.email) {
    elements.authEmailInput.value = currentUser.email;
  }
}

function getToggleButtonLabel() {
  if (authPanelOpen) {
    return "Fechar";
  }

  if (currentUser) {
    return "Conta";
  }

  return hasSupabaseConfig() ? "Login" : "Configurar";
}

function setSyncNotice(label, message, tone = "muted") {
  syncNotice = { label, message, tone };
  renderAuthUI();
}

function setLocalModeNotice(message) {
  if (!hasSupabaseConfig()) {
    setSyncNotice(
      "Modo local",
      message || "Seus dados continuam salvos so neste aparelho ate configurar o Supabase.",
      "muted",
    );
    return;
  }

  if (!currentUser) {
    setSyncNotice(
      "Pronto para entrar",
      message || "Entre com seu e-mail para sincronizar entre celular e computador.",
      "muted",
    );
  }
}

async function initializeCloud() {
  if (!hasSupabaseConfig()) {
    setLocalModeNotice();
    return;
  }

  await initializeSupabaseClient(currentSupabaseConfig);
}

async function initializeSupabaseClient(config) {
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    setSyncNotice(
      "Atencao",
      "A biblioteca do Supabase nao carregou. Abra a pagina com internet para ativar a nuvem.",
      "error",
    );
    return;
  }

  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }

  stopCloudRefreshTimer();
  supabaseClient = window.supabase.createClient(config.url, config.anonKey);

  const { data: authData } = supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") {
      return;
    }

    window.setTimeout(() => {
      if (session?.user) {
        void handleSignedInSession(session, { reload: event !== "TOKEN_REFRESHED" });
        return;
      }

      handleSignedOutSession({ preserveLegacyImport: event !== "SIGNED_OUT" });
    }, 0);
  });

  authSubscription = authData.subscription;

  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      throw error;
    }

    if (data.session?.user) {
      await handleSignedInSession(data.session, { reload: true });
      return;
    }

    handleSignedOutSession({ preserveLegacyImport: true });
  } catch (error) {
    handleCloudError("Nao consegui validar a conexao com o Supabase.", error);
  }
}

async function handleSignedInSession(session, options = {}) {
  currentSession = session;
  currentUser = session.user;
  authPanelOpen = false;

  if (currentUser.email) {
    localStorage.setItem(AUTH_EMAIL_KEY, currentUser.email);
  }

  startCloudRefreshTimer();

  if (options.reload !== false) {
    await loadCloudState({ migrateLegacy: true });
    return;
  }

  setSyncNotice("Sincronizado", getSyncedMessage(), "success");
}

function handleSignedOutSession({ preserveLegacyImport = false } = {}) {
  currentSession = null;
  currentUser = null;
  lastCloudSyncAt = null;
  stopCloudRefreshTimer();
  localStorage.removeItem(AUTH_EMAIL_KEY);
  elements.authPasswordInput.value = "";
  clearLocalFinancialData({ preserveLegacyImport });
  setLocalModeNotice();
}

function createEmptyState(selectedMonth = formatMonthInput(today)) {
  return {
    selectedMonth,
    transactions: [],
    recurringRules: [],
    balances: {
      emergencyFund: 0,
      investments: 0,
    },
  };
}

function clearLocalFinancialData({ preserveLegacyImport = false } = {}) {
  const selectedMonth = state.selectedMonth || formatMonthInput(today);
  const emptyState = createEmptyState(selectedMonth);

  state.selectedMonth = emptyState.selectedMonth;
  state.transactions = emptyState.transactions;
  state.recurringRules = emptyState.recurringRules;
  state.balances = emptyState.balances;

  if (!preserveLegacyImport) {
    localStorage.removeItem(LEGACY_IMPORT_KEY);
  }

  saveState();
  renderApp();
}

async function loadCloudState({ migrateLegacy = false, quiet = false } = {}) {
  if (!shouldUseCloudPersistence()) {
    return;
  }

  if (cloudReloadPromise) {
    return cloudReloadPromise;
  }

  cloudReloadPromise = (async () => {
    if (!quiet) {
      setSyncNotice("Sincronizando", "Buscando seus dados na nuvem...", "warning");
    }

    let remoteTransactions = await fetchCloudTransactions();
    let remoteRecurringRules = await fetchCloudRecurringRules();
    const remoteBalances = await fetchCloudBalances();

    if (migrateLegacy) {
      const migrated = await migrateLegacyDataToCloud(remoteTransactions, remoteRecurringRules);
      if (migrated) {
        remoteTransactions = await fetchCloudTransactions();
        remoteRecurringRules = await fetchCloudRecurringRules();
      }
    }

    state.transactions = remoteTransactions;
    state.recurringRules = remoteRecurringRules;
    state.balances = remoteBalances;
    saveState();
    renderApp();

    lastCloudSyncAt = new Date();
    setSyncNotice("Sincronizado", getSyncedMessage(), "success");
  })()
    .catch((error) => {
      handleCloudError("Nao consegui carregar seus dados da nuvem.", error);
    })
    .finally(() => {
      cloudReloadPromise = null;
    });

  return cloudReloadPromise;
}

async function refreshCloudData(reason = "manual") {
  if (!shouldUseCloudPersistence()) {
    return;
  }

  await loadCloudState({
    migrateLegacy: false,
    quiet: reason !== "manual",
  });
}

async function migrateLegacyDataToCloud(remoteTransactions, remoteRecurringRules) {
  const legacyState = loadLegacyImportState();
  if (!legacyState) {
    return false;
  }

  const mergedTransactions = mergeTransactionsById(remoteTransactions, legacyState.transactions);
  const mergedRecurringRules = mergeRecurringRulesById(
    remoteRecurringRules,
    legacyState.recurringRules,
  );

  const hasTransactionDiff = mergedTransactions.length > remoteTransactions.length;
  const hasRecurringDiff = mergedRecurringRules.length > remoteRecurringRules.length;

  if (hasTransactionDiff) {
    await upsertCloudTransactions(mergedTransactions);
  }

  if (hasRecurringDiff) {
    await upsertCloudRecurringRules(mergedRecurringRules);
  }

  localStorage.removeItem(LEGACY_IMPORT_KEY);
  return hasTransactionDiff || hasRecurringDiff;
}

function mergeTransactionsById(primaryItems, secondaryItems) {
  const merged = new Map();

  primaryItems.forEach((item) => {
    merged.set(item.id, item);
  });

  secondaryItems.forEach((item) => {
    if (!merged.has(item.id)) {
      merged.set(item.id, item);
    }
  });

  return Array.from(merged.values()).sort(compareTransactionsDesc);
}

function mergeRecurringRulesById(primaryItems, secondaryItems) {
  const merged = new Map();

  primaryItems.forEach((item) => {
    merged.set(item.id, item);
  });

  secondaryItems.forEach((item) => {
    if (!merged.has(item.id)) {
      merged.set(item.id, item);
    }
  });

  return Array.from(merged.values()).sort(compareRecurringRulesDesc);
}

async function fetchCloudTransactions() {
  const { data, error } = await supabaseClient
    .from(CLOUD_TABLES.transactions)
    .select(
      "id, type, amount, category, date, note, source, installment_group_id, installment_index, installment_total, created_at",
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.map(deserializeTransaction).filter(Boolean) : [];
}

async function fetchCloudRecurringRules() {
  const { data, error } = await supabaseClient
    .from(CLOUD_TABLES.recurringRules)
    .select("id, type, amount, category, start_date, note, end_month, created_at")
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.map(deserializeRecurringRule).filter(Boolean) : [];
}

async function fetchCloudBalances() {
  const { data, error } = await supabaseClient
    .from(CLOUD_TABLES.balances)
    .select("emergency_fund, investments")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeBalances({
    emergencyFund: data?.emergency_fund,
    investments: data?.investments,
  });
}

async function upsertCloudTransactions(entries) {
  const payload = entries.map(serializeTransaction);
  const { error } = await supabaseClient.from(CLOUD_TABLES.transactions).upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw error;
  }
}

async function upsertCloudRecurringRules(rules) {
  const payload = rules.map(serializeRecurringRule);
  const { error } = await supabaseClient.from(CLOUD_TABLES.recurringRules).upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw error;
  }
}

async function upsertCloudBalances() {
  const { error } = await supabaseClient.from(CLOUD_TABLES.balances).upsert(
    {
      user_id: currentUser.id,
      emergency_fund: state.balances.emergencyFund,
      investments: state.balances.investments,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    throw error;
  }
}

async function deleteCloudTransaction(entryId) {
  const { error } = await supabaseClient.from(CLOUD_TABLES.transactions).delete().eq("id", entryId);

  if (error) {
    throw error;
  }
}

async function cancelCloudInstallmentGroup(groupId, fromMonth) {
  const { error } = await supabaseClient
    .from(CLOUD_TABLES.transactions)
    .delete()
    .eq("installment_group_id", groupId)
    .gte("date", `${fromMonth}-01`);

  if (error) {
    throw error;
  }
}

async function deleteCloudInstallmentGroup(groupId) {
  const { error } = await supabaseClient
    .from(CLOUD_TABLES.transactions)
    .delete()
    .eq("installment_group_id", groupId);

  if (error) {
    throw error;
  }
}

async function stopCloudRecurringRule(rule, monthString) {
  const previousMonth = getPreviousMonth(monthString);

  if (previousMonth < rule.startDate.slice(0, 7)) {
    const { error } = await supabaseClient
      .from(CLOUD_TABLES.recurringRules)
      .delete()
      .eq("id", rule.id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabaseClient
    .from(CLOUD_TABLES.recurringRules)
    .update({ end_month: previousMonth })
    .eq("id", rule.id);

  if (error) {
    throw error;
  }
}

async function handleSaveConfig() {
  if (authBusy) {
    return;
  }

  const config = readSupabaseConfigInputs();
  if (!hasSupabaseConfig(config)) {
    authPanelOpen = true;
    setSyncNotice(
      "Atencao",
      "Preencha a URL do projeto e a chave publica do Supabase.",
      "warning",
    );
    return;
  }

  try {
    setAuthBusy(true, "Salvando...");
    saveSupabaseConfig(config);
    localStorage.setItem(AUTH_EMAIL_KEY, elements.authEmailInput.value.trim());
    await initializeSupabaseClient(config);

    if (!currentUser) {
      setSyncNotice(
        "Conexao salva",
        "Agora basta entrar com seu e-mail para ativar a sincronizacao.",
        "success",
      );
    }
  } finally {
    setAuthBusy(false);
  }
}

async function handlePasswordLogin() {
  if (authBusy) {
    return;
  }

  const credentials = readAuthCredentials();
  const config = readSupabaseConfigInputs();

  if (!validatePasswordCredentials(credentials, config)) {
    return;
  }

  try {
    setAuthBusy(true, "Entrando...");
    await ensureSupabaseReady(config);

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw error;
    }

    localStorage.setItem(AUTH_EMAIL_KEY, credentials.email);
    elements.authPasswordInput.value = "";
    authPanelOpen = false;

    if (data.session?.user) {
      await handleSignedInSession(data.session, { reload: true });
      return;
    }

    setSyncNotice("Sincronizando", "Entrada feita. Buscando seus dados...", "warning");
  } catch (error) {
    handleCloudError("Nao consegui entrar com esse e-mail e senha.", error);
  } finally {
    setAuthBusy(false);
  }
}

async function handleSignOut() {
  if (authBusy || !supabaseClient) {
    return;
  }

  try {
    setAuthBusy(true, "Saindo...");
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw error;
    }

    handleSignedOutSession({ preserveLegacyImport: false });
    setSyncNotice(
      "Conta desconectada",
      "Os dados continuam na nuvem. Entre de novo para editar e sincronizar.",
      "muted",
    );
  } catch (error) {
    handleCloudError("Nao consegui sair da conta.", error);
  } finally {
    setAuthBusy(false);
  }
}

function setAuthBusy(isBusy, primaryLabel) {
  authBusy = isBusy;
  elements.saveConfigButton.disabled = isBusy;
  elements.passwordLoginButton.disabled = isBusy || !hasSupabaseConfig(readSupabaseConfigInputs());
  elements.createAccountButton.disabled = isBusy || !hasSupabaseConfig(readSupabaseConfigInputs());
  elements.recoverPasswordButton.disabled = isBusy || !hasSupabaseConfig(readSupabaseConfigInputs());
  elements.signOutButton.disabled = isBusy;
  elements.toggleAuthButton.disabled = isBusy;
  elements.passwordLoginButton.textContent = isBusy ? primaryLabel : "Entrar";
  renderAuthUI();
}

function openAccountPage(mode) {
  const email = encodeURIComponent(elements.authEmailInput.value.trim());
  const params = new URLSearchParams({ modo: mode });
  if (email) {
    params.set("email", email);
  }

  window.location.href = `./conta.html?${params.toString()}`;
}

async function ensureSupabaseReady(config) {
  const previousConfig = currentSupabaseConfig;
  const needsNewClient = !supabaseClient || !isSameSupabaseConfig(config, previousConfig);

  saveSupabaseConfig(config);

  if (needsNewClient) {
    await initializeSupabaseClient(config);
  }
}

function readAuthCredentials() {
  return {
    email: elements.authEmailInput.value.trim().toLowerCase(),
    password: elements.authPasswordInput.value,
  };
}

function validatePasswordCredentials(credentials, config) {
  if (!hasSupabaseConfig(config)) {
    authPanelOpen = true;
    setSyncNotice(
      "Atencao",
      "Salve primeiro a URL do projeto e a chave publica do Supabase.",
      "warning",
    );
    return false;
  }

  if (!credentials.email) {
    authPanelOpen = true;
    setSyncNotice("Atencao", "Digite o e-mail da sua conta.", "warning");
    return false;
  }

  if (!credentials.password || credentials.password.length < 6) {
    authPanelOpen = true;
    setSyncNotice("Atencao", "Digite uma senha com pelo menos 6 caracteres.", "warning");
    return false;
  }

  return true;
}

function shouldUseCloudPersistence() {
  return Boolean(supabaseClient && currentUser && currentSession);
}

function startCloudRefreshTimer() {
  stopCloudRefreshTimer();
  cloudRefreshTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void refreshCloudData("interval");
    }
  }, CLOUD_REFRESH_INTERVAL_MS);
}

function stopCloudRefreshTimer() {
  if (cloudRefreshTimer) {
    window.clearInterval(cloudRefreshTimer);
    cloudRefreshTimer = null;
  }
}

function getSyncedMessage() {
  const name = getUserDisplayName();

  return name ? name : "Conta conectada";
}

function getUserDisplayName() {
  const metadata = currentUser?.user_metadata || {};
  const fullName = String(metadata.full_name || metadata.name || "").trim();
  if (fullName) {
    return fullName;
  }

  const email = currentUser?.email || elements.authEmailInput.value.trim();
  return email ? email.split("@")[0] : "";
}

function getFooterSyncText() {
  if (!currentUser) {
    return "";
  }

  return lastCloudSyncAt
    ? `Ultima atualizacao ${timeFormatter.format(lastCloudSyncAt)}.`
    : "Sincronizacao pronta.";
}

function handleCloudError(prefix, error) {
  console.error(error);
  setSyncNotice("Atencao", `${prefix} ${formatCloudError(error)}`, "error");
}

function formatCloudError(error) {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("relation") && message.includes("does not exist")) {
    return "Crie as tabelas no Supabase usando o arquivo supabase-setup.sql.";
  }

  if (message.includes("row-level security")) {
    return "As regras de seguranca do banco ainda nao estao prontas.";
  }

  if (message.includes("email rate limit")) {
    return "Espere um pouco antes de pedir outro link.";
  }

  if (message.includes("invalid api key")) {
    return "Confira se a chave publica copiada e a anon key do projeto.";
  }

  if (message.includes("invalid url")) {
    return "Confira se a URL do projeto esta correta.";
  }

  return "Confira a configuracao do projeto e tente de novo.";
}

function readSupabaseConfigInputs() {
  return normalizeSupabaseConfig({
    url: elements.supabaseUrlInput.value,
    anonKey: elements.supabaseKeyInput.value,
  });
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

function saveSupabaseConfig(config) {
  currentSupabaseConfig = normalizeSupabaseConfig(config);
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(currentSupabaseConfig));
  elements.supabaseUrlInput.value = currentSupabaseConfig.url;
  elements.supabaseKeyInput.value = currentSupabaseConfig.anonKey;
}

function normalizeSupabaseConfig(value) {
  return {
    url: String(value?.url || "").trim(),
    anonKey: String(value?.anonKey || "").trim(),
  };
}

function hasSupabaseConfig(config = currentSupabaseConfig) {
  return Boolean(config.url && config.anonKey);
}

function hasEmbeddedSupabaseConfig() {
  return hasSupabaseConfig(normalizeSupabaseConfig(window.FLUXO_SUPABASE_CONFIG || {}));
}

function isSameSupabaseConfig(left, right) {
  return left.url === right.url && left.anonKey === right.anonKey;
}

function getAuthRedirectUrl() {
  if (!["http:", "https:"].includes(window.location.protocol)) {
    return null;
  }

  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

function loadState() {
  const fallbackMonth = formatMonthInput(today);
  const fallbackState = createEmptyState(fallbackMonth);

  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return fallbackState;
    }

    const parsed = JSON.parse(rawState);
    return {
      selectedMonth: parsed.selectedMonth || fallbackMonth,
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions.map(normalizeTransaction).filter(Boolean)
        : [],
      recurringRules: Array.isArray(parsed.recurringRules)
        ? parsed.recurringRules.map(normalizeRecurringRule).filter(Boolean)
        : [],
      balances: normalizeBalances(parsed.balances),
    };
  } catch (error) {
    console.warn("Nao foi possivel recuperar os dados salvos.", error);
    return fallbackState;
  }
}

function normalizeBalances(balances) {
  return {
    emergencyFund: normalizeMoneyValue(balances?.emergencyFund),
    investments: normalizeMoneyValue(balances?.investments),
  };
}

function normalizeMoneyValue(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureLegacyImportSnapshot() {
  if (localStorage.getItem(LEGACY_CAPTURE_DONE_KEY) === "done") {
    return;
  }

  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      localStorage.setItem(LEGACY_CAPTURE_DONE_KEY, "done");
      return;
    }

    const parsed = JSON.parse(rawState);
    const hasData =
      Array.isArray(parsed.transactions) && parsed.transactions.length > 0
        ? true
        : Array.isArray(parsed.recurringRules) && parsed.recurringRules.length > 0;

    if (hasData) {
      localStorage.setItem(LEGACY_IMPORT_KEY, rawState);
    }

    localStorage.setItem(LEGACY_CAPTURE_DONE_KEY, "done");
  } catch (error) {
    console.warn("Nao foi possivel preparar a migracao local para nuvem.", error);
    localStorage.setItem(LEGACY_CAPTURE_DONE_KEY, "done");
  }
}

function loadLegacyImportState() {
  try {
    const rawState = localStorage.getItem(LEGACY_IMPORT_KEY);
    if (!rawState) {
      return null;
    }

    const parsed = JSON.parse(rawState);
    return {
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions.map(normalizeTransaction).filter(Boolean)
        : [],
      recurringRules: Array.isArray(parsed.recurringRules)
        ? parsed.recurringRules.map(normalizeRecurringRule).filter(Boolean)
        : [],
    };
  } catch (error) {
    console.warn("Nao foi possivel ler os dados locais para migracao.", error);
    return null;
  }
}

function normalizeTransaction(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const amount = Number(entry.amount);
  if (!entry.date || Number.isNaN(amount) || amount <= 0) {
    return null;
  }

  return {
    id: entry.id || crypto.randomUUID(),
    type: entry.type === "income" ? "income" : "expense",
    amount,
    category: String(entry.category || "Outros"),
    date: String(entry.date),
    note: String(entry.note || ""),
    source: entry.source === "installment" ? "installment" : "single",
    installmentGroupId: entry.installmentGroupId || null,
    installmentIndex: Number.isInteger(entry.installmentIndex) ? entry.installmentIndex : null,
    installmentTotal: Number.isInteger(entry.installmentTotal) ? entry.installmentTotal : null,
  };
}

function normalizeRecurringRule(rule) {
  if (!rule || typeof rule !== "object") {
    return null;
  }

  const amount = Number(rule.amount);
  if (!rule.startDate || Number.isNaN(amount) || amount <= 0) {
    return null;
  }

  return {
    id: rule.id || crypto.randomUUID(),
    type: rule.type === "income" ? "income" : "expense",
    amount,
    category: String(rule.category || "Outros"),
    startDate: String(rule.startDate),
    note: String(rule.note || ""),
    endMonth: rule.endMonth ? String(rule.endMonth) : null,
  };
}

function deserializeTransaction(row) {
  return normalizeTransaction({
    id: row.id,
    type: row.type,
    amount: row.amount,
    category: row.category,
    date: row.date,
    note: row.note,
    source: row.source,
    installmentGroupId: row.installment_group_id,
    installmentIndex: row.installment_index,
    installmentTotal: row.installment_total,
  });
}

function deserializeRecurringRule(row) {
  return normalizeRecurringRule({
    id: row.id,
    type: row.type,
    amount: row.amount,
    category: row.category,
    startDate: row.start_date,
    note: row.note,
    endMonth: row.end_month,
  });
}

function serializeTransaction(entry) {
  return {
    id: entry.id,
    user_id: currentUser.id,
    type: entry.type,
    amount: entry.amount,
    category: entry.category,
    date: entry.date,
    note: entry.note,
    source: entry.source,
    installment_group_id: entry.installmentGroupId,
    installment_index: entry.installmentIndex,
    installment_total: entry.installmentTotal,
  };
}

function serializeRecurringRule(rule) {
  return {
    id: rule.id,
    user_id: currentUser.id,
    type: rule.type,
    amount: rule.amount,
    category: rule.category,
    start_date: rule.startDate,
    note: rule.note,
    end_month: rule.endMonth,
  };
}

async function handleBalanceSave(balanceType) {
  renderApp();
}

function populateMonthOptions() {
  elements.monthSelect.innerHTML = "";
  monthNamesLong.forEach((monthName, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1).padStart(2, "0");
    option.textContent = monthName;
    elements.monthSelect.append(option);
  });
}

function populateYearOptions(centerYear = Number(state.selectedMonth.slice(0, 4))) {
  const years = getAvailableYears(centerYear);
  elements.yearOptions.innerHTML = "";

  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    elements.yearOptions.append(option);
  });
}

function getAvailableYears(centerYear) {
  const selectedYear = Number(state.selectedMonth.slice(0, 4));
  const years = new Set([today.getFullYear(), selectedYear]);

  state.transactions.forEach((entry) => {
    years.add(Number(entry.date.slice(0, 4)));
  });

  state.recurringRules.forEach((rule) => {
    years.add(Number(rule.startDate.slice(0, 4)));
    if (rule.endMonth) {
      years.add(Number(rule.endMonth.slice(0, 4)));
    }
  });

  const referenceYear = Number.isFinite(centerYear) ? centerYear : selectedYear;
  for (let year = referenceYear - 60; year <= referenceYear + 60; year += 1) {
    years.add(year);
  }

  return Array.from(years)
    .filter((year) => Number.isFinite(year))
    .sort((left, right) => left - right);
}

function syncPeriodInputs() {
  const [year, month] = state.selectedMonth.split("-");
  elements.monthSelect.value = month;
  elements.yearInput.value = year;
}

function handlePeriodChange() {
  const year = parseYearInput(elements.yearInput.value);
  const month = elements.monthSelect.value;

  if (!year || !month) {
    syncPeriodInputs();
    return;
  }

  state.selectedMonth = `${year}-${month}`;
  populateYearOptions(year);
  saveState();
  renderApp();
}

function handleYearTyping() {
  const typedYear = parseYearInput(elements.yearInput.value);
  populateYearOptions(typedYear || Number(state.selectedMonth.slice(0, 4)));
}

function populateCategoryOptions(type) {
  elements.categoryInput.innerHTML = "";

  categories[type].forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.categoryInput.append(option);
  });

  updateCustomCategoryUI();
}

function updateCustomCategoryUI() {
  const isCustom = elements.categoryInput.value === "Outros";
  elements.categoryCustomField.hidden = !isCustom;
  elements.categoryCustomInput.required = isCustom;

  if (!isCustom) {
    elements.categoryCustomInput.value = "";
  }
}

function updatePlanModeUI() {
  const type = getSelectedEntryType();
  const installmentOption = elements.planTypeInput.querySelector('option[value="installment"]');

  installmentOption.disabled = type === "income";
  if (type === "income" && elements.planTypeInput.value === "installment") {
    elements.planTypeInput.value = "single";
  }

  const planType = elements.planTypeInput.value;
  elements.planBox.hidden = planType === "single";
  elements.installmentsField.hidden = planType !== "installment";
  elements.planHelper.textContent = getPlanHelperText();
}

function getPlanHelperText() {
  const planType = elements.planTypeInput.value;
  const date = elements.dateInput.value || formatDateInput(today);
  const amount = Number.parseFloat(String(elements.amountInput.value || "0").replace(",", "."));

  if (planType === "installment") {
    const installments = getInstallmentCount();
    const durationText = formatInstallmentDuration(installments);
    if (amount > 0) {
      const installmentAmount = splitAmountAcrossInstallments(amount, installments)[0];
      return `A compra sera dividida em ${installments}x de ${formatCurrency(installmentAmount)} (${durationText}) a partir de ${formatMonthLabel(date.slice(0, 7))}.`;
    }

    return `A compra sera dividida e repetida pelos proximos ${durationText}.`;
  }

  if (planType === "recurring") {
    return `Essa movimentacao vai reaparecer todo mes a partir de ${formatMonthLabel(date.slice(0, 7))}.`;
  }

  return "A movimentacao sera registrada apenas uma vez.";
}

async function handleEntrySubmit(event) {
  event.preventDefault();
  if (entryBusy) {
    return;
  }

  const formData = new FormData(elements.entryForm);
  const type = String(formData.get("entryType"));
  const amount = Number.parseFloat(String(formData.get("amount")).replace(",", "."));
  const category = getSubmittedCategory(formData);
  const date = String(formData.get("date"));
  const note = String(formData.get("note") || "").trim();
  const planType = String(formData.get("planType"));

  if (!amount || amount <= 0 || !category || !date) {
    return;
  }

  if (editingEntry) {
    await handleEntryEditSubmit({ type, amount, category, date, note });
    return;
  }

  const nextTransactions =
    planType === "installment"
      ? buildInstallmentEntries({ type, amount, category, date, note })
      : planType === "single"
        ? [buildSingleEntry({ type, amount, category, date, note })]
        : [];
  const nextRecurringRule =
    planType === "recurring" ? buildRecurringRule({ type, amount, category, date, note }) : null;

  try {
    entryBusy = true;
    setEntryBusy(true);

    if (shouldUseCloudPersistence()) {
      setSyncNotice("Sincronizando", "Salvando seu lancamento na nuvem...", "warning");
      if (nextTransactions.length > 0) {
        await upsertCloudTransactions(nextTransactions);
      }
      if (nextRecurringRule) {
        await upsertCloudRecurringRules([nextRecurringRule]);
      }
      lastCloudSyncAt = new Date();
    }

    if (nextTransactions.length > 0) {
      state.transactions = [...nextTransactions, ...state.transactions];
    }

    if (nextRecurringRule) {
      state.recurringRules = [nextRecurringRule, ...state.recurringRules];
    }

    state.selectedMonth = date.slice(0, 7);
    saveState();
    populateYearOptions(Number(date.slice(0, 4)));
    syncPeriodInputs();
    resetEntryForm(date);
    renderApp();

    if (shouldUseCloudPersistence()) {
      setSyncNotice("Sincronizado", getSyncedMessage(), "success");
    } else {
      setLocalModeNotice("Lancamento salvo neste aparelho.");
    }
  } catch (error) {
    handleCloudError("Nao consegui salvar o lancamento.", error);
  } finally {
    entryBusy = false;
    setEntryBusy(false);
  }
}

function getSubmittedCategory(formData) {
  const category = String(formData.get("category") || "");
  const customCategory = String(formData.get("categoryCustom") || "").trim();

  if (category === "Outros") {
    return customCategory || "Outros";
  }

  return category;
}

async function handleEntryEditSubmit({ type, amount, category, date, note }) {
  const edit = editingEntry;
  if (!edit) {
    return;
  }

  try {
    entryBusy = true;
    setEntryBusy(true, "Salvando...");

    if (edit.kind === "single") {
      await updateSingleTransaction(edit.id, { type, amount, category, date, note });
    } else if (edit.kind === "recurring") {
      await updateRecurringRule(edit.id, { type, amount, category, date, note });
    } else if (edit.kind === "installment") {
      await updateInstallmentGroup(edit.groupId, { type, amount, category, date, note });
    }

    state.selectedMonth = date.slice(0, 7);
    saveState();
    populateYearOptions(Number(date.slice(0, 4)));
    syncPeriodInputs();
    resetEntryForm(date);
    renderApp();

    if (shouldUseCloudPersistence()) {
      setSyncNotice("Sincronizado", getSyncedMessage(), "success");
    } else {
      setLocalModeNotice("Edicao salva neste aparelho.");
    }
  } catch (error) {
    handleCloudError("Nao consegui salvar a edicao.", error);
  } finally {
    entryBusy = false;
    setEntryBusy(false);
  }
}

async function updateSingleTransaction(entryId, { type, amount, category, date, note }) {
  const index = state.transactions.findIndex((entry) => entry.id === entryId);
  if (index === -1) {
    return;
  }

  const updatedEntry = {
    ...state.transactions[index],
    type,
    amount,
    category,
    date,
    note,
  };

  if (shouldUseCloudPersistence()) {
    setSyncNotice("Sincronizando", "Atualizando lancamento na nuvem...", "warning");
    await upsertCloudTransactions([updatedEntry]);
    lastCloudSyncAt = new Date();
  }

  state.transactions[index] = updatedEntry;
}

async function updateRecurringRule(ruleId, { type, amount, category, date, note }) {
  const index = state.recurringRules.findIndex((rule) => rule.id === ruleId);
  if (index === -1) {
    return;
  }

  const updatedRule = {
    ...state.recurringRules[index],
    type,
    amount,
    category,
    startDate: date,
    note,
  };

  if (shouldUseCloudPersistence()) {
    setSyncNotice("Sincronizando", "Atualizando conta fixa na nuvem...", "warning");
    await upsertCloudRecurringRules([updatedRule]);
    lastCloudSyncAt = new Date();
  }

  state.recurringRules[index] = updatedRule;
}

async function updateInstallmentGroup(groupId, { type, amount, category, date, note }) {
  const existingEntries = state.transactions.filter((entry) => entry.installmentGroupId === groupId);
  if (existingEntries.length === 0) {
    return;
  }

  const updatedEntries = buildInstallmentEntries({
    type,
    amount,
    category,
    date,
    note,
    groupId,
  });

  if (shouldUseCloudPersistence()) {
    setSyncNotice("Sincronizando", "Atualizando parcelamento na nuvem...", "warning");
    await deleteCloudInstallmentGroup(groupId);
    await upsertCloudTransactions(updatedEntries);
    lastCloudSyncAt = new Date();
  }

  state.transactions = [
    ...updatedEntries,
    ...state.transactions.filter((entry) => entry.installmentGroupId !== groupId),
  ];
}

function setEntryBusy(isBusy) {
  elements.submitButton.disabled = isBusy;
  elements.submitButton.textContent = isBusy
    ? "Salvando..."
    : editingEntry
      ? "Salvar edicao"
      : "Salvar";
}

function buildSingleEntry({ type, amount, category, date, note }) {
  return {
    id: crypto.randomUUID(),
    type,
    amount,
    category,
    date,
    note,
    source: "single",
    installmentGroupId: null,
    installmentIndex: null,
    installmentTotal: null,
  };
}

function buildRecurringRule({ type, amount, category, date, note }) {
  return {
    id: crypto.randomUUID(),
    type,
    amount,
    category,
    startDate: date,
    note,
    endMonth: null,
  };
}

function buildInstallmentEntries({ type, amount, category, date, note, groupId = crypto.randomUUID() }) {
  const installments = getInstallmentCount();
  const amounts = splitAmountAcrossInstallments(amount, installments);

  return amounts.map((installmentAmount, index) => ({
    id: crypto.randomUUID(),
    type,
    amount: installmentAmount,
    category,
    date: addMonthsKeepingDay(date, index),
    note,
    source: "installment",
    installmentGroupId: groupId,
    installmentIndex: index + 1,
    installmentTotal: installments,
  }));
}

function startSingleEdit(entry) {
  editingEntry = { kind: "single", id: entry.id };
  fillEntryFormForEdit({
    type: entry.type,
    amount: entry.amount,
    category: entry.category,
    date: entry.date,
    note: entry.note,
    planType: "single",
  });
}

function startRecurringEdit(ruleId) {
  const rule = state.recurringRules.find((item) => item.id === ruleId);
  if (!rule) {
    return;
  }

  editingEntry = { kind: "recurring", id: rule.id };
  fillEntryFormForEdit({
    type: rule.type,
    amount: rule.amount,
    category: rule.category,
    date: rule.startDate,
    note: rule.note,
    planType: "recurring",
  });
}

function startInstallmentEdit(groupId) {
  const entries = state.transactions
    .filter((entry) => entry.installmentGroupId === groupId)
    .sort((left, right) => left.date.localeCompare(right.date));

  if (entries.length === 0) {
    return;
  }

  const firstEntry = entries[0];
  editingEntry = { kind: "installment", groupId };
  fillEntryFormForEdit({
    type: firstEntry.type,
    amount: entries.reduce((total, entry) => total + entry.amount, 0),
    category: firstEntry.category,
    date: firstEntry.date,
    note: firstEntry.note,
    planType: "installment",
    installments: firstEntry.installmentTotal || entries.length,
  });
}

function fillEntryFormForEdit({ type, amount, category, date, note, planType, installments }) {
  elements.entryForm.querySelector(`input[value="${type}"]`).checked = true;
  populateCategoryOptions(type);
  setCategoryValue(category);
  elements.amountInput.value = formatPlainMoney(amount);
  elements.dateInput.value = date;
  elements.noteInput.value = note || "";
  elements.planTypeInput.value = planType;
  elements.planTypeInput.disabled = true;
  elements.installmentsInput.value = String(installments || 2);
  elements.cancelEditButton.hidden = false;
  elements.submitButton.textContent = "Salvar edicao";
  updatePlanModeUI();
  elements.amountInput.focus();
}

function setCategoryValue(category) {
  const availableCategories = Array.from(elements.categoryInput.options).map((option) => option.value);

  if (availableCategories.includes(category)) {
    elements.categoryInput.value = category;
    elements.categoryCustomInput.value = "";
  } else {
    elements.categoryInput.value = "Outros";
    elements.categoryCustomInput.value = category;
  }

  updateCustomCategoryUI();
}

function resetEntryForm(referenceDate) {
  editingEntry = null;
  elements.entryForm.reset();
  elements.dateInput.value = referenceDate;
  elements.installmentsInput.value = "2";
  elements.entryForm.querySelector('input[value="expense"]').checked = true;
  elements.planTypeInput.value = "single";
  elements.planTypeInput.disabled = false;
  elements.cancelEditButton.hidden = true;
  elements.submitButton.textContent = "Salvar";
  populateCategoryOptions("expense");
  updatePlanModeUI();
  elements.amountInput.focus();
}

function getInstallmentCount() {
  const rawValue = Number.parseInt(elements.installmentsInput.value, 10);
  if (Number.isNaN(rawValue) || rawValue < 2) {
    return 2;
  }

  return Math.min(rawValue, MAX_INSTALLMENTS);
}

function formatInstallmentDuration(installments) {
  if (installments < 25) {
    return `${installments} meses`;
  }

  const years = Math.floor(installments / 12);
  const months = installments % 12;
  const yearText = years === 1 ? "1 ano" : `${years} anos`;

  if (!months) {
    return yearText;
  }

  const monthText = months === 1 ? "1 mes" : `${months} meses`;
  return `${yearText} e ${monthText}`;
}

function renderApp(initialLoad = false) {
  populateYearOptions(Number(state.selectedMonth.slice(0, 4)));
  syncPeriodInputs();
  renderSummary();
  renderCommitments();
  renderEntries();
  renderTrend();
}

function renderSummary() {
  const monthEntries = getTransactionsForMonth(state.selectedMonth);
  const income = sumCurrentImpactsByDirection(monthEntries, "income");
  const expense = sumCurrentImpactsByDirection(monthEntries, "expense");
  const currentBalance = getCurrentBalanceThroughMonth(state.selectedMonth);
  const emergencyBalance = getAllocationBalanceThroughMonth("emergency", state.selectedMonth);
  const investmentsBalance = getAllocationBalanceThroughMonth("investments", state.selectedMonth);

  elements.balanceValue.textContent = formatCurrency(currentBalance);
  elements.balanceValue.dataset.tone = currentBalance >= 0 ? "positive" : "negative";
  elements.incomeValue.textContent = formatCurrency(income);
  elements.expenseValue.textContent = formatCurrency(expense);
  elements.emergencyFundValue.textContent = formatCurrency(emergencyBalance);
  elements.investmentsValue.textContent = formatCurrency(investmentsBalance);
  elements.balanceHint.textContent =
    currentBalance >= 0
      ? `Disponivel apos reserva e investimentos ate ${formatMonthLabel(state.selectedMonth)}.`
      : `Saldo negativo de ${formatCurrency(Math.abs(currentBalance))} ate ${formatMonthLabel(state.selectedMonth)}.`;
}

function renderCommitments() {
  renderRecurringList();
  renderInstallmentList();
}

function renderRecurringList() {
  const activeRules = getActiveRecurringRules(state.selectedMonth).sort(
    (left, right) => right.amount - left.amount,
  );

  if (activeRules.length === 0) {
    elements.recurringList.innerHTML =
      '<div class="empty-state">Nenhuma conta fixa ativa para este periodo.</div>';
    return;
  }

  elements.recurringList.innerHTML = "";
  activeRules.forEach((rule) => {
    const item = document.createElement("article");
    item.className = "commitment-item";
    item.innerHTML = `
      <strong>${escapeHtml(rule.note || rule.category)}</strong>
      <p class="commitment-meta">
        ${escapeHtml(rule.category)} - ${formatCurrency(rule.amount)} por mes
      </p>
      <p class="commitment-meta">
        Ativa desde ${formatMonthLabel(rule.startDate.slice(0, 7))}
      </p>
      <div class="commitment-actions">
        <button class="ghost-button" data-edit-rule="${rule.id}" type="button">
          Editar
        </button>
        <button class="ghost-button danger-button" data-stop-rule="${rule.id}" type="button">
          Encerrar
        </button>
      </div>
    `;
    elements.recurringList.append(item);
  });

  elements.recurringList.querySelectorAll("[data-stop-rule]").forEach((button) => {
    button.addEventListener("click", async () => {
      await stopRecurringRule(button.getAttribute("data-stop-rule"), state.selectedMonth);
    });
  });

  elements.recurringList.querySelectorAll("[data-edit-rule]").forEach((button) => {
    button.addEventListener("click", () => {
      startRecurringEdit(button.getAttribute("data-edit-rule"));
    });
  });
}

function renderInstallmentList() {
  const activeGroups = getActiveInstallmentGroups(state.selectedMonth);

  if (activeGroups.length === 0) {
    elements.installmentList.innerHTML =
      '<div class="empty-state">Nenhum parcelamento em andamento para este periodo.</div>';
    return;
  }

  elements.installmentList.innerHTML = "";
  activeGroups.forEach((group) => {
    const item = document.createElement("article");
    item.className = "commitment-item";
    item.innerHTML = `
      <strong>${escapeHtml(group.note || group.category)}</strong>
      <p class="commitment-meta">
        ${escapeHtml(group.category)} - ${group.totalInstallments}x de ${formatCurrency(group.referenceAmount)}
      </p>
      <p class="commitment-meta">
        ${group.paidCount} paga(s), ${group.remainingCount} restante(s) - proxima em ${formatMonthLabel(group.nextMonth)}
      </p>
      <div class="commitment-actions">
        <button class="ghost-button" data-edit-group="${group.id}" type="button">
          Editar
        </button>
        <button class="ghost-button danger-button" data-cancel-group="${group.id}" type="button">
          Cancelar restantes
        </button>
      </div>
    `;
    elements.installmentList.append(item);
  });

  elements.installmentList.querySelectorAll("[data-cancel-group]").forEach((button) => {
    button.addEventListener("click", async () => {
      await cancelInstallmentGroup(button.getAttribute("data-cancel-group"), state.selectedMonth);
    });
  });

  elements.installmentList.querySelectorAll("[data-edit-group]").forEach((button) => {
    button.addEventListener("click", () => {
      startInstallmentEdit(button.getAttribute("data-edit-group"));
    });
  });
}

function renderEntries() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();
  const typeFilter = elements.typeFilter.value;

  const filteredEntries = getTransactionsForMonth(state.selectedMonth)
    .filter((entry) => (typeFilter === "all" ? true : entry.type === typeFilter))
    .filter((entry) => {
      const haystack = [entry.category, entry.note || "", getPlanText(entry)].join(" ").toLowerCase();
      return haystack.includes(searchTerm);
    });

  if (filteredEntries.length === 0) {
    elements.entryList.innerHTML = `
      <div class="empty-state">
        Nenhum lancamento encontrado para esse filtro. Tente outra busca ou mude o periodo.
      </div>
    `;
    return;
  }

  elements.entryList.innerHTML = "";
  filteredEntries.forEach((entry) => {
    const node = elements.entryTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".entry-category").textContent = entry.category;
    const amountNode = node.querySelector(".entry-amount");
    amountNode.dataset.type = entry.type;
    const allocationKind = getAllocationKind(entry);
    if (allocationKind) {
      amountNode.dataset.wallet = allocationKind;
    }
    amountNode.textContent = `${entry.type === "expense" ? "-" : "+"} ${formatCurrency(entry.amount)}`;
    node.querySelector(".entry-date").textContent = formatEntryDate(entry.date);
    node.querySelector(".entry-note").textContent = entry.note || getFallbackNote(entry);

    const typePill = node.querySelector(".entry-type-pill");
    typePill.dataset.type = entry.type;
    typePill.textContent = entry.type === "expense" ? "Saida" : "Entrada";

    const planPill = node.querySelector(".entry-plan-pill");
    if (allocationKind) {
      planPill.hidden = false;
      planPill.dataset.plan = allocationKind;
      planPill.textContent = allocationKind === "emergency" ? "Emergencia" : "Investimentos";
    } else if (entry.source === "single") {
      planPill.hidden = true;
    } else {
      planPill.hidden = false;
      planPill.dataset.plan = entry.source;
      planPill.textContent = getPlanText(entry);
    }

    const deleteButton = node.querySelector(".entry-delete");
    deleteButton.textContent = getDeleteActionLabel(entry);
    deleteButton.addEventListener("click", async () => {
      await handleEntryDelete(entry);
    });

    const editButton = node.querySelector(".entry-edit");
    editButton.addEventListener("click", () => {
      if (entry.source === "recurring") {
        startRecurringEdit(entry.recurringRuleId);
      } else if (entry.source === "installment") {
        startInstallmentEdit(entry.installmentGroupId);
      } else {
        startSingleEdit(entry);
      }
    });

    elements.entryList.append(node);
  });
}

function renderTrend() {
  const monthSeries = getRollingMonths(6);
  const totals = monthSeries.map((month) => {
    const entries = getTransactionsForMonth(month);
    return {
      month,
      income: sumCurrentImpactsByDirection(entries, "income"),
      expense: sumCurrentImpactsByDirection(entries, "expense"),
      emergency: sumAllocationsByKind(entries, "emergency"),
      investments: sumAllocationsByKind(entries, "investments"),
    };
  });

  const peakValue = Math.max(
    1,
    ...totals.flatMap((item) => [item.income, item.expense, item.emergency, item.investments]),
  );
  elements.trendBars.innerHTML = "";

  totals.forEach((item) => {
    const row = document.createElement("div");
    row.className = "trend-row";
    const incomeWidth = item.income > 0 ? Math.max(4, (item.income / peakValue) * 100) : 0;
    const expenseWidth = item.expense > 0 ? Math.max(4, (item.expense / peakValue) * 100) : 0;
    const emergencyWidth = item.emergency > 0 ? Math.max(4, (item.emergency / peakValue) * 100) : 0;
    const investmentsWidth =
      item.investments > 0 ? Math.max(4, (item.investments / peakValue) * 100) : 0;

    row.innerHTML = `
      <span class="trend-label">${formatMonthLabel(item.month)}</span>
      <div class="trend-lines">
        <span class="trend-line income" style="width: ${incomeWidth}%" title="Entradas ${formatCurrency(item.income)}"></span>
        <span class="trend-line expense" style="width: ${expenseWidth}%" title="Saidas ${formatCurrency(item.expense)}"></span>
        <span class="trend-line emergency" style="width: ${emergencyWidth}%" title="Emergencia ${formatCurrency(item.emergency)}"></span>
        <span class="trend-line investments" style="width: ${investmentsWidth}%" title="Investimentos ${formatCurrency(item.investments)}"></span>
      </div>
    `;

    elements.trendBars.append(row);
  });

  const currentEntries = getTransactionsForMonth(state.selectedMonth);
  const summary = document.createElement("div");
  summary.className = "quick-wallet-summary";
  summary.innerHTML = `
    <span data-wallet="emergency">Emergencia no mes: ${formatCurrency(sumAllocationsByKind(currentEntries, "emergency"))}</span>
    <span data-wallet="investments">Investimentos no mes: ${formatCurrency(sumAllocationsByKind(currentEntries, "investments"))}</span>
  `;
  elements.trendBars.append(summary);
}

async function handleEntryDelete(entry) {
  if (shouldUseCloudPersistence()) {
    try {
      setSyncNotice("Sincronizando", "Atualizando seus dados na nuvem...", "warning");

      if (entry.source === "recurring") {
        const rule = state.recurringRules.find((item) => item.id === entry.recurringRuleId);
        if (rule) {
          await stopCloudRecurringRule(rule, entry.date.slice(0, 7));
        }
      } else if (entry.source === "installment") {
        await cancelCloudInstallmentGroup(entry.installmentGroupId, entry.date.slice(0, 7));
      } else {
        await deleteCloudTransaction(entry.id);
      }

      lastCloudSyncAt = new Date();
    } catch (error) {
      handleCloudError("Nao consegui atualizar esse lancamento.", error);
      return;
    }
  }

  if (entry.source === "recurring") {
    await stopRecurringRule(entry.recurringRuleId, entry.date.slice(0, 7), false);
    return;
  }

  if (entry.source === "installment") {
    await cancelInstallmentGroup(entry.installmentGroupId, entry.date.slice(0, 7), false);
    return;
  }

  const index = state.transactions.findIndex((item) => item.id === entry.id);
  if (index === -1) {
    return;
  }

  state.transactions.splice(index, 1);
  saveState();
  renderApp();

  if (shouldUseCloudPersistence()) {
    setSyncNotice("Sincronizado", getSyncedMessage(), "success");
  } else {
    setLocalModeNotice("Lancamento removido deste aparelho.");
  }
}

async function stopRecurringRule(ruleId, monthString, syncCloud = true) {
  const ruleIndex = state.recurringRules.findIndex((rule) => rule.id === ruleId);
  if (ruleIndex === -1) {
    return;
  }

  const rule = state.recurringRules[ruleIndex];

  if (syncCloud && shouldUseCloudPersistence()) {
    try {
      setSyncNotice("Sincronizando", "Atualizando essa conta fixa...", "warning");
      await stopCloudRecurringRule(rule, monthString);
      lastCloudSyncAt = new Date();
    } catch (error) {
      handleCloudError("Nao consegui encerrar a conta fixa.", error);
      return;
    }
  }

  const previousMonth = getPreviousMonth(monthString);

  if (previousMonth < rule.startDate.slice(0, 7)) {
    state.recurringRules.splice(ruleIndex, 1);
  } else {
    rule.endMonth = previousMonth;
  }

  saveState();
  renderApp();

  if (shouldUseCloudPersistence()) {
    setSyncNotice("Sincronizado", getSyncedMessage(), "success");
  } else {
    setLocalModeNotice("Conta fixa atualizada neste aparelho.");
  }
}

async function cancelInstallmentGroup(groupId, fromMonth, syncCloud = true) {
  if (syncCloud && shouldUseCloudPersistence()) {
    try {
      setSyncNotice("Sincronizando", "Cancelando as parcelas restantes...", "warning");
      await cancelCloudInstallmentGroup(groupId, fromMonth);
      lastCloudSyncAt = new Date();
    } catch (error) {
      handleCloudError("Nao consegui cancelar as parcelas restantes.", error);
      return;
    }
  }

  state.transactions = state.transactions.filter((entry) => {
    if (entry.installmentGroupId !== groupId) {
      return true;
    }

    return entry.date.slice(0, 7) < fromMonth;
  });

  saveState();
  renderApp();

  if (shouldUseCloudPersistence()) {
    setSyncNotice("Sincronizado", getSyncedMessage(), "success");
  } else {
    setLocalModeNotice("Parcelamento atualizado neste aparelho.");
  }
}

function getSelectedEntryType() {
  const selected = elements.entryForm.querySelector('input[name="entryType"]:checked');
  return selected ? selected.value : "expense";
}

function getTransactionsForMonth(monthString) {
  const directEntries = state.transactions.filter((entry) => entry.date.startsWith(monthString));
  const recurringEntries = getGeneratedRecurringTransactions(monthString);

  return [...directEntries, ...recurringEntries].sort(compareTransactionsDesc);
}

function getCurrentBalanceThroughMonth(monthString) {
  const directEntries = state.transactions.filter((entry) => entry.date.slice(0, 7) <= monthString);
  const recurringEntries = getGeneratedRecurringTransactionsThroughMonth(monthString);

  const transactionBalance = [...directEntries, ...recurringEntries].reduce((total, entry) => {
    return total + getCurrentBalanceImpact(entry);
  }, 0);

  return transactionBalance;
}

function getGeneratedRecurringTransactions(monthString) {
  return getActiveRecurringRules(monthString).map((rule) => {
    const [year, month] = monthString.split("-").map(Number);
    const day = Number(rule.startDate.slice(8, 10));
    return {
      id: `recurring:${rule.id}:${monthString}`,
      recurringRuleId: rule.id,
      type: rule.type,
      amount: rule.amount,
      category: rule.category,
      date: createDateKeepingDay(year, month, day),
      note: rule.note,
      source: "recurring",
      installmentGroupId: null,
      installmentIndex: null,
      installmentTotal: null,
    };
  });
}

function getGeneratedRecurringTransactionsThroughMonth(endMonth) {
  const generatedEntries = [];

  state.recurringRules.forEach((rule) => {
    const startMonth = rule.startDate.slice(0, 7);
    const lastMonth = rule.endMonth && rule.endMonth < endMonth ? rule.endMonth : endMonth;

    if (startMonth > lastMonth) {
      return;
    }

    getMonthRange(startMonth, lastMonth).forEach((monthString) => {
      const [year, month] = monthString.split("-").map(Number);
      const day = Number(rule.startDate.slice(8, 10));
      generatedEntries.push({
        id: `recurring:${rule.id}:${monthString}`,
        recurringRuleId: rule.id,
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        date: createDateKeepingDay(year, month, day),
        note: rule.note,
        source: "recurring",
        installmentGroupId: null,
        installmentIndex: null,
        installmentTotal: null,
      });
    });
  });

  return generatedEntries;
}

function getMonthRange(startMonth, endMonth) {
  const months = [];
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  const cursor = new Date(startYear, startMonthNumber - 1, 1);
  const endDate = new Date(endYear, endMonthNumber - 1, 1);

  while (cursor <= endDate) {
    months.push(formatMonthInput(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function getActiveRecurringRules(monthString) {
  return state.recurringRules.filter((rule) => {
    const startMonth = rule.startDate.slice(0, 7);
    const endMonth = rule.endMonth || "9999-12";
    return startMonth <= monthString && monthString <= endMonth;
  });
}

function getActiveInstallmentGroups(monthString) {
  const groups = new Map();

  state.transactions
    .filter((entry) => entry.source === "installment" && entry.installmentGroupId)
    .forEach((entry) => {
      const groupId = entry.installmentGroupId;
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }

      groups.get(groupId).push(entry);
    });

  return Array.from(groups.entries())
    .map(([groupId, entries]) => buildInstallmentGroup(groupId, entries, monthString))
    .filter((group) => group.remainingCount > 0 && group.startMonth <= monthString)
    .sort((left, right) => left.nextMonth.localeCompare(right.nextMonth));
}

function buildInstallmentGroup(groupId, entries, monthString) {
  const sortedEntries = [...entries].sort((left, right) => left.date.localeCompare(right.date));
  const remainingEntries = sortedEntries.filter((entry) => entry.date.slice(0, 7) >= monthString);
  const referenceEntry = remainingEntries[0] || sortedEntries[sortedEntries.length - 1];

  return {
    id: groupId,
    category: referenceEntry.category,
    note: referenceEntry.note,
    startMonth: sortedEntries[0].date.slice(0, 7),
    totalInstallments: referenceEntry.installmentTotal || sortedEntries.length,
    referenceAmount: referenceEntry.amount,
    paidCount: sortedEntries.length - remainingEntries.length,
    remainingCount: remainingEntries.length,
    nextMonth: (remainingEntries[0] || sortedEntries[sortedEntries.length - 1]).date.slice(0, 7),
  };
}

function getCommitmentSummary(monthString) {
  const recurringCount = getActiveRecurringRules(monthString).length;
  const installmentCount = getActiveInstallmentGroups(monthString).length;

  return {
    recurringCount,
    installmentCount,
    totalCount: recurringCount + installmentCount,
  };
}

function sumCurrentImpactsByDirection(entries, direction) {
  return entries.reduce((total, entry) => {
    const impact = getCurrentBalanceImpact(entry);

    if (direction === "income" && impact > 0) {
      return total + impact;
    }

    if (direction === "expense" && impact < 0) {
      return total + Math.abs(impact);
    }

    return total;
  }, 0);
}

function sumAllocationsByKind(entries, kind) {
  return entries
    .filter((entry) => getAllocationKind(entry) === kind)
    .reduce((total, entry) => total + Math.max(0, getAllocationBalanceImpact(entry)), 0);
}

function getAllocationBalanceThroughMonth(kind, monthString) {
  return state.transactions
    .filter((entry) => entry.date.slice(0, 7) <= monthString && getAllocationKind(entry) === kind)
    .reduce((total, entry) => total + getAllocationBalanceImpact(entry), 0);
}

function isAllocationEntry(entry) {
  return Boolean(getAllocationKind(entry));
}

function getAllocationKind(entry) {
  if (entry.category === ALLOCATION_CATEGORIES.emergencyFund) {
    return "emergency";
  }

  if (
    entry.category === ALLOCATION_CATEGORIES.investments ||
    entry.category === ALLOCATION_CATEGORIES.investmentWithdrawal
  ) {
    return "investments";
  }

  return "";
}

function getCurrentBalanceImpact(entry) {
  if (entry.category === ALLOCATION_CATEGORIES.emergencyFund) {
    return entry.type === "income" ? entry.amount : -entry.amount;
  }

  if (entry.category === ALLOCATION_CATEGORIES.investments) {
    return -entry.amount;
  }

  if (entry.category === ALLOCATION_CATEGORIES.investmentWithdrawal) {
    return entry.amount;
  }

  return entry.type === "income" ? entry.amount : -entry.amount;
}

function getAllocationBalanceImpact(entry) {
  if (entry.category === ALLOCATION_CATEGORIES.emergencyFund) {
    return entry.type === "income" ? -entry.amount : entry.amount;
  }

  if (entry.category === ALLOCATION_CATEGORIES.investments) {
    return entry.amount;
  }

  if (entry.category === ALLOCATION_CATEGORIES.investmentWithdrawal) {
    return -entry.amount;
  }

  return 0;
}

function getRollingMonths(count) {
  const months = [];
  const [year, month] = state.selectedMonth.split("-").map(Number);
  const baseDate = new Date(year, month - 1, 1);

  for (let index = count - 1; index >= 0; index -= 1) {
    const current = new Date(baseDate.getFullYear(), baseDate.getMonth() - index, 1);
    months.push(formatMonthInput(current));
  }

  return months;
}

function splitAmountAcrossInstallments(totalAmount, count) {
  const cents = Math.round(totalAmount * 100);
  const base = Math.floor(cents / count);
  let remainder = cents - base * count;

  return Array.from({ length: count }, () => {
    const currentCents = base + (remainder > 0 ? 1 : 0);
    remainder = Math.max(remainder - 1, 0);
    return currentCents / 100;
  });
}

function addMonthsKeepingDay(dateString, monthOffset) {
  const [year, month, day] = dateString.split("-").map(Number);
  const shifted = new Date(year, month - 1 + monthOffset, 1);
  return createDateKeepingDay(shifted.getFullYear(), shifted.getMonth() + 1, day);
}

function createDateKeepingDay(year, month, day) {
  const safeDay = Math.min(day, getDaysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getPreviousMonth(monthString) {
  const [year, month] = monthString.split("-").map(Number);
  const previous = new Date(year, month - 2, 1);
  return formatMonthInput(previous);
}

function getPlanText(entry) {
  if (entry.source === "installment") {
    return `Parcela ${entry.installmentIndex}/${entry.installmentTotal}`;
  }

  if (entry.source === "recurring") {
    return "Fixa mensal";
  }

  return "Avulsa";
}

function getDeleteActionLabel(entry) {
  if (entry.source === "installment") {
    return "Cancelar restantes";
  }

  if (entry.source === "recurring") {
    return "Encerrar fixa";
  }

  return "Excluir";
}

function getFallbackNote(entry) {
  if (entry.source === "installment") {
    return getPlanText(entry);
  }

  if (entry.source === "recurring") {
    return "Lancamento fixo do mes";
  }

  return "Sem observacao";
}

function compareTransactionsDesc(left, right) {
  if (left.date === right.date) {
    return right.amount - left.amount;
  }

  return right.date.localeCompare(left.date);
}

function compareRecurringRulesDesc(left, right) {
  return right.startDate.localeCompare(left.startDate);
}

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function formatPlainMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatEntryDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return dateFormatter.format(new Date(year, month - 1, day));
}

function formatMonthLabel(monthString) {
  const [year, month] = monthString.split("-").map(Number);
  return `${monthNamesShort[month - 1]}/${String(year).slice(-2)}`;
}

function formatMonthInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseYearInput(rawValue) {
  const normalized = String(rawValue || "").trim();
  const numericYear = Number.parseInt(normalized, 10);

  if (!Number.isInteger(numericYear) || normalized.length < 1) {
    return null;
  }

  return numericYear;
}
