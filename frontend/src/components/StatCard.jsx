export default function StatCard({ title, value, subtitle, color = "primary" }) {
  return (
    <div className="card bg-base-200 shadow">
      <div className="card-body">
        <h2 className="card-title text-sm opacity-70">{title}</h2>
        <p className={`text-3xl font-bold text-${color}`}>{value}</p>
        {subtitle && <p className="text-sm opacity-60">{subtitle}</p>}
      </div>
    </div>
  );
}
