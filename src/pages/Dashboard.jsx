import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { CircularProgressbarWithChildren, buildStyles } from "react-circular-progressbar";
import 'react-circular-progressbar/dist/styles.css';

import { useAuth } from "../auth/AuthContext";
import StatCard from "../components/StatCard";
import EvaluationTable from "../components/EvaluationTable";

function AdminDashboardSkeleton() {
    return (
        <div className="admin-dashboard-shell min-h-screen w-full bg-base-100 px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto w-full max-w-[1240px] space-y-6">
                <div className="space-y-2">
                    <span className="app-skeleton h-10 w-64" />
                    <span className="app-skeleton h-5 w-56" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, idx) => (
                        <div key={`admin-skeleton-card-${idx}`} className="rounded-2xl border border-base-300/70 bg-base-100/70 p-5 shadow-xl">
                            <span className="app-skeleton mb-5 h-8 w-44" />
                            <div className="space-y-3">
                                <span className="app-skeleton h-12 w-full rounded-xl" />
                                <span className="app-skeleton h-12 w-full rounded-xl" />
                                {idx === 1 ? <span className="app-skeleton h-12 w-full rounded-xl" /> : null}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl border border-base-300/70 bg-base-100/70 p-5 shadow-xl">
                    <span className="app-skeleton mb-5 h-8 w-52" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <span className="app-skeleton app-skeleton-circle h-20 w-20 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <span className="app-skeleton h-6 w-64" />
                            <span className="app-skeleton h-4 w-40" />
                            <span className="app-skeleton h-4 w-56" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ExpertDashboardSkeleton() {
    return (
        <div className="min-h-screen w-full bg-base-100 px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto w-full max-w-[1240px] space-y-6 sm:space-y-8">
                <section className="rounded-2xl border border-base-300/80 bg-base-100 p-5 shadow-xl sm:p-6">
                    <div className="space-y-2">
                        <span className="app-skeleton h-10 w-72" />
                        <span className="app-skeleton h-5 w-80 max-w-full" />
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={`expert-stat-skeleton-${idx}`} className="rounded-xl border border-base-300/70 bg-base-200/40 px-4 py-3">
                                <span className="app-skeleton h-4 w-16" />
                                <span className="app-skeleton mt-2 h-8 w-12" />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-2xl border border-base-300/80 bg-base-100/70 p-4 shadow-xl sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <span className="app-skeleton h-8 w-56" />
                            <span className="app-skeleton h-4 w-24" />
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, idx) => (
                                <span key={`expert-dimension-skeleton-${idx}`} className="app-skeleton h-28 w-full rounded-xl" />
                            ))}
                        </div>
                    </div>

                    <aside className="rounded-2xl border border-base-300/80 bg-base-100/70 p-5 shadow-xl">
                        <span className="app-skeleton h-7 w-48" />
                        <span className="app-skeleton mt-2 h-4 w-40" />
                        <div className="mx-auto mt-5 flex h-44 w-44 items-center justify-center">
                            <span className="app-skeleton app-skeleton-circle h-40 w-40" />
                        </div>
                        <div className="mt-5 space-y-2">
                            <span className="app-skeleton h-10 w-full rounded-lg" />
                            <span className="app-skeleton h-10 w-full rounded-lg" />
                            <span className="app-skeleton h-10 w-full rounded-lg" />
                        </div>
                    </aside>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="app-skeleton h-9 w-48" />
                        <span className="app-skeleton h-5 w-28" />
                    </div>
                    <div className="rounded-2xl border border-base-300/70 bg-base-100 p-4 shadow-xl">
                        <span className="app-skeleton h-10 w-full rounded-lg" />
                        <span className="app-skeleton mt-3 h-10 w-full rounded-lg" />
                        <span className="app-skeleton mt-3 h-10 w-full rounded-lg" />
                    </div>
                </section>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { user } = useAuth();

    // Admin State
    const [adminStats, setAdminStats] = useState(null);
    const [systemHealth, setSystemHealth] = useState(null);

    // Expert State
    const [dimensions, setDimensions] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [modelComparison, setModelComparison] = useState([]);
    const [performance, setPerformance] = useState({
        current: 0,
        goal: 85,
        max: 100,
        completionRate: 0,
        avgScore: 0,
        modelVersion: "v1.0"
    });
    const [dashboardLoading, setDashboardLoading] = useState(true);

    const userName = user?.username || "Guest";

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'RESEARCHER';

    useEffect(() => {
        let cancelled = false;

        async function loadDashboard() {
            setDashboardLoading(true);
            try {
                if (isAdmin) {
                    const [stats, health] = await Promise.all([
                        apiFetch('/admin/stats'),
                        apiFetch('/system/health')
                    ]);
                    if (cancelled) return;
                    setAdminStats(stats);
                    setSystemHealth(health);
                } else {
                    const stats = await apiFetch('/expert/stats');
                    if (cancelled) return;
                    setDimensions(Array.isArray(stats?.dimensions) ? stats.dimensions : []);
                    setEvaluations(Array.isArray(stats?.assignments) ? stats.assignments : []);
                    setModelComparison(Array.isArray(stats?.modelComparison) ? stats.modelComparison : []);
                    setPerformance({
                        current: Number(stats?.performance?.current || 0),
                        goal: Number(stats?.performance?.goal || 85),
                        max: Number(stats?.performance?.max || 100),
                        completionRate: Number(stats?.performance?.completionRate || 0),
                        avgScore: Number(stats?.performance?.avgScore || 0),
                        modelVersion: String(stats?.performance?.modelVersion || "v1.0")
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) {
                    setDashboardLoading(false);
                }
            }
        }

        loadDashboard();
        return () => {
            cancelled = true;
        };
    }, [isAdmin]);

    const completedCount = useMemo(
        () => evaluations.filter((item) => Boolean(item.completion_status)).length,
        [evaluations]
    );

    const pendingCount = Math.max(0, evaluations.length - completedCount);
    const completionRate = evaluations.length
        ? Math.round((completedCount / evaluations.length) * 100)
        : 0;

    const averageDimensionScore = dimensions.length
        ? (
            dimensions.reduce(
                (sum, dimension) => sum + Number(dimension.avgScore || 0),
                0
            ) / dimensions.length
        ).toFixed(1)
        : "0.0";

    const upcomingDeadline = useMemo(() => {
        const now = Date.now();
        const next = evaluations
            .filter((item) => !item.completion_status && item.deadline)
            .map((item) => new Date(item.deadline))
            .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() >= now)
            .sort((a, b) => a.getTime() - b.getTime())[0];

        return next ? next.toLocaleDateString() : "No pending deadlines";
    }, [evaluations]);

    if (dashboardLoading) {
        return isAdmin ? <AdminDashboardSkeleton /> : <ExpertDashboardSkeleton />;
    }

    if (isAdmin) {
        return (
            <div className="admin-dashboard-shell min-h-screen w-full bg-base-100 px-4 py-6 sm:px-6 sm:py-8">
                <div className="mx-auto w-full max-w-[1240px] space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                        <p className="opacity-60">System overview and health status</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="admin-dashboard-card rounded-2xl border border-base-300/80 bg-base-100/70 p-5 shadow-xl backdrop-blur-sm">
                            <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
                                <span>System Health</span>
                                <span className={`badge ${systemHealth?.status === 'OK' ? 'badge-success' : 'badge-error'} badge-sm`}>
                                    {systemHealth?.status || 'LOADING'}
                                </span>
                            </h2>
                            <div className="space-y-3">
                                <div className="admin-dashboard-row flex items-center justify-between rounded-xl border border-base-300/70 bg-base-200/40 p-3">
                                    <span className="font-semibold">PostgreSQL Database</span>
                                    <span className={`badge ${systemHealth?.databases?.postgres === 'CONNECTED' ? 'badge-success' : 'badge-error'}`}>
                                        {systemHealth?.databases?.postgres || '...'}
                                    </span>
                                </div>
                                <div className="admin-dashboard-row flex items-center justify-between rounded-xl border border-base-300/70 bg-base-200/40 p-3">
                                    <span className="font-semibold">MongoDB Database</span>
                                    <span className={`badge ${systemHealth?.databases?.mongodb === 'CONNECTED' ? 'badge-success' : 'badge-error'}`}>
                                        {systemHealth?.databases?.mongodb || '...'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="admin-dashboard-card rounded-2xl border border-base-300/80 bg-base-100/70 p-5 shadow-xl backdrop-blur-sm">
                            <h2 className="mb-4 text-xl font-bold">Evaluation Summary</h2>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="admin-dashboard-mini-card rounded-xl border border-base-300/70 bg-base-200/40 p-3">
                                    <p className="text-xs uppercase tracking-wide opacity-70">Total</p>
                                    <p className="mt-1 text-3xl font-bold text-primary admin-summary-total">{adminStats?.evaluations?.total || 0}</p>
                                    <p className="mt-1 text-xs opacity-60">All assignments</p>
                                </div>
                                <div className="admin-dashboard-mini-card rounded-xl border border-base-300/70 bg-base-200/40 p-3">
                                    <p className="text-xs uppercase tracking-wide opacity-70">Completed</p>
                                    <p className="mt-1 text-3xl font-bold text-success admin-summary-completed">{adminStats?.evaluations?.completed || 0}</p>
                                    <p className="mt-1 text-xs opacity-60">Successfully finished</p>
                                </div>
                                <div className="admin-dashboard-mini-card rounded-xl border border-base-300/70 bg-base-200/40 p-3">
                                    <p className="text-xs uppercase tracking-wide opacity-70">Pending</p>
                                    <p className="mt-1 text-3xl font-bold text-warning admin-summary-pending">{adminStats?.evaluations?.pending || 0}</p>
                                    <p className="mt-1 text-xs opacity-60">Awaiting completion</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="admin-dashboard-card rounded-2xl border border-base-300/80 bg-base-100/70 p-5 shadow-xl backdrop-blur-sm">
                        <h2 className="text-xl font-bold">User Statistics</h2>
                        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="avatar placeholder shrink-0">
                                <div className="admin-dashboard-count-badge flex h-20 w-20 items-center justify-center rounded-full border border-sky-300/35 bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-900/20">
                                    <span className="text-3xl font-extrabold leading-none">{adminStats?.users?.total || 0}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-bold">Total Registered Users</p>
                                <p className="text-sm opacity-70">
                                    <span className="inline-flex h-2 w-2 rounded-full bg-success align-middle" />{" "}
                                    {adminStats?.users?.online || 0} Online
                                </p>
                                <p className="text-xs opacity-60">Experts, Admins, and Researchers</p>
                            </div>
                            <div className="sm:ml-auto">
                                <Link to="/admin/users" className="btn btn-primary btn-sm admin-dashboard-manage-btn">Manage Users</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Expert View
    return (
        <div className="min-h-screen w-full bg-base-100 px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto w-full max-w-[1240px] space-y-6 sm:space-y-8">
                <section className="rounded-2xl border border-base-300/80 bg-gradient-to-br from-base-100 via-base-100 to-base-200/35 p-5 shadow-xl sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Welcome, {userName}!</h1>
                            <p className="mt-1 text-sm opacity-70">Overview of your evaluations and model performance.</p>
                        </div>
                        <span className="badge badge-outline px-3 py-3 text-xs font-semibold tracking-wide">{user?.role || "EXPERT"}</span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-xl border border-base-300/70 bg-base-200/40 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide opacity-65">Assigned</p>
                            <p className="mt-1 text-2xl font-bold">{evaluations.length}</p>
                        </div>
                        <div className="rounded-xl border border-base-300/70 bg-base-200/40 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide opacity-65">Completed</p>
                            <p className="mt-1 text-2xl font-bold text-success">{completedCount}</p>
                        </div>
                        <div className="rounded-xl border border-base-300/70 bg-base-200/40 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide opacity-65">Pending</p>
                            <p className="mt-1 text-2xl font-bold text-warning">{pendingCount}</p>
                        </div>
                        <div className="rounded-xl border border-base-300/70 bg-base-200/40 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide opacity-65">Avg. Score</p>
                            <p className="mt-1 text-2xl font-bold text-primary">{averageDimensionScore}</p>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-2xl border border-base-300/80 bg-base-100/70 p-4 shadow-xl backdrop-blur-sm sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-xl font-bold">Dimension Performance</h2>
                            <span className="text-xs font-medium opacity-60">{dimensions.length} dimensions</span>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {dimensions.map((dimension) => (
                                <StatCard
                                    key={dimension.name}
                                    title={dimension.name}
                                    value={dimension.avgScore}
                                    subtitle={dimension.sentiment}
                                />
                            ))}
                        </div>
                    </div>

                    <aside className="rounded-2xl border border-base-300/80 bg-base-100/70 p-5 shadow-xl backdrop-blur-sm">
                        <h2 className="text-lg font-bold">Model Goal Progress</h2>
                        <p className="mt-1 text-sm opacity-65">Current run against your target.</p>
                        <div className="mx-auto mt-5 h-44 w-44">
                            <CircularProgressbarWithChildren
                                value={performance.current}
                                maxValue={performance.max}
                                strokeWidth={9}
                                styles={buildStyles({
                                    strokeLinecap: "round",
                                    pathColor: "#3B82F6",
                                    trailColor: "rgba(148, 163, 184, 0.28)",
                                })}
                            >
                                <div className="text-center">
                                    <p className="text-3xl font-bold leading-none">{performance.current}%</p>
                                    <p className="mt-1 text-xs font-medium opacity-70">Goal {performance.goal}%</p>
                                </div>
                            </CircularProgressbarWithChildren>
                        </div>
                        <div className="mt-5 space-y-2 text-sm">
                            <div className="flex items-center justify-between rounded-lg border border-base-300/70 bg-base-200/35 px-3 py-2">
                                <span className="opacity-70">Completion rate</span>
                                <span className="font-semibold">{completionRate}%</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-base-300/70 bg-base-200/35 px-3 py-2">
                                <span className="opacity-70">Next deadline</span>
                                <span className="font-semibold">{upcomingDeadline}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-base-300/70 bg-base-200/35 px-3 py-2">
                                <span className="opacity-70">Model version</span>
                                <span className="font-semibold">{performance.modelVersion}</span>
                            </div>
                        </div>
                    </aside>
                </section>

                <section className="rounded-2xl border border-base-300/80 bg-base-100/70 p-4 shadow-xl backdrop-blur-sm sm:p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="text-xl font-bold">Multi-Model Comparison</h2>
                        <span className="text-xs opacity-60">{modelComparison.length} model(s)</span>
                    </div>
                    <div className="w-full overflow-x-auto rounded-xl border border-base-300/70 bg-base-200/20">
                        <table className="table table-zebra w-full">
                            <thead>
                                <tr className="text-xs uppercase tracking-wide">
                                    <th>Model</th>
                                    <th>Version</th>
                                    <th>Avg Score</th>
                                    <th>Completed</th>
                                    <th>Distress Fails</th>
                                    <th>Major Errors</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modelComparison.map((row) => (
                                    <tr key={`${row.modelName}-${row.modelVersion}`}>
                                        <td className="font-semibold">{row.modelName}</td>
                                        <td>{row.modelVersion}</td>
                                        <td>{row.avgScore ?? "-"}</td>
                                        <td>{row.completedAssignments}/{row.totalAssignments}</td>
                                        <td>{row.distressFails}</td>
                                        <td>{row.majorErrors}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {modelComparison.length === 0 ? (
                            <p className="py-6 text-center text-sm opacity-60">No final submissions yet.</p>
                        ) : null}
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">My Evaluations</h2>
                        <span className="text-sm opacity-65">{evaluations.length} assignment(s)</span>
                    </div>
                    <EvaluationTable evaluations={evaluations} />
                </section>
            </div>
        </div>
    );
}
