// backend/src/domain/interfaces/IBugTrackerAdapter.ts
// Abstraction over external bug tracker APIs (Jira, GitHub Issues, GitLab, etc.).
// `credential` is the resolved secret from Integration.credential (decrypted at runtime).
// It may be an API token (Jira), a PAT (GitHub), or an OAuth token depending on provider.

export interface ExternalBug {
  externalId: string
  title: string
  description?: string
  status: string
  url: string
}

export interface IBugTrackerAdapter {
  fetchBug(externalId: string, credential: string): Promise<ExternalBug>
  createBug(data: Omit<ExternalBug, 'externalId' | 'url'>, credential: string): Promise<ExternalBug>
  updateBug(externalId: string, changes: Partial<ExternalBug>, credential: string): Promise<ExternalBug>
  closeBug(externalId: string, credential: string): Promise<void>
}
