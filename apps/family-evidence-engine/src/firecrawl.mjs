export class FirecrawlClient {
  constructor({ apiKey, baseUrl = 'https://api.firecrawl.dev' }) {
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY is required for live research.');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async search(query, { limit = 5 } = {}) {
    const response = await fetch(`${this.baseUrl}/v2/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true
        }
      })
    });

    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Firecrawl returned non-JSON (${response.status}): ${text.slice(0, 300)}`);
    }

    if (!response.ok || json?.success === false) {
      const message = json?.error || json?.message || `HTTP ${response.status}`;
      throw new Error(`Firecrawl search failed: ${message}`);
    }

    return normalizeSearchResults(json);
  }
}

export function normalizeSearchResults(payload) {
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.data?.web)
        ? payload.data.web
        : Array.isArray(payload?.web)
          ? payload.web
          : [];

  return candidates.map((item) => ({
    url: item.url || item.sourceURL || item.metadata?.sourceURL || '',
    title: item.title || item.metadata?.title || '',
    description: item.description || item.snippet || '',
    markdown: item.markdown || item.content || '',
    metadata: item.metadata || {}
  })).filter((item) => item.url);
}
