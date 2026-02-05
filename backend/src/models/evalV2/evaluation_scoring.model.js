const mongoose = require("mongoose");

// Subdocument schema for each criterion option within a dimension
const CriterionSchema = new mongoose.Schema(
  {
    value: { type: Number, required: true },
    criteria_name: { type: String, required: true },
    description: { type: String, required: true }
  },
  { _id: false }
);

const EvaluationScoringSchema = new mongoose.Schema(
  {
    dimension_name: { type: String, required: true },
    dimension_description: { type: String, default: "" },

    type: {
      type: String,
      enum: ["Likert", "Boolean"],
      required: true
// Subdocument schema for each criterion
const CriterionSchema = new mongoose.Schema({
    value: {
        type: Number,
        criteria_name: { type: String, required: true },
        required: true,
    },
    description: { type: String, required: true }
}, { _id: false }); // optional: avoid generating _id for subdocs

const EvaluationScoringSchema = new mongoose.Schema({
    dimension_name: { type: String, required: true },
    dimension_description: { type: String },

    type: {
        type: String,
        enum: ["Likert", "Boolean"], // add more types later
        required: true
    },

    min_range: { type: Number, required: true },
    max_range: { type: Number, required: true },

    criteria: {
      type: [CriterionSchema],
      default: [],
      validate: {
        validator: function (criteriaList) {
          if (!Array.isArray(criteriaList)) return true;
          return criteriaList.every(
            (c) => c.value >= this.min_range && c.value <= this.max_range
          );
        },
        message: (props) =>
          `Criteria values must be within ${props.instance.min_range}-${props.instance.max_range}`
      }
    }
  },
  { timestamps: true }
);
        type: [CriterionSchema],
        validate: {
            validator: function(criteriaList) {
                // ensure all values are within min_range and max_range
                return criteriaList.every(c => c.value >= this.min_range && c.value <= this.max_range);
            },
            message: props => `Criteria values must be within ${props.instance.min_range}-${props.instance.max_range}`
        }
    }

}, { timestamps: true });

module.exports = mongoose.model("EvaluationScoring", EvaluationScoringSchema);
