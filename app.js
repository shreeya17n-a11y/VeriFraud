"use strict";















const byId = id => document.getElementById(id);







const text = (value, fallback = "Not available") =>







    value === null || value === undefined || value === "" || String(value).toLowerCase() === "nan"







        ? fallback : String(value);







const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({







    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"







}[ch]));







let currentTransactionData = null;







async function getJSON(url) {







    const response = await fetch(url);







    if (!response.ok) throw new Error(`${url} returned ${response.status}`);







    return response.json();







}















function features(value) {







    if (!value) return [];







    try {







        const parsed = typeof value === "string" ? JSON.parse(value) : value;







        if (Array.isArray(parsed)) return parsed;







    } catch (_) { /* Keep a readable fallback for older artifacts. */ }







    return String(value).split(";").map(item => {









        const match = item.trim().match(/^(.+?)\s*\(?([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)\)?$/);









        return match ? { feature: match[1], shap_value: Number(match[2]) } : null;







    }).filter(Boolean);







}
















function friendlyFeatureLabel(name) {
    const raw = String(name ?? "").trim();
    const base = {
        "num__step": "Transaction time (step)",
        "num__amount": "Transaction amount",
        "num__oldbalanceOrg": "Sender's balance before transaction",
        "num__oldbalanceDest": "Receiver's balance before transaction",
        "step": "Transaction time (step)",
        "amount": "Transaction amount",
        "oldbalanceOrg": "Sender's balance before transaction",
        "oldbalanceDest": "Receiver's balance before transaction",
        "type": "Transaction type",
        "TransactionIndex": "Transaction record number",
        "Fraud_Probability": "Estimated fraud probability",
        "Prediction": "Model decision",
        "Threshold": "Decision threshold",
        "Actual_Fraud": "Dataset fraud label"
    };
    if (base[raw]) return base[raw];
    const category = raw.match(/^(?:cat__)?type[_]{1,2}(.+)$/i);
    if (category) return "Transaction type: " + category[1].replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    return raw.replace(/^num__|^cat__/, "").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

function friendlyExplanation(value) {
    let result = String(value ?? "No saved explanation is available.");
    const replacements = [
        ["num__oldbalanceOrg", "sender's balance before the transaction"],
        ["num__oldbalanceDest", "receiver's balance before the transaction"],
        ["num__amount", "transaction amount"],
        ["num__step", "transaction time"],
        ["cat__type_CASH_OUT", "cash-out transaction type"],
        ["cat__type_CASH_IN", "cash-in transaction type"],
        ["cat__type_PAYMENT", "payment transaction type"],
        ["cat__type_TRANSFER", "transfer transaction type"],
        ["cat__type_DEBIT", "debit transaction type"]
    ];
    replacements.forEach(([key, label]) => {
        result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), label);
    });
    return result;
}

function renderFeatures(id, value, kind) {







    const container = byId(id);







    if (!container) return;







    container.replaceChildren();







    const items = features(value);







    if (!items.length) { container.textContent = "No feature data available."; return; }







    items.forEach(item => {







        const row = document.createElement("div");







        row.className = `feature-row ${kind}`;







        const name = document.createElement("span");







        name.className = "feature-name";







        name.textContent = friendlyFeatureLabel(item.feature ?? item.name ?? "Feature");







        const amount = Number(item.shap_value ?? item.value ?? 0);







        const score = document.createElement("span");







        score.className = `feature-value ${kind}`;







        score.textContent = `${amount >= 0 ? "+" : ""}${amount.toFixed(4)}`;







        row.append(name, score);







        container.append(row);







    });







}















async function loadTransactions() {







    const select = byId("transactionSelect");







    try {







        const transactions = await getJSON("/api/transactions");







        const fraud = transactions.filter(item => item.Prediction === "FRAUD");







        const legitimate = transactions.filter(item => item.Prediction === "LEGITIMATE");







        select.replaceChildren();







        [["FRAUD", fraud], ["LEGITIMATE", legitimate]].forEach(([label, items]) => {







            const group = document.createElement("optgroup");







            group.label = `${label === "FRAUD" ? "FRAUD" : "NON-FRAUD"} TRANSACTIONS (${items.length})`;







            items.forEach(item => {







                const option = document.createElement("option");







                option.value = item.TransactionID;







                option.textContent = `${item.TransactionID} — ${item.Prediction} · ${(Number(item.Fraud_Probability) * 100).toFixed(2)}%`;







                group.append(option);







            });







            select.append(group);







        });







        byId("caseCount").textContent = transactions.length;







        select.addEventListener("change", () => loadTransaction(select.value));







        if (transactions.length) { select.value = transactions[0].TransactionID; await loadTransaction(select.value); }







    } catch (error) { select.innerHTML = '<option value="">Unable to load transactions</option>'; console.error(error); }







}















