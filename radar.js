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
  tips: document.querySelector("#radarTips"),
  amountInput: document.querySelector("#radarAmountInput"),
  simResults: document.querySelector("#radarSimResults"),
};

const state = {
  rates: {
    selic: 0,
    cdi: 0,
    ipca: 0,
  },
};

bootstrap();

function bootstrap() {
  elements.amountInput.addEventListener("input", renderSimulation);
  loadRadarData();
}

async function loadRadarData() {
  try {
    const [rates, currencies] = await Promise.all([fetchRates(), fetchCurrencies()]);
    state.rates = rates;
    renderRates(rates);
    renderCurrencies(currencies);
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

function renderTips(rates, currencies) {
  const tips = [];

  if (rates.selic >= 10 || rates.cdi >= 10) {
    tips.push("Com Selic/CDI altos, renda fixa pós-fixada tende a ficar competitiva para reserva e curto prazo.");
  } else {
    tips.push("Com juros mais baixos, vale comparar prazos, liquidez e risco antes de escolher renda fixa.");
  }

  tips.push("Para reserva de emergência, priorize liquidez diária e baixo risco antes de buscar rentabilidade maior.");

  if (currencies.dollar.variation > 1) {
    tips.push("Dólar subindo forte pode indicar cautela para compras internacionais e investimentos dolarizados.");
  } else if (currencies.dollar.variation < -1) {
    tips.push("Dólar caindo pode aliviar custos externos, mas não elimina o risco cambial.");
  }

  tips.push("Bitcoin tem alta volatilidade. Se estudar cripto, use apenas uma parcela pequena e consciente.");

  elements.tips.innerHTML = tips.map((tip) => `<p>${escapeHtml(tip)}</p>`).join("");
}

function renderFallbackTips() {
  elements.tips.innerHTML = `
    <p>Para investir com mais segurança, comece separando reserva de emergência, objetivos e prazo.</p>
    <p>Compare produtos por liquidez, garantia, imposto, taxa e risco. Rentabilidade sozinha não conta a história toda.</p>
  `;
}

function renderSimulation() {
  const amount = Number(elements.amountInput.value || 0);
  const cdi = state.rates.cdi;
  const levels = [100, 105, 110];

  elements.simResults.innerHTML = levels
    .map((level) => {
      const grossReturn = amount * ((cdi * (level / 100)) / 100);
      return `
        <article>
          <strong>${level}% do CDI</strong>
          <span>${formatCurrency(grossReturn)} em 12 meses</span>
        </article>
      `;
    })
    .join("");
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
