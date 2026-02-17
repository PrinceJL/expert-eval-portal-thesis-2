
import { useParams, useNavigate } from "react-router-dom";
import { Button, IconButton, ButtonGroup, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { getAssignmentById, submitEvaluation } from "../api/expert";
import { ExpandMore, ExpandLess } from "@mui/icons-material";

export default function EvaluationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [dimensionIndex, setDimensionIndex] = useState(0);
  const [scores, setScores] = useState({});
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    getAssignmentById(id).then(setAssignment);
  }, [id]);

  if (!assignment) {
    return (
      <div className="flex h-screen bg-base-100 font-sans">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-xl">
              <span className="app-skeleton h-9 w-2/3" />
              <span className="app-skeleton mt-3 h-5 w-1/2" />
              <span className="app-skeleton mt-6 h-36 w-full rounded-xl" />
            </div>
            <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-xl">
              <span className="app-skeleton h-8 w-56" />
              <span className="app-skeleton mt-4 h-12 w-full rounded-lg" />
              <span className="app-skeleton mt-3 h-12 w-full rounded-lg" />
              <span className="app-skeleton mt-3 h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { evaluation, evaluation_scorings } = assignment;
  const currentScoring = evaluation_scorings[dimensionIndex];
  const isFinal = dimensionIndex === evaluation_scorings.length - 1;
  const isBooleanScoring =
    String(currentScoring?.type || "").toLowerCase() === "boolean" ||
    (Number(currentScoring?.min_range) === 0 && Number(currentScoring?.max_range) === 1);

  const handleScore = (value) => {
    setScores((prev) => ({
      ...prev,
      [currentScoring._id]: value,
    }));
  };

  const handleSubmit = async () => {
    const payload = evaluation_scorings.map((s) => ({
      scoring: s._id,
      score: scores[s._id] ?? null,
      comments: "",
    }));

    await submitEvaluation(id, { scores: payload });
    navigate("/");
  };

  const range = [];
  if (isBooleanScoring) {
    range.push(0, 1);
  } else {
    for (let i = currentScoring.min_range; i <= currentScoring.max_range; i++) {
      range.push(i);
    }
  }

  const getCriteriaName = (val) => {
    const crit = currentScoring.criteria.find((c) => Number(c.value) === Number(val));
    const name = crit?.criteria_name || crit?.name || "";
    if (name) return name;
    if (isBooleanScoring) return Number(val) === 1 ? "Yes" : "No";
    return "";
  };

  const hasCurrentScore = scores[currentScoring._id] !== undefined && scores[currentScoring._id] !== null;

  return (
    <div className="flex h-screen bg-base-100 font-sans">
      {/* Main Content Area (Left) */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Chat Scroll Area */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto w-full pb-10">
            <Typography variant="h5" className="font-bold mb-8 text-2xl border-b pb-4 border-base-300">
              {evaluation.filename} — <span className="text-primary">{currentScoring.dimension_name}</span>
            </Typography>

            <div className="space-y-10">
              {evaluation.items.map((item, i) => (
                <div key={i} className="flex flex-col gap-4">
                  {/* Query (Right - User) */}
                  <div className="chat chat-end">
                    <div className="chat-header opacity-50 text-xs mb-1 uppercase tracking-wide font-semibold">User Query</div>
                    <div className="chat-bubble chat-bubble-info text-white shadow-sm text-lg leading-relaxed">
                      {item.query}
                    </div>
                  </div>

                  {/* Response (Left - System) */}
                  <div className="chat chat-start">
                    <div className="chat-header opacity-50 text-xs mb-1 uppercase tracking-wide font-semibold">Model Response</div>
                    <div className="chat-bubble bg-base-200 text-base-content shadow-md text-lg leading-relaxed border border-base-300">
                      {item.llm_response}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Bar (Bottom of Main Area) */}
        <div className="p-4 bg-base-100 border-t border-base-300 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
          <Button
            size="large"
            variant="outlined"
            disabled={dimensionIndex === 0}
            onClick={() => setDimensionIndex((i) => i - 1)}
          >
            Previous
          </Button>

          <div className="text-sm font-medium opacity-50">
            {dimensionIndex + 1} / {evaluation_scorings.length}
          </div>

          {isFinal ? (
            <Button
              size="large"
              variant="contained"
              color="success"
              onClick={handleSubmit}
              disabled={!hasCurrentScore}
            >
              Submit Evaluation
            </Button>
          ) : (
            <Button
              size="large"
              variant="contained"
              onClick={() => setDimensionIndex((i) => i + 1)}
              disabled={!hasCurrentScore}
            >
              Next Dimension
            </Button>
          )}
        </div>
      </div>

      {/* Scoring Sidebar (Right) */}
      <div className="w-[360px] flex-shrink-0 p-6 border-l border-base-300 bg-base-50 h-full overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center">
          <Typography variant="subtitle1" className="font-semibold">
            Evaluation
          </Typography>
          <IconButton
            size="small"
            onClick={() => setShowDescription((prev) => !prev)}
          >
            {showDescription ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </div>

        {showDescription && (
          <div className="collapse collapse-open bg-base-300 p-3 rounded-lg shadow text-sm prose">
            <p className="font-semibold">Description:</p>
            <p className="mb-2">{currentScoring.dimension_description}</p>

            <p className="font-semibold">Criteria:</p>
            <ul className="list-disc ml-4">
              {currentScoring.criteria
                .slice()
                .sort((a, b) => b.value - a.value)
                .map((c) => (
                  <li key={c.value}>
                    <span className="badge badge-outline mr-2">{c.value}</span>
                    {c.description}
                  </li>
                ))}
            </ul>
          </div>
        )}

        <ButtonGroup orientation="vertical" fullWidth>
          {range.map((n) => (
            <Button
              key={n}
              variant={scores[currentScoring._id] === n ? "contained" : "outlined"}
              color={scores[currentScoring._id] === n ? "primary" : "inherit"}
              onClick={() => handleScore(n)}
              className="mb-1"
            >
              {isBooleanScoring ? getCriteriaName(n) : `${n}${getCriteriaName(n) ? ` — ${getCriteriaName(n)}` : ""}`}
            </Button>
          ))}
        </ButtonGroup>

        <div className="text-xs text-base-content/60 text-center mt-4">
          Dimension {dimensionIndex + 1} of {evaluation_scorings.length}
        </div>
      </div>

    </div>
  );
}
