
from flask import Flask, jsonify, render_template
from pathlib import Path
import pandas as pd
import json
import math

app = Flask(__name__)

# ============================================================
# FILE PATHS
# ============================================================

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / "outputs"

SHAP_FILE = OUT / "paysim_transaction_shap_explanations.csv"
LLM_FILE = OUT / "paysim_llm_fraud_explanations.csv"
VERIFY_FILE = OUT / "paysim_faithfulness_verification.csv"
INVESTIGATION_FILE = OUT / "paysim_investigation_results.csv"
AUTONOMOUS_FILE = OUT / "paysim_autonomous_investigation_results.csv"
CASES_FILE = OUT / "paysim_cases.csv"
CASE_AUDIT_FILE = OUT / "paysim_case_audit.csv"
DRIFT_FILE = OUT / "paysim_drift_summary.json"
MODEL_FILE = OUT / "paysim_model_comparison_summary.json"
MODEL_RESULTS_FILE = OUT / "paysim_model_comparison.csv"
REPORT_FILE = OUT / "paysim_unified_monitoring_report.md"


# ============================================================
# SAFE FILE LOADING
# ============================================================

def read_csv(path):
    try:
        if path.exists():
            return pd.read_csv(path)
    except (OSError, pd.errors.ParserError, UnicodeDecodeError) as error:
        app.logger.error("Could not read %s: %s", path, error)

    return pd.DataFrame()


def read_json(path):
    if not path.exists():
        return None

    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError) as error:
        app.logger.error("Could not read %s: %s", path, error)
        return None


# ============================================================
# SAFE JSON CONVERSION
# ============================================================

def json_safe(value):
    if value is None:
        return None

    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}

    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value]

    if hasattr(value, "item"):
        try:
            value = value.item()
        except (ValueError, AttributeError):
            pass

    if value is None:
        return None

    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    if isinstance(value, Path):
        return str(value)

    return value


def clean_value(value, default=None):
    value = json_safe(value)

    if value is None:
        return default

    if isinstance(value, str):
        value = value.strip()

        if value.lower() in ("", "nan", "none", "null"):
            return default

    return value


def records(df):
    if df.empty:
        return []

    clean_df = df.astype(object).where(pd.notna(df), None)

    return [
        {
            str(key): json_safe(value)
            for key, value in record.items()
        }
        for record in clean_df.to_dict("records")
    ]


def prediction_label(row):
    """Return a normalized decision, honoring the row's saved threshold."""
    probability = clean_value(row.get("Fraud_Probability"))
    threshold = clean_value(row.get("Threshold"))
    if threshold is None:
        threshold = clean_value(row.get("Decision_Threshold_Used"))
    try:
        if probability is not None and threshold is not None:
            return "FRAUD" if float(probability) >= float(threshold) else "LEGITIMATE"
    except (TypeError, ValueError):
        pass

    raw = str(clean_value(row.get("Prediction"), "UNKNOWN")).strip().upper()
    if raw in {"FRAUD", "1", "TRUE", "YES"}:
        return "FRAUD"
    if raw in {"LEGITIMATE", "NOT FRAUD", "NON-FRAUD", "NON FRAUD", "0", "FALSE", "NO"}:
        return "LEGITIMATE"
    return "UNKNOWN"


# ============================================================
# LOAD AND MERGE TRANSACTION DATA
# ============================================================