function readable(value) {







    const labels = {







        "P1-CRITICAL": "Priority 1 · Urgent review",







        "P2-HIGH": "Priority 2 · High review",







        "HIGH": "High risk indicator",







        "ELEVATED": "Elevated risk indicator",







        "OPEN": "Waiting for review",







        "CRITICAL": "Large changes detected",







        "WARNING": "Some changes detected",







        "NO_MAJOR_DRIFT": "No major change detected",







        "CRITICAL_DRIFT": "Large change",







        "WARNING_DRIFT": "Some change"







    };















    const key = String(value ?? "").trim().toUpperCase();







    if (labels[key]) return labels[key];















    return String(value ?? "Not available")







        .replaceAll("_", " ")







        .toLowerCase()







        .replace(/\b\w/g, letter => letter.toUpperCase());







}















function friendlyFeature(value) {







    const labels = {







        "step": "Transaction time",







        "amount": "Transaction amount",







        "oldbalanceOrg": "Sender balance",







        "oldbalanceDest": "Receiver balance",







        "type": "Transaction type"







    };







    return labels[value] ?? readable(value);







}















async function loadMonitoring() {







    try {







        const data = await getJSON("/api/monitoring");







        const matrix = data.confusion_matrix;







        const matrixBody = byId("confusionTable").querySelector("tbody");















        if (matrix) {







            byId("confusionMeta").textContent =







                `${matrix.model} · ${readable(matrix.strategy)} · threshold ${matrix.threshold ?? "—"} · ${Number(matrix.evaluated_transactions).toLocaleString()} saved test predictions · source ${matrix.source}`;







            matrixBody.innerHTML = matrix.rows.map(row => `







                <tr>







                    <th scope="row">${esc(row.actual)}</th>







                    <td>${Number(row.LEGITIMATE).toLocaleString()}</td>







                    <td>${Number(row.FRAUD).toLocaleString()}</td>







                </tr>







            `).join("");







        } else {







            byId("confusionMeta").textContent =







                "Confusion-matrix counts are not available in the saved model comparison CSV.";







            matrixBody.innerHTML = '<tr><td colspan="3">No saved confusion-matrix counts are available.</td></tr>';







        }















        const model = data.model_comparison;







        const results = data.model_results ?? [];







        const headers = [







            "Model", "Strategy", "Average_Precision", "Precision", "Recall", "F1"







        ].filter(key => results.some(item => key in item));







        const best = model?.best_average_precision ?? {};







        byId("modelMeta").textContent = model







            ? `${model.successful_runs ?? results.length} saved experiments · strongest average precision: ${best.Model ?? "unavailable"} / ${readable(best.Strategy ?? "unavailable")} (${Number(best.Average_Precision ?? 0).toFixed(3)})`







            : `${results.length} result rows loaded from the saved model comparison CSV.`;







        byId("modelTable").querySelector("thead").innerHTML = headers.length







            ? `<tr>${headers.map(key => `<th>${esc(key.replaceAll("_", " "))}</th>`).join("")}</tr>`







            : "";







        byId("modelTable").querySelector("tbody").innerHTML = results.length







            ? results.map(item => `<tr>${headers.map(key => {







                const value = item[key];







                const display = typeof value === "number" &&







                    ["Average_Precision", "Precision", "Recall", "F1"].includes(key)







                    ? value.toFixed(3)







                    : key === "Model" && value === "LogisticRegression"







                        ? "Logistic Regression"







                        : key === "Strategy" ? readable(value) : value ?? "—";







                return `<td>${esc(display)}</td>`;







            }).join("")}</tr>`).join("")







            : '<tr><td>No saved model comparison rows are available.</td></tr>';







    } catch (error) {







        byId("confusionMeta").textContent = "Saved evaluation results could not be loaded.";







        byId("confusionTable").querySelector("tbody").innerHTML =







            '<tr><td colspan="3">Evaluation data is unavailable.</td></tr>';







        byId("modelMeta").textContent = "Model comparison results could not be loaded.";







        console.error("Unable to load monitoring artifacts:", error);







    }







}















