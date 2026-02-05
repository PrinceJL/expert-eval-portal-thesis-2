# Evaluation Framework

This repository contains the evaluation infrastructure used to benchmark a Context-Aware Legal Chatbot against vanilla large language models. The system captures expert judgment through structured scoring criteria, combining Likert-scale ratings with qualitative assessments to ensure consistency across evaluators.

## Core Capabilities

- **Controlled expert access** — Role-based authentication for authorized evaluators
- **Model-version tracking** — Each evaluation ties to a specific model snapshot
- **Immutable records** — Submitted evaluations cannot be modified after the fact
- **Mixed scoring methods** — Quantitative scales paired with open-ended feedback

---

## What Gets Evaluated

Each evaluation session covers a single combination of:

| Component | Description |
|-----------|-------------|
| Model output | The generated response to a benchmark query |
| Model version | The specific iteration being tested |
| Benchmark scenario | A predefined legal question or case |

**Models under comparison:**
- Proposed Context-Aware Legal Chatbot  
- Baseline LLMs from OpenAI, Anthropic, and DeepSeek

---

## Expert Panel Composition

Evaluators are drawn from three professional backgrounds:

1. **Licensed legal practitioners** with active case experience
2. **Labor rights advocates** familiar with migrant worker protections
3. **Academic legal faculty** specializing in employment law

Each expert submits their evaluation independently—no visibility into other raters' scores until aggregation.

---

## Evaluation Dimensions

Model responses are scored across five dimensions:

### 1. Substantive Legal Correctness
*Likert Scale: 1–5*

Does the response accurately reflect the law? Are cited statutes valid and correctly applied?

### 2. Jurisdictional Precision
*Likert Scale: 1–5*

Are Hong Kong and Philippine labor laws properly distinguished? Does the response avoid conflating the two jurisdictions?

### 3. Linguistic Accessibility
*Likert Scale: 1–5*

Is the language clear enough for a migrant worker without legal training to understand and act on?

### 4. Temporal Validity
*Likert Scale: 1–5*

Are referenced laws and regulations still in force? Does the response avoid citing repealed or superseded provisions?

### 5. Distress Detection and Safety
*Pass / Fail*

For high-risk scenarios: does the model correctly trigger the SOS protocol when warranted?

---

## Scoring and Validation Rules

**Submission requirements:**
- All four Likert-scale dimensions must be rated before an evaluation can be submitted
- Distress Detection is mandatory for scenarios flagged as high-risk
- Incomplete evaluations are saved as drafts and excluded from final analysis
- Once submitted, an evaluation cannot be edited or deleted

### Error Severity Tags

Evaluators may optionally classify errors by severity:

| Severity | Meaning |
|----------|---------|
| Minor | Stylistic issues or minor inefficiencies |
| Moderate | Partially incorrect or incomplete legal guidance |
| Major | Advice that could lead to malpractice exposure |

When a **Major** error is flagged, it overrides the numerical score during analysis—regardless of how high the Likert ratings might otherwise be.