// backend/src/domain/interfaces/ICIAdapter.ts
// Abstraction over CI/CD systems (Jenkins, GitHub Actions).

export interface CIJob {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  url?: string
}

export interface ICIAdapter {
  /**
   * Triggers a CI job and returns a reference to track it.
   */
  triggerJob(config: Record<string, unknown>, params: Record<string, unknown>): Promise<CIJob>

  /**
   * Returns the current status of a previously triggered CI job.
   */
  getJobStatus(jobId: string, config: Record<string, unknown>): Promise<CIJob>
}