function parsePlanItems(value) {



    if (Array.isArray(value)) return value;



    if (!value) return [];



    try {



        const parsed = JSON.parse(value);



        return Array.isArray(parsed) ? parsed : [];



    } catch (_) {



        return String(value).split(";").map(item => item.trim()).filter(Boolean);



    }



}







function investigationPlanHtml(data) {



    const renderList = (value, emptyText) => {



        const items = parsePlanItems(value);



        if (!items.length) return `<li>${esc(emptyText)}</li>`;



        return items.map(item => `<li>${esc(item)}</li>`).join("");



    };



    const priority = text(data.Investigation_Priority, "Priority not available");



    const summary = text(



        data.Investigation_Plan_Summary,



        "No saved investigation plan is available. Use transaction evidence and institutional review procedures."



    );







    return `



        <section class="investigation-plan">



            <h2>Transaction-Specific AI Investigation Plan</h2>



            <p><strong>Review priority:</strong> ${esc(priority)}</p>



            <p>${esc(summary)}</p>



            <h3>1. Immediate investigation steps</h3>



            <ul>${renderList(data.Investigation_Immediate_Steps, "Confirm the transaction using authoritative records before deciding.")}</ul>



            <h3>2. Additional checks</h3>



            <ul>${renderList(data.Investigation_Additional_Checks, "No additional checks were saved. Follow the institution's standard review procedure.")}</ul>



            <h3>3. Escalation conditions</h3>



            <ul>${renderList(data.Investigation_Escalation_Conditions, "Escalate only if further evidence or institutional policy requires it.")}</ul>



            <h3>4. Expected outcome</h3>



            <p>${esc(text(data.Investigation_Expected_Outcome, "A documented human review decision supported by source records."))}</p>



            <h3>5. Investigator checklist</h3>



            <ul>${renderList(data.Investigation_Checklist, "Record the evidence reviewed and document the final human decision.")}</ul>



        </section>



    `;



}







function featureLabel(name) {







    const labels = {







        "num__step": "Transaction time",







        "num__amount": "Transaction amount",







        "num__oldbalanceOrg": "Sender's previous balance",







        "num__oldbalanceDest": "Receiver's previous balance"







    };















    if (labels[name]) return labels[name];















    if (String(name).startsWith("cat__type_")) {







        const type = String(name).replace("cat__type_", "").replaceAll("_", " ");







        return `Transaction type: ${type.toLowerCase()}`;







    }















    return String(name)







        .replace(/^num__|^cat__/, "")







        .replaceAll("_", " ");







}















function renderReportFactors(elementId, rawFeatures, direction) {







    const list = byId(elementId);







    const items = features(rawFeatures).slice(0, 3);















    if (!items.length) {







        list.innerHTML = "<li>No feature details are available.</li>";







        return;







    }















    list.innerHTML = items.map(item => {







        const value = Number(item.shap_value ?? item.value ?? 0);







        const sign = value > 0 ? "+" : "";







        return `<li>







            <span>${esc(featureLabel(item.feature ?? item.name ?? "Feature"))}</span>







            <strong>${direction} (${sign}${value.toFixed(3)})</strong>







        </li>`;







    }).join("");







}
















function parseAutonomousItems(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
    catch (_) { return []; }
}