def transaction_data():
    shap = read_csv(SHAP_FILE)
    llm = read_csv(LLM_FILE)
    verify = read_csv(VERIFY_FILE)
    investigation = read_csv(INVESTIGATION_FILE)
    autonomous = read_csv(AUTONOMOUS_FILE)

    if shap.empty:
        return pd.DataFrame()

    if "TransactionIndex" not in shap.columns:
        app.logger.error(
            "TransactionIndex is missing from %s", SHAP_FILE
        )
        return pd.DataFrame()

    df = shap.copy()
    df["TransactionIndex"] = df["TransactionIndex"].astype(str)

    for other in (llm, verify, investigation, autonomous):
        if other.empty or "TransactionIndex" not in other.columns:
            continue

        extra = other.copy()
        extra["TransactionIndex"] = extra["TransactionIndex"].astype(str)

        # Do not overwrite the SHAP data or previously merged fields.
        keep = ["TransactionIndex"] + [
            column
            for column in extra.columns
            if column != "TransactionIndex"
            and column not in df.columns
        ]

        if len(keep) == 1:
            continue

        extra = extra[keep].drop_duplicates(
            subset=["TransactionIndex"],
            keep="first"
        )

        df = df.merge(
            extra,
            on="TransactionIndex",
            how="left",
            validate="one_to_one"
        )

    return df


# ============================================================
# HOME PAGE
# ============================================================

@app.route("/")
def home():
    return render_template("index.html")


# ============================================================
# ALL TRANSACTIONS
# ============================================================

@app.route("/api/transactions")
def transactions_api():
    df = transaction_data()
    result = []

    if not df.empty:
        for _, row in df.iterrows():
            try:
                probability = float(
                    clean_value(row.get("Fraud_Probability"), 0)
                )
                if not math.isfinite(probability):
                    probability = 0.0
            except (TypeError, ValueError):
                probability = 0.0

            result.append({
                "TransactionID": str(clean_value(
                    row.get("TransactionIndex", row.get("TransactionID")), ""
                )),
                "Prediction": prediction_label(row),
                "Fraud_Probability": probability,
                "Threshold": clean_value(
                    row.get("Threshold", row.get("Decision_Threshold_Used"))
                )
            })

    return jsonify(result)


# ============================================================
# SINGLE TRANSACTION DETAILS
# ============================================================

