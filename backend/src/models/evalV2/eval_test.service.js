const Evaluation = require("./evaluation.model");
const EvaluationScoring = require("./evaluation_scoring.model");
const EvaluationAssignment = require("./evaluation_assignment.model");

// Quick helper to create a working sample evaluation + scoring + assignment.
async function seedSampleForUser(userId) {
  // 1) Create an evaluation payload
  const evalDoc = await Evaluation.create({
    filename: "sample.json",
    rag_version: "v1.0",
    items: [
      {
        query: "What is AI?",
        rag_output: "Answer from RAG",
        reasoning_output: "Reasoning here",
        llm_response: "AI is Artificial Intelligence"
      },
      {
        query: "What is jurisdiction?",
        rag_output: "RAG output",
        reasoning_output: "Reasoning...",
        llm_response: "Jurisdiction is the authority of a court to hear a case."
      }
    ]
  });

  // 2) Create scoring dimensions (Likert 1-5)
  const dims = [
    {
      dimension_name: "Legal Correctness",
      dimension_description: "Is the answer legally correct?",
      type: "Likert",
      min_range: 1,
      max_range: 5,
      criteria: [
        { value: 1, criteria_name: "Very Poor", description: "Mostly incorrect" },
        { value: 3, criteria_name: "Neutral", description: "Mixed correctness" },
        { value: 5, criteria_name: "Excellent", description: "Fully correct" }
      ]
    },
    {
      dimension_name: "Jurisdictional Precision",
      dimension_description: "Does it match the correct jurisdiction/context?",
      type: "Likert",
      min_range: 1,
      max_range: 5,
      criteria: [
        { value: 1, criteria_name: "Very Poor", description: "Wrong jurisdiction" },
        { value: 3, criteria_name: "Neutral", description: "Partially aligned" },
        { value: 5, criteria_name: "Excellent", description: "Correct jurisdiction" }
      ]
    },
    {
      dimension_name: "Linguistic Accessibility",
      dimension_description: "Is it easy to understand?",
      type: "Likert",
      min_range: 1,
      max_range: 5,
      criteria: [
        { value: 1, criteria_name: "Very Poor", description: "Hard to read" },
        { value: 3, criteria_name: "Neutral", description: "Understandable" },
        { value: 5, criteria_name: "Excellent", description: "Very clear" }
      ]
    },
    {
      dimension_name: "Temporal Validity",
      dimension_description: "Is it up-to-date and time-correct?",
      type: "Likert",
      min_range: 1,
      max_range: 5,
      criteria: [
        { value: 1, criteria_name: "Very Poor", description: "Outdated / wrong" },
        { value: 3, criteria_name: "Neutral", description: "Some issues" },
        { value: 5, criteria_name: "Excellent", description: "Time-correct" }
      ]
    },
    {
      dimension_name: "SOS Compliance",
      dimension_description: "Safety / sensitive content compliance",
      type: "Likert",
      min_range: 1,
      max_range: 5,
      criteria: [
        { value: 1, criteria_name: "Fail", description: "Unsafe" },
        { value: 3, criteria_name: "Neutral", description: "Some issues" },
        { value: 5, criteria_name: "Pass", description: "Compliant" }
      ]
    }
  ];

  const scoringDocs = await EvaluationScoring.insertMany(dims);

  // 3) Create assignment for that user
  const assignment = await EvaluationAssignment.create({
    user_assigned: String(userId),
    evaluation: evalDoc._id,
    evaluation_scorings: scoringDocs.map((s) => s._id),
    user_evaluation_output: scoringDocs.map((s) => ({
      scoring: s._id,
      score: null,
      comments: null
    })),
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 days
  });

  return { evalDoc, scoringDocs, assignment };
}

// Called by /expert/test
async function evalTest(body) {
  const userId = body?.userId || "user123";
  const { evalDoc, assignment } = await seedSampleForUser(userId);
  return {
    ok: true,
    message: "Seeded a sample evaluation assignment",
    assignmentId: String(assignment._id),
    evaluationId: String(evalDoc._id)
  };
}

module.exports = {
  evalTest,
  seedSampleForUser
async function testModels() {
    // 1️⃣ Create Evaluation
    const evalDoc = await Evaluation.create({
        filename: "sample.json",
        rag_version: "v1.0",
        items: [
            {
                query: "What is AI?",
                rag_output: "Answer from RAG",
                reasoning_output: "Reasoning here",
                llm_response: "AI is Artificial Intelligence"
            }
        ]
    });

    // 2️⃣ Create Scoring Dimensions
    const score1 = await EvaluationScoring.create({
        dimension_name: "Accuracy",
        dimension_description: "How accurate is the response?",
        low_false_criteria: "Incorrect answer",
        high_true_criteria: "Completely correct",
        range: "0-5"
    });

    // 3️⃣ Create Assignment
    const assignment = await EvaluationAssignment.create({
        user_assigned: "user123",
        evaluation: evalDoc._id,
        evaluation_scorings: [score1._id],
        user_evaluation_output: [
            { scoring: score1._id, score: null, comments: null }
        ],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
    });
}
module.exports = {
    testModels
};