function renderAutonomousInvestigation(data) {
    const put = (id, value, fallback="Not available") => {
        const node = byId(id);
        if (node) node.textContent = text(value, fallback);
    };
    const risk = String(data.Autonomous_Risk_Level ?? "NOT_AVAILABLE").toUpperCase();
    const outcome = String(data.Autonomous_Investigation_Status ?? "NOT_AVAILABLE").toUpperCase();
    put("autonomousRisk", readable(risk));
    put("autonomousChecksPassed", data.Autonomous_Checks_Passed, "0");
    put("autonomousChecksFailed", data.Autonomous_Checks_Failed_or_Unresolved, "0");
    put("autonomousOutcome", readable(outcome));
    put("autonomousVerification", readable(data.Autonomous_Explanation_Verification));
    put("autonomousRepair", readable(data.Autonomous_Repair_Status));
    put("autonomousTimestamp", data.Autonomous_Investigation_Timestamp);
    put("autonomousConclusion", data.Autonomous_Final_Conclusion, "No conclusion is available.");
    put("autonomousScope", data.Autonomous_Scope_Note,
        "Automated analysis of the supplied PaySim data and saved model evidence only.");
    const badge = byId("autonomousStatusBadge");
    if (badge) {
        badge.textContent = readable(outcome);
        badge.className = "autonomous-status " + (outcome === "NO_ISSUE_DETECTED" ? "is-ok" : "is-review");
    }
    const logs = parseAutonomousItems(data.Autonomous_Action_Log);
    put("autonomousCheckCount", logs.length ? `(${logs.length})` : "");
    const logNode = byId("autonomousActionLog");
    if (logNode) {
        logNode.replaceChildren();
        if (!logs.length) logNode.textContent = "No recorded checks are available.";
        logs.forEach(item => {
            const row = document.createElement("div");
            row.className = "autonomous-check-row";
            const name = document.createElement("strong");
            name.textContent = friendlyFeatureLabel(item.action ?? "Analytical check").replaceAll(" ", " ");
            const state = document.createElement("span");
            state.className = "autonomous-check-state";
            state.textContent = readable(item.status ?? "NOT AVAILABLE");
            const detail = document.createElement("p");
            detail.textContent = text(item.details, "");
            row.append(name, state, detail);
            logNode.append(row);
        });
    }
    const findings = parseAutonomousItems(data.Autonomous_Unresolved_Findings);
    const findingsNode = byId("autonomousFindings");
    if (findingsNode) {
        findingsNode.replaceChildren();
        if (!findings.length) findingsNode.textContent = "No unresolved analytical findings.";
        else {
            const list = document.createElement("ul");
            findings.forEach(item => {
                const li = document.createElement("li");
                li.textContent = typeof item === "string" ? item : JSON.stringify(item);
                list.append(li);
            });
            findingsNode.append(list);
        }
    }
}

async function loadTransaction(id) {







    if (!id) return;















    try {







        const data = await getJSON(`/api/transaction/${encodeURIComponent(id)}`);







        currentTransactionData = data;
        renderAutonomousInvestigation(data);







        byId("downloadTransactionReport").disabled = false;







        const probability = Math.max(







            0,







            Math.min(1, Number(data.Fraud_Probability) || 0)







        );







        const threshold = Number(data.Threshold ?? data.Decision_Threshold_Used);







        const prediction = text(data.Prediction, "UNKNOWN").toUpperCase();







        const percent = value => `${(value * 100).toFixed(2)}%`;















        byId("transactionId").textContent = data.TransactionID ?? id;







        byId("caseId").textContent = `VF-${data.TransactionID ?? id}`;







        byId("probability").textContent = percent(probability);







        byId("probabilityBar").style.width = percent(probability);







        byId("modelDecision").textContent = prediction;















        const badge = byId("predictionBadge");







        badge.textContent = prediction;







        badge.className =







            `badge ${prediction === "FRAUD" ? "badge-fraud" : "badge-review"}`;















        byId("reportDecision").textContent =







            prediction === "FRAUD" ? "Flagged for review" : "Not flagged";







        byId("reportProbability").textContent = percent(probability);







        byId("reportThreshold").textContent =







            Number.isFinite(threshold) ? percent(threshold) : "Not available";















        const amount = Number(data.amount);







        byId("reportContext").textContent =







            `${text(data.type, "Transaction type")} · amount ${







                Number.isFinite(amount)







                    ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 })







                    : "not available"







            }`;















        byId("transactionReportSummary").textContent =







            prediction === "FRAUD"







                ? `The model flagged this transaction because its estimated fraud probability (${percent(probability)}) meets or exceeds the saved decision threshold (${Number.isFinite(threshold) ? percent(threshold) : "unavailable"}).`







                : `The model did not flag this transaction because its estimated fraud probability (${percent(probability)}) is below the saved decision threshold (${Number.isFinite(threshold) ? percent(threshold) : "unavailable"}). This does not prove the transaction is legitimate.`;















        renderFeatures("positiveFeatures", data.Top_Positive_Features, "positive");







        renderFeatures("negativeFeatures", data.Top_Negative_Features, "negative");







        renderReportFactors(







            "reportPositiveFactors",







            data.Top_Positive_Features,







            "increases score"







        );







        renderReportFactors(







            "reportNegativeFactors",







            data.Top_Negative_Features,







            "decreases score"







        );















        byId("explanationText").textContent =







            friendlyExplanation(text(data.Explanation, "No saved AI explanation is available for this transaction."))







                .replace(/^Investigation Note:\s*/i, "");















        const status = text(data.Verification_Status, "NOT VERIFIED").toUpperCase();







        byId("verificationStatus").textContent = status.replaceAll("_", " ");







        byId("verificationReason").textContent =







            text(data.Verification_Reason, "No verification reason available.");







        byId("verificationBox").className =







            `verification-box ${status === "FAITHFUL" ? "verification-faithful" : "verification-review"}`;















    } catch (error) {







        console.error("Unable to load transaction report:", error);







        byId("transactionReportSummary").textContent =







            "The selected transaction report could not be loaded.";







    }







}







