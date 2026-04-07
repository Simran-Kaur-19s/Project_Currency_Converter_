/* ================= BASIC ELEMENTS ================= */

const amount = document.getElementById("amount");
const from = document.getElementById("from");
const to = document.getElementById("to");
const result = document.getElementById("result");
const liveRateText = document.getElementById("liveRate");

const themeBtn = document.getElementById("themeToggle");

const historyBtn = document.getElementById("showHistory");
const historyModal = document.getElementById("historyModal");
const historyBody = document.querySelector("#historyTable tbody");
const clearBtn = document.getElementById("clearHistory");
const closeBtn = document.getElementById("closeHistory");

const chartButtons = document.querySelectorAll(".chart-btn");
const chartCanvas = document.getElementById("rateChart");

let rates = {};
let chartInstance;

/* ================= CURRENCY LIST ================= */

const mainCurrencies = [
    "USD", "EUR", "INR", "GBP", "JPY",
    "AUD", "CAD", "CHF", "CNY", "HKD",
    "SGD", "NZD", "ZAR", "AED", "SAR"
];

/* ================= FETCH LIVE RATES ================= */

async function fetchLiveRates(baseCurrency) {
    try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
        const data = await res.json();
        rates = data.rates;
        showLiveRate();
    } catch {
        result.innerText = "Failed to load rates";
    }
}

/* ================= FILL DROPDOWNS ================= */

function fillCurrencies(allRates) {
    from.innerHTML = "";
    to.innerHTML = "";

    mainCurrencies.forEach(cur => {
        if (allRates[cur]) {
            from.innerHTML += `<option>${cur}</option>`;
            to.innerHTML += `<option>${cur}</option>`;
        }
    });
}

/* ================= LIVE RATE ================= */

function showLiveRate() {
    if (!rates[to.value]) return;
    liveRateText.innerText = `1 ${from.value} = ${rates[to.value].toFixed(4)} ${to.value}`;
}

/* ================= CONVERT ================= */

function convertCurrency() {
    const value = Number(amount.value);
    if (!value || value <= 0) {
        result.innerText = "Enter valid amount";
        return;
    }

    const converted = (value * rates[to.value]).toFixed(2);
    result.innerText = `${value} ${from.value} = ${converted} ${to.value}`;
    saveHistory(value, from.value, to.value, converted);
}

/* ================= HISTORY ================= */

function saveHistory(amount, fromCur, toCur, resultVal) {
    let history = JSON.parse(localStorage.getItem("history")) || [];
    history.unshift({ amount, fromCur, toCur, resultVal });
    if (history.length > 5) history.pop();
    localStorage.setItem("history", JSON.stringify(history));
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem("history")) || [];
    historyBody.innerHTML = "";
    history.forEach(item => {
        historyBody.innerHTML += `
      <tr>
        <td>${item.amount}</td>
        <td>${item.fromCur}</td>
        <td>${item.toCur}</td>
        <td>${item.resultVal}</td>
      </tr>`;
    });
}

clearBtn.onclick = () => {
    localStorage.removeItem("history");
    historyBody.innerHTML = "";
};

/* ================= SWAP ================= */

function swapCurrency() {
    [from.value, to.value] = [to.value, from.value];
    fetchLiveRates(from.value);
    loadChart(7);
}

/* ================= DARK MODE ================= */

themeBtn.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme",
        document.body.classList.contains("dark") ? "dark" : "light"
    );
};

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

/* ================= MODAL ================= */

historyBtn.onclick = e => {
    e.preventDefault();
    loadHistory();
    historyModal.classList.add("show");
};

closeBtn.onclick = () => historyModal.classList.remove("show");

/* ================= CHART DATA ================= */

async function fetchChartData(days) {

    const dates = [];
    const values = [];

    // get current live rate once
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from.value}`);
    const data = await res.json();

    let baseValue = data.rates[to.value];

    for (let i = days; i >= 0; i--) {

        const d = new Date();
        d.setDate(d.getDate() - i);

        dates.push(d.toISOString().split("T")[0]);

        // simulate market fluctuation ±1%
        const change = (Math.random() - 0.5) * 0.02;
        baseValue = baseValue + baseValue * change;

        values.push(Number(baseValue.toFixed(4)));
    }

    return { dates, values };
}

/* ================= DRAW CHART ================= */

async function loadChart(days) {

    const data = await fetchChartData(days);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(chartCanvas, {
        type: "line",
        data: {
            labels: data.dates,
            datasets: [{
                label: `${from.value} → ${to.value}`,
                data: data.values,
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/* ================= BUTTONS ================= */

chartButtons.forEach(btn => {
    btn.onclick = () => {
        chartButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        loadChart(Number(btn.dataset.range));
    };
});

/* ================= INIT ================= */

async function init() {

    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const data = await res.json();

    fillCurrencies(data.rates);

    from.value = localStorage.getItem("from") || "USD";
    to.value = localStorage.getItem("to") || "INR";

    await fetchLiveRates(from.value);

    document.querySelector('[data-range="7"]').classList.add("active");
    loadChart(7);
}

from.onchange = () => {
    localStorage.setItem("from", from.value);
    fetchLiveRates(from.value);
    loadChart(7);
};

to.onchange = () => {
    localStorage.setItem("to", to.value);
    showLiveRate();
    loadChart(7);
};

document.getElementById("convert").onclick = convertCurrency;
document.getElementById("swapBtn").onclick = swapCurrency;

init();
