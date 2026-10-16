export class GitHub {
  constructor(private token: string, readonly repository: string) {
    if (repository !== 'synopackageland/syno-pkg-land-community') throw new Error('Unexpected forum repository');
    if (!token) throw new Error('Missing GitHub credential');
  }
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`https://api.github.com/${path}`, {
      method, headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'synopkgland-community' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (!response.ok) throw new Error(`GitHub ${method} failed (${response.status})`);
    return await response.json() as T;
  }
  async assertOwner(): Promise<void> {
    const viewer = await this.request<{ login: string }>('user');
    if (viewer.login !== 'synopackageland') throw new Error('Catalog writes require synopackageland identity');
  }
  async gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const result = await this.request<{ data: T; errors?: unknown[] }>('graphql', 'POST', { query, variables });
    if (result.errors?.length) throw new Error('GitHub GraphQL operation failed');
    return result.data;
  }
  async mutate<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    await this.assertOwner();
    return this.gql<T>(query, variables);
  }
}