loadTransactions();







loadMonitoring();








function downloadSelectedTransactionReport(monitoring) {
    const data = currentTransactionData;
    if (!data) return;

    const txId = text(data.TransactionID, "unknown");
    const probability = Math.max(0, Math.min(1, Number(data.Fraud_Probability) || 0));
    const threshold = Number(data.Threshold ?? data.Decision_Threshold_Used);
    const prediction = String(data.Prediction ?? "UNKNOWN").toUpperCase();
    const percent = n => `${(n * 100).toFixed(2)}%`;
    const amount = Number(data.amount);
    const risk = text(data.Autonomous_Risk_Level, "Not available");
    const outcome = text(data.Autonomous_Investigation_Status, "Not available");
    const checks = parseAutonomousItems(data.Autonomous_Action_Log);
    const findings = parseAutonomousItems(data.Autonomous_Unresolved_Findings);
    const positive = features(data.Top_Positive_Features).slice(0, 3);
    const negative = features(data.Top_Negative_Features).slice(0, 3);

    const factorRows = (items, direction) => items.length
        ? items.map(item => `<li><span>${esc(friendlyFeatureLabel(item.feature ?? item.name ?? "Feature"))}</span><strong>${direction} · ${Number(item.shap_value ?? item.value ?? 0).toFixed(3)}</strong></li>`).join("")
        : "<li>No feature evidence was saved.</li>";

    const checkRows = checks.map(item => `
        <tr><td>${esc(friendlyFeatureLabel(item.action ?? "Analytical check"))}</td>
        <td>${esc(readable(item.status ?? "Not available"))}</td>
        <td>${esc(item.details ?? "")}</td></tr>`).join("");

    const narrative = friendlyExplanation(text(data.Explanation, "No saved AI explanation is available."));
    const scope = text(data.Autonomous_Scope_Note,
        "This run analysed the supplied PaySim data and saved model evidence. No external banking systems or payment actions were accessed.");

    const report = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VeriFraud · ${esc(txId)}</title>
<style>
:root{--navy:#172033;--ink:#26364b;--muted:#68778b;--line:#e2e8f0;--bg:#f5f7fa;--blue:#315f91}
*{box-sizing:border-box}body{margin:0;background:var(--bg);font:14px/1.55 Arial,sans-serif;color:var(--ink)}
.report{max-width:900px;margin:28px auto;padding:0 20px}
header{background:var(--navy);color:#fff;padding:24px 28px;border-radius:12px}
header h1{margin:0 0 4px;font-size:25px}header p{margin:0;color:#cbd5e1}
section{background:#fff;border:1px solid var(--line);border-radius:10px;padding:20px 22px;margin:16px 0}
h2{font-size:17px;color:var(--navy);margin:0 0 14px}h3{font-size:14px;margin:18px 0 8px;color:var(--navy)}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.kpi{background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:12px}
.kpi span,.detail span{display:block;color:var(--muted);font-size:11px;margin-bottom:5px}
.kpi strong{font-size:18px;color:var(--navy)}
.details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.detail{padding:10px 0;border-bottom:1px solid var(--line)}.detail strong{font-size:13px}
.factor-list{list-style:none;padding:0;margin:0}.factor-list li{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid var(--line)}
.factor-list strong{white-space:nowrap;font-size:12px;color:var(--blue)}
.narrative{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.4px}
.pill{display:inline-block;padding:5px 9px;border-radius:999px;background:#eef3f8;color:#34465c;font-weight:700;font-size:11px}
.scope{font-size:12px;color:var(--muted);margin:0}
footer{text-align:center;color:var(--muted);font-size:11px;padding:8px 0 24px}
@media(max-width:650px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.details{grid-template-columns:1fr}.factor-list li{display:block}.factor-list strong{display:block;margin-top:3px}}
@media print{body{background:#fff}.report{margin:0 auto;padding:0}section,header{break-inside:avoid;box-shadow:none}}
</style></head>
<body><main class="report">
<header><h1>VeriFraud Transaction Report</h1><p>Transaction ${esc(txId)} · Automated investigation summary</p></header>

<section><h2>Decision overview</h2>
<div class="kpis">
<div class="kpi"><span>Model decision</span><strong>${esc(prediction)}</strong></div>
<div class="kpi"><span>Fraud probability</span><strong>${percent(probability)}</strong></div>
<div class="kpi"><span>Decision threshold</span><strong>${Number.isFinite(threshold) ? percent(threshold) : "—"}</strong></div>
<div class="kpi"><span>Autonomous risk</span><strong>${esc(readable(risk))}</strong></div>
</div>
<div class="details" style="margin-top:12px">
<div class="detail"><span>Transaction type</span><strong>${esc(readable(data.type ?? "Not available"))}</strong></div>
<div class="detail"><span>Transaction amount</span><strong>${Number.isFinite(amount) ? esc(amount.toLocaleString(undefined,{maximumFractionDigits:2})) : "Not available"}</strong></div>
<div class="detail"><span>Investigation outcome</span><strong>${esc(readable(outcome))}</strong></div>
<div class="detail"><span>Explanation verification</span><strong>${esc(readable(data.Autonomous_Explanation_Verification))}</strong></div>
</div></section>

<section><h2>Key model evidence</h2>
<div class="details">
<div><h3>Factors increasing the fraud score</h3><ul class="factor-list">${factorRows(positive,"Increases")}</ul></div>
<div><h3>Factors decreasing the fraud score</h3><ul class="factor-list">${factorRows(negative,"Decreases")}</ul></div>
</div></section>

<section><h2>AI explanation</h2><p class="narrative">${esc(narrative)}</p></section>

<section><h2>Autonomous investigation</h2>
<div class="kpis">
<div class="kpi"><span>Checks passed</span><strong>${esc(data.Autonomous_Checks_Passed ?? "—")}</strong></div>
<div class="kpi"><span>Failed / unresolved</span><strong>${esc(data.Autonomous_Checks_Failed_or_Unresolved ?? "—")}</strong></div>
<div class="kpi"><span>Repair status</span><strong>${esc(readable(data.Autonomous_Repair_Status))}</strong></div>
<div class="kpi"><span>Check records</span><strong>${checks.length}</strong></div>
</div>
${checks.length ? `<h3>Check results</h3><table><thead><tr><th>Check</th><th>Result</th><th>Details</th></tr></thead><tbody>${checkRows}</tbody></table>` : ""}
<h3>Unresolved findings</h3>
${findings.length ? `<ul>${findings.map(item=>`<li>${esc(typeof item==="string"?item:JSON.stringify(item))}</li>`).join("")}</ul>` : "<p>No unresolved analytical findings were recorded.</p>"}
<h3>Agent conclusion</h3><p>${esc(text(data.Autonomous_Final_Conclusion,"No conclusion was saved."))}</p>
</section>

<section><h2>Run scope</h2><p class="scope">${esc(scope)}</p></section>
<footer>VeriFraud · Explainable Fraud Detection Research System</footer>
</main></body></html>`;

    const blob = new Blob([report], {type:"text/html;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `verifraud-transaction-${txId}-report.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

byId("downloadTransactionReport")







    ?.addEventListener("click", async () => {







        const selectedId = byId("transactionSelect").value;















        if (!selectedId) {







            alert("Select a transaction first.");







            return;







        }















        try {







            const [transaction, monitoring] = await Promise.all([







                getJSON(`/api/transaction/${encodeURIComponent(selectedId)}`),







                getJSON("/api/monitoring")







            ]);







            currentTransactionData = transaction;







            downloadSelectedTransactionReport(monitoring);







        } catch (error) {







            console.error("Could not download the transaction report:", error);







            alert("The report could not be downloaded. Please try again.");







        }







    });
