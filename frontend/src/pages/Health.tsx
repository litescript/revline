import HealthStatus from "../components/HealthStatus";

export default function Health() {
  return (
    <div className="mx-auto max-w-5xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">System Health</h1>
      <HealthStatus />
    </div>
  );
}
