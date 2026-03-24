export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your test management activities
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm text-muted-foreground">Test Plans</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm text-muted-foreground">Test Cases</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm text-muted-foreground">Executions</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-2xl font-bold">0</div>
          <div className="text-sm text-muted-foreground">Bugs</div>
        </div>
      </div>
    </div>
  )
}
