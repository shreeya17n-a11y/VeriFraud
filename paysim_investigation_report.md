# PaySim Automated Investigation Report

Generated: 2026-11-11T10:32:31+05:30
Source: `paysim_investigation_results.csv`
Transactions processed: **500**

## Executive summary

- Initially flagged explanations: 34
- Repair attempts: 34
- Repair and verification passed: 34
- Repair still flagged: 0
- Repair errors: 0
- Cases recommended for escalation: 26

## Case dispositions

| Disposition | Count |
|---|---:|
| ROUTINE_MONITORING | 474 |
| OPEN_ADDITIONAL_SCREENING | 20 |
| OPEN_HIGH_RISK_INVESTIGATION | 6 |

## Risk levels

| Risk | Count |
|---|---:|
| LOW | 474 |
| ELEVATED | 20 |
| HIGH | 6 |

## Escalation queue

Escalation is recommended for high risk transactions and any explanation that remains unresolved after its bounded repair attempt.

| Transaction | Risk | Probability | Disposition | Reason |
|---:|---|---:|---|---|
| 6252549 | ELEVATED | 0.8591 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6247215 | ELEVATED | 0.9488 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6244518 | ELEVATED | 0.3958 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6250382 | ELEVATED | 0.2354 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6259969 | HIGH | 0.9981 | OPEN_HIGH_RISK_INVESTIGATION | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6260692 | ELEVATED | 0.7938 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6268655 | ELEVATED | 0.6016 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6277248 | HIGH | 0.9846 | OPEN_HIGH_RISK_INVESTIGATION | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6280007 | ELEVATED | 0.7816 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6279635 | ELEVATED | 0.5207 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6294045 | HIGH | 1.0000 | OPEN_HIGH_RISK_INVESTIGATION | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6300614 | ELEVATED | 0.8942 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6305708 | ELEVATED | 0.2904 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6305488 | ELEVATED | 0.3599 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6309554 | ELEVATED | 0.2857 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6311651 | ELEVATED | 0.9471 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6321763 | ELEVATED | 0.7520 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6343177 | ELEVATED | 0.2716 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6340159 | ELEVATED | 0.7863 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6354342 | HIGH | 0.9895 | OPEN_HIGH_RISK_INVESTIGATION | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6354039 | ELEVATED | 0.7447 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6355303 | ELEVATED | 0.9460 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6354638 | ELEVATED | 0.8117 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6358044 | ELEVATED | 0.8582 | OPEN_ADDITIONAL_SCREENING | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6362392 | HIGH | 0.9990 | OPEN_HIGH_RISK_INVESTIGATION | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |
| 6362590 | HIGH | 0.9996 | OPEN_HIGH_RISK_INVESTIGATION | Mentioned feature names and checked directions are consistent with the supplied SHAP evidence. This does not establish that every sentence is faithful. |

## Decision notes

- Risk is assessed from the saved model probability, threshold, and prediction label.
- Explanation faithfulness is assessed separately from transaction risk.
- SHAP and model scores support investigation; they do not prove fraud.
- A passed automated faithfulness check does not rule out fraud. High risk cases remain prioritized.
- See `paysim_investigation_results.csv` for transaction-level evidence, repairs, decisions, and reasons.
