import { Link } from "react-router-dom";

export default function EvaluationTable({ evaluations }) {
    return (
        <div className="rounded-2xl border border-base-300/80 bg-base-100/70 p-4 shadow-xl backdrop-blur-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Assigned Evaluations</h2>
                <span className="badge badge-outline badge-sm">{evaluations.length} total</span>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-base-300/70 bg-base-200/20">
                <table className="table table-zebra w-full">
                        <thead>
                        <tr className="text-xs uppercase tracking-wide">
                            <th>Evaluation</th>
                            <th>Date Assigned</th>
                            <th>Deadline</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                            {evaluations.map(e => (
                            <tr key={e.id || e._id} className="hover">
                                    <td>
                                        <Link
                                            to={`/evaluation/${e.id || e._id}`}
                                        className="font-mono text-primary no-underline hover:underline"
                                        >
                                            {e.evaluation.filename}
                                        </Link>
                                    </td>
                                    <td>
                                        {new Date(e.date_assigned).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {new Date(e.deadline).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {(e.completion_status || e.final_submitted) ? (
                                        <span className="badge badge-success badge-sm">Completed</span>
                                        ) : e.status === "IN_PROGRESS" ? (
                                        <span className="badge badge-info badge-sm">In Progress</span>
                                        ) : (
                                        <span className="badge badge-warning badge-sm">Pending</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {evaluations.length === 0 && (
                    <p className="py-6 text-center text-sm opacity-60">
                            No assignments yet
                        </p>
                    )}
            </div>
        </div>
    );
}
