// ===== Utils =====
const mesesPorPeriodo = {
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

// Formata em BRL
function brl(v) {
  return (isFinite(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Converte taxa de um período para outro, mantendo equivalência composta
function converterTaxaEquivalente(taxaPct, de, para) {
  const i_de = taxaPct / 100;
  const k = mesesPorPeriodo[para] / mesesPorPeriodo[de]; // ex.: de anual para mensal -> 1/12
  // taxa equivalente composta: (1+i_de)^k - 1
  return (Math.pow(1 + i_de, k) - 1) * 100; // retorna em %
}

// ===== Operações básicas =====
function jurosSimples(C, iPct, n) {
  const i = iPct / 100;
  const J = C * i * n;
  const M = C + J;
  return { J, M };
}

function jurosCompostos(C, iPct, n) {
  const i = iPct / 100;
  const M = C * Math.pow(1 + i, n);
  const J = M - C;
  return { J, M };
}

function valorPresente(VF, iPct, n) {
  const i = iPct / 100;
  return VF / Math.pow(1 + i, n);
}

function valorFuturo(VP, iPct, n) {
  const i = iPct / 100;
  return VP * Math.pow(1 + i, n);
}

// ===== PRICE & SAC =====
function tabelaPRICE(P, iPct, n) {
  const i = iPct / 100;
  const pmt = P * (i / (1 - Math.pow(1 + i, -n)));
  let saldo = P;
  const linhas = [];
  for (let k = 1; k <= n; k++) {
    const juros = saldo * i;
    const amort = pmt - juros;
    saldo = Math.max(saldo - amort, 0);
    linhas.push({
      parcela: k,
      valor_parcela: pmt,
      amortizacao: amort,
      juros: juros,
      saldo_devedor: saldo,
    });
  }
  return linhas;
}

function tabelaSAC(P, iPct, n) {
  const i = iPct / 100;
  const amortFix = P / n;
  let saldo = P;
  const linhas = [];
  for (let k = 1; k <= n; k++) {
    const juros = saldo * i;
    const pmt = amortFix + juros;
    saldo = Math.max(saldo - amortFix, 0);
    linhas.push({
      parcela: k,
      valor_parcela: pmt,
      amortizacao: amortFix,
      juros: juros,
      saldo_devedor: saldo,
    });
  }
  return linhas;
}

// ===== Render helpers =====
function renderResultado(elId, html) {
  document.getElementById(elId).innerHTML = html;
}

function renderTabela(tabela) {
  let html = `
    <table>
      <thead>
        <tr>
          <th>Parcela</th>
          <th>Valor Parcela</th>
          <th>Amortização</th>
          <th>Juros</th>
          <th>Saldo Devedor</th>
        </tr>
      </thead>
      <tbody>
  `;
  tabela.forEach(l => {
    html += `
      <tr>
        <td>${l.parcela}</td>
        <td>${brl(l.valor_parcela)}</td>
        <td>${brl(l.amortizacao)}</td>
        <td>${brl(l.juros)}</td>
        <td>${brl(l.saldo_devedor)}</td>
      </tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById("tabela_wrap").innerHTML = html;
}

function gerarGrafico(tabela, tipo) {
  const x = tabela.map(l => l.parcela);
  const amort = tabela.map(l => l.amortizacao);
  const juros = tabela.map(l => l.juros);
  const saldo = tabela.map(l => l.saldo_devedor);

  const data = [
    {
      x, y: amort, type: "bar", name: "Amortização",
      text: amort.map(v => brl(v)), textposition: "auto"
    },
    {
      x, y: juros, type: "bar", name: "Juros",
      text: juros.map(v => brl(v)), textposition: "auto"
    },
    {
      x, y: saldo, type: "scatter", mode: "lines+markers+text", name: "Saldo Devedor",
      text: saldo.map(v => brl(v)), textposition: "top center"
    }
  ];

  const layout = {
    title: `Evolução da Tabela ${tipo}`,
    xaxis: { title: "Parcela" },
    yaxis: { title: "Valor (R$)", showticklabels: false }, // sem rótulos no eixo Y conforme sua preferência
    barmode: "stack",
    margin: { t: 40, r: 10, b: 40, l: 10 }
  };

  Plotly.newPlot("grafico", data, layout, {displaylogo:false});
}

// ===== Eventos (handlers) =====
function onConverterTaxa() {
  const taxa = parseFloat(document.getElementById("taxa_equiv").value || "0");
  const de = document.getElementById("de_periodo").value;
  const para = document.getElementById("para_periodo").value;
  const res = converterTaxaEquivalente(taxa, de, para);
  renderResultado("res_taxa", `<strong>Taxa equivalente:</strong> ${res.toFixed(6).replace('.', ',')}% (${de} → ${para})`);
}

function onJurosSimples() {
  const C = parseFloat(document.getElementById("js_capital").value || "0");
  const taxa = parseFloat(document.getElementById("js_taxa").value || "0");
  const de = document.getElementById("js_de").value;
  const para = document.getElementById("js_para").value;
  const n = parseFloat(document.getElementById("js_tempo").value || "0");
  const taxaEquiv = converterTaxaEquivalente(taxa, de, para);
  const { J, M } = jurosSimples(C, taxaEquiv, n);
  renderResultado("res_js", `Juros: <strong>${brl(J)}</strong> — Montante: <strong>${brl(M)}</strong> (taxa convertida: ${taxaEquiv.toFixed(6).replace('.', ',')}%)`);
}

function onJurosCompostos() {
  const C = parseFloat(document.getElementById("jc_capital").value || "0");
  const taxa = parseFloat(document.getElementById("jc_taxa").value || "0");
  const de = document.getElementById("jc_de").value;
  const para = document.getElementById("jc_para").value;
  const n = parseFloat(document.getElementById("jc_tempo").value || "0");
  const taxaEquiv = converterTaxaEquivalente(taxa, de, para);
  const { J, M } = jurosCompostos(C, taxaEquiv, n);
  renderResultado("res_jc", `Juros: <strong>${brl(J)}</strong> — Montante: <strong>${brl(M)}</strong> (taxa convertida: ${taxaEquiv.toFixed(6).replace('.', ',')}%)`);
}

function onValorPresente() {
  const VF = parseFloat(document.getElementById("vp_vf").value || "0");
  const taxa = parseFloat(document.getElementById("vp_taxa").value || "0");
  const de = document.getElementById("vp_de").value;
  const para = document.getElementById("vp_para").value;
  const n = parseFloat(document.getElementById("vp_tempo").value || "0");
  const taxaEquiv = converterTaxaEquivalente(taxa, de, para);
  const VP = valorPresente(VF, taxaEquiv, n);
  renderResultado("res_vp", `Valor Presente: <strong>${brl(VP)}</strong> (taxa convertida: ${taxaEquiv.toFixed(6).replace('.', ',')}%)`);
}

function onValorFuturo() {
  const VP = parseFloat(document.getElementById("vf_vp").value || "0");
  const taxa = parseFloat(document.getElementById("vf_taxa").value || "0");
  const de = document.getElementById("vf_de").value;
  const para = document.getElementById("vf_para").value;
  const n = parseFloat(document.getElementById("vf_tempo").value || "0");
  const taxaEquiv = converterTaxaEquivalente(taxa, de, para);
  const VF = valorFuturo(VP, taxaEquiv, n);
  renderResultado("res_vf", `Valor Futuro: <strong>${brl(VF)}</strong> (taxa convertida: ${taxaEquiv.toFixed(6).replace('.', ',')}%)`);
}

let ultimaTabela = []; // para exportação
function onTabela(tipo) {
  const P = parseFloat(document.getElementById("fin_valor").value || "0");
  const taxa = parseFloat(document.getElementById("fin_taxa").value || "0");
  const de = document.getElementById("fin_de").value;
  const para = document.getElementById("fin_para").value;
  const n = parseInt(document.getElementById("fin_n").value || "0", 10);

  const taxaEquiv = converterTaxaEquivalente(taxa, de, para);

  const tabela = (tipo === "PRICE")
    ? tabelaPRICE(P, taxaEquiv, n)
    : tabelaSAC(P, taxaEquiv, n);

  ultimaTabela = tabela;
  renderTabela(tabela);
  gerarGrafico(tabela, tipo);
}

// ===== Exportar CSV =====
function baixarCSV() {
  if (!ultimaTabela || ultimaTabela.length === 0) {
    alert("Gere a tabela primeiro (PRICE ou SAC).");
    return;
  }
  const header = ["Parcela", "Valor Parcela", "Amortização", "Juros", "Saldo Devedor"];
  const linhas = ultimaTabela.map(l => [
    l.parcela, l.valor_parcela, l.amortizacao, l.juros, l.saldo_devedor
  ]);

  const csv = [header, ...linhas]
    .map(row => row.join(";"))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tabela_financiamento.csv";
  a.click();

  URL.revokeObjectURL(url);
}