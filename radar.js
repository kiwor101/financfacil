const THEME_STORAGE_KEY = "controle-financeiro-theme-v1";
const TAXES_API_URL = "https://brasilapi.com.br/api/taxas/v1";
const CURRENCY_API_URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL,BTC-BRL";

const elements = {
  status: document.querySelector("#radarStatus"),
  selicValue: document.querySelector("#selicValue"),
  cdiValue: document.querySelector("#cdiValue"),
  ipcaValue: document.querySelector("#ipcaValue"),
  dollarValue: document.querySelector("#dollarValue"),
  dollarVariation: document.querySelector("#dollarVariation"),
  bitcoinValue: document.querySelector("#bitcoinValue"),
  bitcoinVariation: document.querySelector("#bitcoinVariation"),
  marketMoodValue: document.querySelector("#marketMoodValue"),
  marketMoodText: document.querySelector("#marketMoodText"),
  tips: document.querySelector("#radarTips"),
  amountInput: document.querySelector("#radarAmountInput"),
  cdiInput: document.querySelector("#radarCdiInput"),
  cdiPercentInput: document.querySelector("#radarCdiPercentInput"),
  monthsInput: document.querySelector("#radarMonthsInput"),
  simResults: document.querySelector("#radarSimResults"),
};

const state = {
  rates: {
    selic: 0,
    cdi: 0,
    ipca: 0,
  },
};

applyStoredTheme();
bootstrap();

function bootstrap() {
  [elements.amountInput, elements.cdiInput, elements.cdiPercentInput, elements.monthsInput].forEach((input) => {
    input.addEventListener("input", renderSimulation);
  });

  loadRadarData();
}

function applyStoredTheme() {
  const theme = localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", theme === "dark" ? "#0b1714" : "#0d8b72");
  }
}

