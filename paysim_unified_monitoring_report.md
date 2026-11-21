# VeriFraud Unified Monitoring and Research Report

Generated: 2026-10-21T05:00:33+00:00

## 1. Executive Summary

- **Drift status:** CRITICAL
- **Saved investigation cases:** 26
- **Investigation rows:** 500
- **Cases recommended for escalation:** 26
- **Model comparison runs succeeded:** 6

This report consolidates saved experiment outputs. It does not retrain or deploy a model.

## 2. Data Drift

Overall status: **CRITICAL**

- Reference rows: 5000
- Current rows: 5000
- Critical features: 3
- Warning features: 1

| Feature | Drift_Metric | Drift_Score | Status |
| --- | --- | --- | --- |
| step | PSI | 12.559939409598321 | CRITICAL_DRIFT |
| amount | PSI | 0.25447015852371824 | CRITICAL_DRIFT |
| oldbalanceOrg | PSI | 0.597691474662144 | CRITICAL_DRIFT |
| oldbalanceDest | PSI | 0.011797876124568674 | NO_MAJOR_DRIFT |
| type | TOTAL_VARIATION_DISTANCE | 0.2486 | WARNING_DRIFT |

Interpretation: distribution changes warrant investigation, but do not by themselves establish a drop in model accuracy.

## 3. Model and Strategy Comparison

- Successful runs: 6
- Failed runs: 0
- Best measured model: XGBoost
- Best strategy: class_weight
- Best Average Precision: 0.8481

## 4. Threshold Evaluation

- Selected threshold: 0.9500
- Test Average Precision: 0.8481
- Test ROC-AUC: 0.9934
- Test precision: 0.7845
- Test recall: 0.7769
- Test F1: 0.7807
- Test false-positive rate: 0.0029

Important: these threshold metrics belong to a separately trained experiment. Verify model and preprocessing compatibility before applying this threshold to another saved model.

## 5. Case Management

- Saved cases: 26
- Audit log events: 26

### Priorities

- P2-HIGH: 20
- P1-CRITICAL: 6

### Case statuses

- OPEN: 26

## 6. Explanation Verification and Repair

### Verification status

- FAITHFUL: 500

### Repair status

- NOT_NEEDED: 466
- REPAIRED_AND_PASSED: 34

A passed faithfulness check means the explanation passed the implemented checks; it does not guarantee full semantic faithfulness or that the model prediction is correct.

## 7. Evidence-Based Recommendations

- Investigate critical feature drift and compare successive time windows before concluding that model performance changed.
- Review the 26 investigation rows marked for escalation; prioritize high-risk cases.
- Monitor precision and recall on a later labelled period.
- Keep threshold selection on validation data and reserve test data for final evaluation.
- Do not automatically close a high-risk transaction solely because its explanation passed verification.

## 8. Limitations

- Drift is measured by comparing the configured reference and current windows.
- The model comparison and threshold experiment may use different training runs; their results should not be treated as one model's metrics without checking configuration compatibility.
- Cases are decision-support records, not confirmed fraud findings.
- No real financial transaction has been blocked, reversed, or frozen.

## 9. Source Files

- `outputs/paysim_drift_summary.json` — available
- `outputs/paysim_model_comparison_summary.json` — available
- `outputs/paysim_threshold_summary.json` — available
- `outputs/paysim_cases.csv` — available
- `outputs/paysim_case_audit.csv` — available
- `outputs/paysim_investigation_results.csv` — available
