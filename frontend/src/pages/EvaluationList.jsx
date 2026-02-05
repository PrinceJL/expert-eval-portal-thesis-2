import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMyAssignments } from "../api/expert";

function daysUntil(date) {
    const diff = new Date(date) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function EvaluationList() {
    console.log("Evaluations List mounted");
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const data = await getMyAssignments();
                setEvaluations(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load assignments");
            } finally {
                setLoading(false);
            }
        };

        fetchAssignments();
    }, []);

    if (loading) {
        return <div className="p-8">Loading evaluations…</div>;
    }

    if (error) {
        return <div className="p-8 text-error">{error}</div>;
    }

    const batchNumber = evaluations[0]?.evaluation?.rag_version ?? "—";
    const completedCount = evaluations.filter(e => e.completion_status).length;

    const nextDeadlineEval = [...evaluations]
        .filter(e => !e.completion_status)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="card bg-base-200">
                <div className="card-body">
                    <h1 className="text-2xl font-bold">
                        Evaluation Batch #{batchNumber}
                    </h1>

                    <div className="flex gap-12 mt-2">
                        <div>
                            <p className="font-semibold">Next Deadline</p>
                            {nextDeadlineEval ? (
                                <p>
                                    {new Date(nextDeadlineEval.deadline).toLocaleDateString()} —{" "}
                                    <span className="text-error">
                                        in {daysUntil(nextDeadlineEval.deadline)} days
                                    </span>
                                </p>
                            ) : (
                                <p className="text-success">All completed 🎉</p>
                            )}
                        </div>

                        <div>
                            <p className="font-semibold">Progress</p>
                            <p>
                                Completed: {completedCount}/{evaluations.length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="table table-zebra">
                    <thead>
                        <tr>
                            <th>Evaluation</th>
                            <th>Date Assigned</th>
                            <th>Deadline</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {evaluations.map((e) => (
                            <tr key={e._id}>
                                <td>
                                    <Link
                                        to={`/evaluation/${e._id}`}
                                        className="link link-primary"
                                    >
                                        {e.evaluation?.filename || "—"}
                                    </Link>
                                </td>
                                <td>{new Date(e.date_assigned).toLocaleDateString()}</td>
                                <td>{new Date(e.deadline).toLocaleDateString()}</td>
                                <td>
                                    {e.completion_status ? (
                                        <span className="badge badge-success">Completed</span>
                                    ) : (
                                        <span className="badge badge-warning">Pending</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