async function loadRadarData() {
  try {
    const [rates, currencies] = await Promise.all([fetchRates(), fetchCurrencies()]);
    state.rates = rates;
    elements.cdiInput.value = normalizeInputDecimal(rates.cdi);
    renderRates(rates);
    renderCurrencies(currencies);
    renderMarketMood(rates, currencies);
    renderTips(rates, currencies);
    renderSimulation();
    setStatus(`Atualizado em ${new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date())}.`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Não consegui buscar os indicadores agora. Tente novamente em instantes.", "error");
    renderFallbackTips();
    renderSimulation();
  }
}

async function fetchRates() {
  const response = await fetch(TAXES_API_URL);
  if (!response.ok) {
    throw new Error("Falha ao buscar taxas.");
  }

  const data = await response.json();
  const getRate = (name) => {
    const item = data.find((rate) => normalizeText(rate.nome) === normalizeText(name));
    return Number(item?.valor || 0);
  };

  return {
    selic: getRate("SELIC"),
    cdi: getRate("CDI"),
    ipca: getRate("IPCA"),
  };
}

async function fetchCurrencies() {
  const response = await fetch(CURRENCY_API_URL);
  if (!response.ok) {
    throw new Error("Falha ao buscar moedas.");
  }

  const data = await response.json();
  return {
    dollar: normalizeCurrencyQuote(data.USDBRL),
    bitcoin: normalizeCurrencyQuote(data.BTCBRL),
  };
}

function normalizeCurrencyQuote(quote) {
  return {
    value: Number(quote?.bid || 0),
    variation: Number(quote?.pctChange || 0),
  };
}

function renderRates(rates) {
  elements.selicValue.textContent = formatPercent(rates.selic);
  elements.cdiValue.textContent = formatPercent(rates.cdi);
  elements.ipcaValue.textContent = formatPercent(rates.ipca);
}

function renderCurrencies(currencies) {
  elements.dollarValue.textContent = formatCurrency(currencies.dollar.value);
  elements.dollarVariation.textContent = `Variação: ${formatSignedPercent(currencies.dollar.variation)}.`;
  elements.bitcoinValue.textContent = formatCurrency(currencies.bitcoin.value);
  elements.bitcoinVariation.textContent = `Variação: ${formatSignedPercent(currencies.bitcoin.variation)}.`;
}

function renderMarketMood(rates, currencies) {
  const highRates = rates.selic >= 10 || rates.cdi >= 10;
  const dollarMoving = Math.abs(currencies.dollar.variation) >= 1;

  if (highRates && dollarMoving) {
    elements.marketMoodValue.textContent = "Juros fortes e câmbio atento";
    elements.marketMoodText.textContent =
      "Renda fixa pode estar interessante, mas variação do dólar pede cuidado com compras e ativos dolarizados.";
    return;
  }

  if (highRates) {
    elements.marketMoodValue.textContent = "Renda fixa favorecida";
    elements.marketMoodText.textContent =
      "Com Selic/CDI altos, produtos pós-fixados costumam ser bons candidatos para estudo.";
    return;
  }

  elements.marketMoodValue.textContent = "Comparar antes de agir";
  elements.marketMoodText.textContent =
    "Com juros menores, prazo, liquidez e risco ganham ainda mais peso na escolha.";
}

function renderTips(rates, currencies) {
  const tips = [];

  if (rates.selic >= 10 || rates.cdi >= 10) {
    tips.push("Para reserva, compare CDB com liquidez diária, Tesouro Selic e fundos simples de baixo custo.");
  } else {
    tips.push("Com juros menores, evite olhar só para a rentabilidade. Prazo e risco podem pesar mais.");
  }

  tips.push("Antes de investir, separe o dinheiro por objetivo: emergência, curto prazo e longo prazo.");

  if (currencies.dollar.variation > 1) {
    tips.push("Dólar subindo forte: cuidado com compras internacionais e entrada apressada em ativos dolarizados.");
  } else if (currencies.dollar.variation < -1) {
    tips.push("Dólar caindo: pode aliviar custos externos, mas câmbio continua sendo risco.");
  }

  tips.push("Bitcoin é volátil. Se for estudar cripto, comece pequeno e com dinheiro que não comprometa sua rotina.");

  elements.tips.innerHTML = tips.map((tip) => `<p>${escapeHtml(tip)}</p>`).join("");
}

function renderFallbackTips() {
  elements.marketMoodValue.textContent = "Modo estudo";
  elements.marketMoodText.textContent =
    "Mesmo sem indicadores agora, use a página para simular prazos e organizar sua decisão.";
  elements.tips.innerHTML = `
    <p>Para investir com mais segurança, comece separando reserva de emergência, objetivos e prazo.</p>
    <p>Compare produtos por liquidez, garantia, imposto, taxa e risco. Rentabilidade sozinha não conta a história toda.</p>
  `;
}

function renderSimulation() {
  const amount = Number(elements.amountInput.value || 0);
  const cdiAnnual = Number(elements.cdiInput.value || state.rates.cdi || 0);
  const cdiPercent = Number(elements.cdiPercentInput.value || 0);
  const months = Math.max(1, Math.round(Number(elements.monthsInput.value || 1)));
  const effectiveAnnualRate = (cdiAnnual / 100) * (cdiPercent / 100);
  const monthlyRate = Math.pow(1 + effectiveAnnualRate, 1 / 12) - 1;
  const finalValue = amount * Math.pow(1 + monthlyRate, months);
  const grossReturn = finalValue - amount;
  const averageMonthlyReturn = grossReturn / months;

  elements.simResults.innerHTML = `
    <article>
      <strong>${formatCurrency(finalValue)}</strong>
      <span>Total bruto estimado ao final de ${months} ${months === 1 ? "mês" : "meses"}.</span>
    </article>
    <article>
      <strong>${formatCurrency(grossReturn)}</strong>
      <span>Rendimento bruto estimado no período.</span>
    </article>
    <article>
      <strong>${formatCurrency(averageMonthlyReturn)}</strong>
      <span>Média bruta aproximada por mês.</span>
    </article>
  `;
}

function setStatus(message, tone) {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeInputDecimal(value) {
  return String(Number(value || 0).toFixed(2));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatPercent(value) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)}%`;
}

function formatSignedPercent(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
