// models/mongo/evaluation.model.js
const mongoose = require("mongoose");

const EvaluationItemSchema = new mongoose.Schema({
  query: { type: String, required: true },
  rag_output: { type: String, required: true },
  reasoning_output: { type: String, required: true },
  llm_response: { type: String, required: true },
});

const EvaluationSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  rag_version: { type: String, required: true },
  items: [EvaluationItemSchema], // array of multiple query/response pairs
}, { timestamps: true });

module.exports = mongoose.model("Evaluation", EvaluationSchema);
