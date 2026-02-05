import { Link } from "react-router-dom";

export default function EvaluationTable({ evaluations }) {
    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body">
                <h2 className="card-title mb-4">Assigned Evaluations</h2>

                <div className="w-full overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Evaluation</th>
                                <th>Date Assigned</th>
                                <th>Deadline</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {evaluations.map(e => (
                                <tr key={e._id}>
                                    <td>
                                        <Link
                                            to={`/evaluation/${e._id}`}
                                            className="link link-primary font-mono"
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

                    {evaluations.length === 0 && (
                        <p className="text-center opacity-50 py-6">
                            No assignments yet
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