@app.route("/api/transaction/<transaction_id>")
def transaction_api(transaction_id):
    df = transaction_data()

    if df.empty or "TransactionIndex" not in df.columns:
        return jsonify({
            "error": "PaySim transaction data is unavailable"
        }), 404

    matches = df[
        df["TransactionIndex"].astype(str) == str(transaction_id)
    ]

    if matches.empty:
        return jsonify({
            "error": "Transaction not found"
        }), 404

    row = matches.iloc[0]

    def value(column, default=None):
        return clean_value(row.get(column), default)

    result = {
        "TransactionID": str(
            value("TransactionIndex", transaction_id)
        ),
        "step": value("step"),
        "type": value("type"),
        "amount": value("amount"),
        "oldbalanceOrg": value("oldbalanceOrg"),
        "oldbalanceDest": value("oldbalanceDest"),
        "Actual_Fraud": value("Actual_Fraud"),
        "Prediction": prediction_label(row),
        "Fraud_Probability": value("Fraud_Probability", 0),
        "Threshold": value("Threshold", 0.95),
        "Top_Positive_Features": value(
            "Top_Positive_Features", "[]"
        ),
        "Top_Negative_Features": value(
            "Top_Negative_Features", "[]"
        ),
        "Explanation": value(
            "LLM_Explanation",
            "No generated explanation available."
        ),
        "LLM_Status": value("LLM_Status"),
        "Verification_Status": value(
            "Verification_Status", "NOT VERIFIED"
        ),
        "Verification_Reason": value(
            "Reason", "No verification reason available."
        ),
        "Feature_Support": value("Feature_Support"),
        "Direction_Consistency": value("Direction_Consistency"),
        "Supported_Features_Mentioned": value(
            "Supported_Features_Mentioned"
        ),
        "Unsupported_Features_Mentioned": value(
            "Unsupported_Features_Mentioned"
        ),
        "Direction_Mismatches": value("Direction_Mismatches"),
        "Original_Verification_Status": value(
            "Original_Verification_Status"
        ),
        "Repair_Status": value("Repair_Status"),
        "Risk_Level": value("Risk_Level"),
        "Explanation_Action": value("Explanation_Action"),
        "Recommended_Action": value("Recommended_Action"),
        "Case_Disposition": value("Case_Disposition"),
        "Escalation_Recommended": value("Escalation_Recommended"),
        "Decision_Threshold_Used": value("Decision_Threshold_Used"),
        "Investigation_Priority": value("Investigation_Priority"),
        "Investigation_Immediate_Steps": value("Investigation_Immediate_Steps", "[]"),
        "Investigation_Additional_Checks": value("Investigation_Additional_Checks", "[]"),
        "Investigation_Escalation_Conditions": value("Investigation_Escalation_Conditions", "[]"),
        "Investigation_Expected_Outcome": value("Investigation_Expected_Outcome"),
        "Investigation_Checklist": value("Investigation_Checklist", "[]"),
        "Investigation_Plan_Summary": value("Investigation_Plan_Summary"),
        "Actual_Fraud": value("Actual_Fraud"),
        "Autonomous_Risk_Level": value("Autonomous_Risk_Level", "NOT_AVAILABLE"),
        "Autonomous_Investigation_Status": value("Autonomous_Investigation_Status", "NOT_AVAILABLE"),
        "Autonomous_Checks_Passed": value("Autonomous_Checks_Passed", 0),
        "Autonomous_Checks_Failed_or_Unresolved": value("Autonomous_Checks_Failed_or_Unresolved", 0),
        "Autonomous_Action_Log": value("Autonomous_Action_Log", "[]"),
        "Autonomous_Unresolved_Findings": value("Autonomous_Unresolved_Findings", "[]"),
        "Autonomous_Final_Conclusion": value("Autonomous_Final_Conclusion", "No autonomous conclusion is available."),
        "Autonomous_Repair_Status": value("Autonomous_Repair_Status", "NOT_AVAILABLE"),
        "Autonomous_Explanation_Verification": value("Autonomous_Explanation_Verification", "NOT_AVAILABLE"),
        "Autonomous_Investigation_Timestamp": value("Autonomous_Investigation_Timestamp"),
        "Autonomous_Scope_Note": value("Autonomous_Scope_Note", "No external banking records or banking operations were accessed.")
    }

    return jsonify({
        key: json_safe(val)
        for key, val in result.items()
    })


# ============================================================
# CASE MANAGEMENT
# ============================================================

@app.route("/api/cases")
def cases_api():
    cases = read_csv(CASES_FILE)
    audit = read_csv(CASE_AUDIT_FILE)

    if not cases.empty and not audit.empty:
        possible_keys = (
            "Case_ID",
            "CaseID",
            "TransactionIndex",
            "TransactionID"
        )

        key = next(
            (
                column for column in possible_keys
                if column in cases.columns
                and column in audit.columns
            ),
            None
        )

        if key:
            audit = audit.drop_duplicates(subset=[key], keep="last")

            cases = cases.merge(
                audit,
                on=key,
                how="left",
                suffixes=("", "_audit")
            )

    return jsonify(records(cases))


# ============================================================
# DRIFT AND MODEL MONITORING
# ============================================================

