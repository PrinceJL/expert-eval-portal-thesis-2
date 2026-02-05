import { useParams, useNavigate } from "react-router-dom";
import { Button, IconButton, ButtonGroup, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { getAssignmentById, submitEvaluation } from "../api/expert";
import { ExpandMore, ExpandLess } from "@mui/icons-material";

export default function EvaluationPage() {
    console.log("EvaluationPage mounted");
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
            <div className="flex items-center justify-center h-screen bg-base-200">
                <div className="text-lg font-semibold animate-pulse">
                    Loading evaluation…
                </div>
            </div>
        );
    }

    const { evaluation, evaluation_scorings } = assignment;
    const currentScoring = evaluation_scorings[dimensionIndex];
    const isFinal = dimensionIndex === evaluation_scorings.length - 1;

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
    for (let i = currentScoring.min_range; i <= currentScoring.max_range; i++) {
        range.push(i);
    }

    const getCriteriaName = (val) => {
        const crit = currentScoring.criteria.find((c) => c.value === val);
        return crit ? crit.name : "";
    };

    return (
        <div className="flex h-screen bg-gradient-to-r from-base-100 to-base-200">
            {/* Chat Section*/}
            <div className="flex-[3] min-w-[70%] p-8 overflow-y-auto">
                <Typography variant="h5" className="font-bold mb-6 border-b pb-2">
                    {evaluation.filename} — {currentScoring.dimension_name}
                </Typography>

                <div className="space-y-8">
                    {evaluation.items.map((item, i) => (
                        <div key={i} className="space-y-2">
                            {/* Query now on the right */}
                            <div className="chat chat-end">
                                <div className="chat-bubble chat-bubble-primary">
                                    {item.query}
                                </div>
                            </div>
                            {/* Response now on the left */}
                            <div className="chat chat-start">
                                <div className="chat-bubble chat-bubble-secondary">
                                    {item.llm_response}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scoring Section (now 20%) */}
            <div className="w-1/5 p-6 border-l bg-base-200 rounded-lg shadow-lg space-y-4 relative">
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
                            {n} {getCriteriaName(n) ? `— ${getCriteriaName(n)}` : ""}
                        </Button>
                    ))}
                </ButtonGroup>

                <div className="text-xs text-gray-500 text-center mt-4">
                    Dimension {dimensionIndex + 1} of {evaluation_scorings.length}
                </div>
            </div>

            {/* Navigation */}
            <div className="fixed bottom-0 left-0 w-full bg-base-100 border-t p-4 flex justify-between shadow-lg">
                <Button
                    variant="outlined"
                    disabled={dimensionIndex === 0}
                    onClick={() => setDimensionIndex((i) => i - 1)}
                >
                    Previous
                </Button>

                {isFinal ? (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleSubmit}
                        disabled={!scores[currentScoring._id]}
                    >
                        Submit
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        onClick={() => setDimensionIndex((i) => i + 1)}
                        disabled={!scores[currentScoring._id]}
                    >
                        Next
                    </Button>
                )}
            </div>
        </div>
    );
}