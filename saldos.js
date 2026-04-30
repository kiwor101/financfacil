const STORAGE_KEY = "fluxo-leve-v1";
const SUPABASE_CONFIG_KEY = "fluxo-leve-supabase-config-v1";
const CLOUD_TABLES = {
  balances: "account_balances",
};

const elements = {
  form: document.querySelector("#initialBalancesForm"),
  currentBalanceInput: document.querySelector("#initialCurrentBalanceInput"),
  emergencyFundInput: document.querySelector("#initialEmergencyFundInput"),
  investmentsInput: document.querySelector("#initialInvestmentsInput"),
  saveButton: document.querySelector("#saveInitialBalancesButton"),
  message: document.querySelector("#initialBalancesMessage"),
};

let currentUser = null;
let supabaseClient = null;
let state = loadState();

bootstrap();

async function bootstrap() {
  hydrateInputs();
  bindEvents();
  await initializeCloud();
}

function bindEvents() {
  elements.form.addEventListener("submit", handleSubmit);
}

async function initializeCloud() {
  const config = loadSupabaseConfig();
  if (!hasSupabaseConfig(config) || !window.supabase) {
    setMessage("Modo local. Entre na conta no app principal para sincronizar na nuvem.", "muted");
    return;
  }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;

  if (!currentUser) {
    setMessage("Modo local. Entre na sua conta no app principal para sincronizar.", "muted");
    return;
  }

  await loadCloudBalances();
}

async function loadCloudBalances() {
  try {
    const { data, error } = await supabaseClient.from(CLOUD_TABLES.balances).select("*").maybeSingle();
    if (error) {
      throw error;
    }

    if (data) {
      state.balances = normalizeBalances({
        currentBalance: data.current_balance,
        emergencyFund: data.emergency_fund,
        investments: data.investments,
      });
      saveState();
      hydrateInputs();
    }

    setMessage("Saldos carregados. Alteracoes serao sincronizadas na nuvem.", "success");
  } catch (error) {
    console.error(error);
    setMessage("Nao consegui carregar os saldos da nuvem. Voce ainda pode salvar localmente.", "error");
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  state.balances = normalizeBalances({
    currentBalance: parseMoneyInput(elements.currentBalanceInput.value),
    emergencyFund: parseMoneyInput(elements.emergencyFundInput.value),
    investments: parseMoneyInput(elements.investmentsInput.value),
  });

  saveState();
  hydrateInputs();

  if (!currentUser || !supabaseClient) {
    setMessage("Saldos salvos neste aparelho.", "success");
    return;
  }

  try {
    setBusy(true);
    const { error } = await supabaseClient.from(CLOUD_TABLES.balances).upsert(
      {
        user_id: currentUser.id,
        current_balance: state.balances.currentBalance,
        emergency_fund: state.balances.emergencyFund,
        investments: state.balances.investments,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw error;
    }

    setMessage("Saldos salvos e sincronizados.", "success");
  } catch (error) {
    console.error(error);
    setMessage("Salvei localmente, mas nao consegui sincronizar na nuvem.", "error");
  } finally {
    setBusy(false);
  }
}

function loadState() {
  const fallback = {
    selectedMonth: formatMonthInput(new Date()),
    transactions: [],
    recurringRules: [],
    balances: {
      currentBalance: 0,
      emergencyFund: 0,
      investments: 0,
    },
  };

  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return fallback;
    }

    const parsed = JSON.parse(rawState);
    return {
      ...fallback,
      ...parsed,
      balances: normalizeBalances(parsed.balances),
    };
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hydrateInputs() {
  elements.currentBalanceInput.value = formatPlainMoney(state.balances.currentBalance);
  elements.emergencyFundInput.value = formatPlainMoney(state.balances.emergencyFund);
  elements.investmentsInput.value = formatPlainMoney(state.balances.investments);
}

function normalizeBalances(balances) {
  return {
    currentBalance: normalizeMoneyValue(balances?.currentBalance),
    emergencyFund: normalizeMoneyValue(balances?.emergencyFund),
    investments: normalizeMoneyValue(balances?.investments),
  };
}

function normalizeMoneyValue(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function parseMoneyInput(value) {
  return Number.parseFloat(String(value || "0").replace(",", ".")) || 0;
}

function formatPlainMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatMonthInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function loadSupabaseConfig() {
  const embeddedConfig = normalizeSupabaseConfig(window.FLUXO_SUPABASE_CONFIG || {});
  if (hasSupabaseConfig(embeddedConfig)) {
    return embeddedConfig;
  }

  try {
    return normalizeSupabaseConfig(JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY) || "{}"));
  } catch (error) {
    return normalizeSupabaseConfig({});
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

function setBusy(isBusy) {
  elements.saveButton.disabled = isBusy;
  elements.saveButton.textContent = isBusy ? "Salvando..." : "Salvar saldos";
}

function setMessage(message, tone = "muted") {
  elements.message.textContent = message;
  elements.message.dataset.tone = tone;
}