@app.route("/api/monitoring")
def monitoring_api():
    model_results = read_csv(MODEL_RESULTS_FILE)
    comparison = read_json(MODEL_FILE)
    best = (comparison or {}).get("best_average_precision", {})
    matrix_row = None

    if not model_results.empty:
        if best and {"Model", "Strategy"}.issubset(model_results.columns):
            selected = model_results[
                (model_results["Model"].astype(str) == str(best.get("Model")))
                & (model_results["Strategy"].astype(str) == str(best.get("Strategy")))
            ]
            if not selected.empty:
                matrix_row = selected.iloc[0]

        if matrix_row is None and "Average_Precision" in model_results.columns:
            average_precision = pd.to_numeric(
                model_results["Average_Precision"], errors="coerce"
            )
            if average_precision.notna().any():
                matrix_row = model_results.loc[average_precision.idxmax()]

    confusion_matrix = None
    count_columns = (
        "True_Negatives", "False_Positives", "False_Negatives", "True_Positives"
    )
    if matrix_row is not None and all(
        column in model_results.columns for column in count_columns
    ):
        values = {}
        for column in count_columns:
            try:
                number = float(matrix_row[column])
                values[column] = int(number) if math.isfinite(number) else None
            except (TypeError, ValueError):
                values[column] = None

        if all(value is not None for value in values.values()):
            confusion_matrix = {
                "labels": ["LEGITIMATE", "FRAUD"],
                "rows": [
                    {
                        "actual": "LEGITIMATE",
                        "LEGITIMATE": values["True_Negatives"],
                        "FRAUD": values["False_Positives"]
                    },
                    {
                        "actual": "FRAUD",
                        "LEGITIMATE": values["False_Negatives"],
                        "FRAUD": values["True_Positives"]
                    }
                ],
                "true_negative": values["True_Negatives"],
                "false_positive": values["False_Positives"],
                "false_negative": values["False_Negatives"],
                "true_positive": values["True_Positives"],
                "evaluated_transactions": sum(values.values()),
                "model": clean_value(matrix_row.get("Model"), best.get("Model")),
                "strategy": clean_value(matrix_row.get("Strategy"), best.get("Strategy")),
                "threshold": clean_value(
                    matrix_row.get("Threshold"),
                    (comparison or {}).get("threshold_used")
                ),
                "source": MODEL_RESULTS_FILE.name
            }

    return jsonify({
        "drift": json_safe(read_json(DRIFT_FILE)),
        "model_comparison": json_safe(comparison),
        "model_results": records(model_results),
        "confusion_matrix": json_safe(confusion_matrix)
    })


# ============================================================
# DASHBOARD SUMMARY
# ============================================================

@app.route("/api/summary")
def summary_api():
    df = transaction_data()

    if df.empty:
        return jsonify({
            "total_transactions": 0,
            "fraud_predictions": 0,
            "non_fraud_predictions": 0,
            "faithful_explanations": 0,
            "review_required": 0
        })

    predictions = df.get(
        "Prediction", pd.Series("", index=df.index)
    ).astype(str).str.strip().str.upper()

    verification = df.get(
        "Verification_Status", pd.Series("", index=df.index)
    ).astype(str).str.strip().str.upper()

    fraud_labels = ["FRAUD", "1", "TRUE", "YES"]
    legitimate_labels = [
        "LEGITIMATE", "NOT FRAUD", "NON-FRAUD",
        "NON FRAUD", "0", "FALSE", "NO"
    ]

    return jsonify({
        "total_transactions": int(len(df)),
        "fraud_predictions": int(
            predictions.isin(fraud_labels).sum()
        ),
        "non_fraud_predictions": int(
            predictions.isin(legitimate_labels).sum()
        ),
        "faithful_explanations": int(
            (verification == "FAITHFUL").sum()
        ),
        "review_required": int(
            (verification == "REVIEW_REQUIRED").sum()
        )
    })


# ============================================================
# UNIFIED REPORT
# ============================================================

@app.route("/api/report")
def report_api():
    if not REPORT_FILE.exists():
        return jsonify({
            "available": False,
            "message": "Unified report has not been generated yet."
        })

    try:
        report_text = REPORT_FILE.read_text(encoding="utf-8")
    except OSError:
        app.logger.exception("Could not read unified report")
        return jsonify({
            "available": False,
            "message": "The unified report could not be read."
        }), 500

    return jsonify({
        "available": True,
        "report": report_text
    })


# ============================================================
# START APPLICATION
# ============================================================

if __name__ == "__main__":
    df = transaction_data()

    print("\n==============================================")
    print("VeriFraud | PaySim Fraud Investigation")
    print("Transactions loaded:", len(df))
    print("==============================================\n")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
