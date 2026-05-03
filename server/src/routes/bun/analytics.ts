import { getDb } from '../../db/index.js';
import { jsonResponse } from '../../lib/json.js';

function getTimeFilter(range: string): string {
  switch (range) {
    case '24h': return "datetime('now', '-1 day')";
    case '7d': return "datetime('now', '-7 days')";
    case '30d': return "datetime('now', '-30 days')";
    default: return "datetime('now', '-7 days')";
  }
}

export async function analyticsRoute(req: Request, url: URL): Promise<Response> {
  const path = url.pathname;
  const range = url.searchParams.get('range') ?? '7d';
  const since = getTimeFilter(range);

  // Summary stats
  if (path === '/api/analytics/summary' && req.method === 'GET') {
    const db = getDb();
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        AVG(latency_ms) as avg_latency_ms
      FROM requests
      WHERE created_at >= ${since}
    `).get() as any;

    const totalRequests = stats.total_requests ?? 0;
    const successRate = totalRequests > 0 ? (stats.success_count / totalRequests) * 100 : 0;
    const totalTokens = (stats.total_input_tokens ?? 0) + (stats.total_output_tokens ?? 0);

    // Estimate cost savings: average ~$3/M input + $15/M output tokens (GPT-4o pricing)
    const inputCost = ((stats.total_input_tokens ?? 0) / 1_000_000) * 3;
    const outputCost = ((stats.total_output_tokens ?? 0) / 1_000_000) * 15;
    const estimatedSavings = inputCost + outputCost;

    return jsonResponse({
      totalRequests,
      successRate: Math.round(successRate * 10) / 10,
      avgLatencyMs: Math.round(stats.avg_latency_ms ?? 0),
      totalTokens,
      estimatedSavings: Math.round(estimatedSavings * 100) / 100,
    });
  }

  // Requests over time
  if (path === '/api/analytics/requests-over-time' && req.method === 'GET') {
    const db = getDb();

    let groupBy: string;
    let dateFormat: string;
    switch (range) {
      case '24h':
        groupBy = "strftime('%Y-%m-%d %H:00', created_at)";
        dateFormat = '%Y-%m-%d %H:00';
        break;
      case '30d':
        groupBy = "date(created_at)";
        dateFormat = '%Y-%m-%d';
        break;
      default: // 7d
        groupBy = "date(created_at)";
        dateFormat = '%Y-%m-%d';
    }

    const rows = db.prepare(`
      SELECT
        strftime('${dateFormat}', created_at) as period,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success
      FROM requests
      WHERE created_at >= ${since}
      GROUP BY ${groupBy}
      ORDER BY period ASC
    `).all() as any[];

    return jsonResponse(rows.map(r => ({
      period: r.period,
      total: r.total,
      success: r.success,
    })));
  }

  // Platform stats
  if (path === '/api/analytics/platforms' && req.method === 'GET') {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        platform,
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        AVG(latency_ms) as avg_latency_ms,
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output
      FROM requests
      WHERE created_at >= ${since}
      GROUP BY platform
      ORDER BY total_requests DESC
    `).all() as any[];

    return jsonResponse(rows.map(r => ({
      platform: r.platform,
      totalRequests: r.total_requests,
      successRate: r.total_requests > 0
        ? Math.round((r.success_count / r.total_requests) * 1000) / 10
        : 0,
      avgLatencyMs: Math.round(r.avg_latency_ms ?? 0),
      totalTokens: (r.total_input ?? 0) + (r.total_output ?? 0),
    })));
  }

  // Model stats
  if (path === '/api/analytics/models' && req.method === 'GET') {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        platform,
        model_id,
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        AVG(latency_ms) as avg_latency_ms
      FROM requests
      WHERE created_at >= ${since}
      GROUP BY platform, model_id
      ORDER BY total_requests DESC
      LIMIT 20
    `).all() as any[];

    return jsonResponse(rows.map(r => ({
      platform: r.platform,
      modelId: r.model_id,
      totalRequests: r.total_requests,
      successRate: r.total_requests > 0
        ? Math.round((r.success_count / r.total_requests) * 1000) / 10
        : 0,
      avgLatencyMs: Math.round(r.avg_latency_ms ?? 0),
    })));
  }

  // Recent requests
  if (path === '/api/analytics/recent' && req.method === 'GET') {
    const db = getDb();
    const limit = parseInt(url.searchParams.get('limit') ?? '50');
    const rows = db.prepare(`
      SELECT *
      FROM requests
      WHERE created_at >= ${since}
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return jsonResponse(rows.map(r => ({
      id: r.id,
      platform: r.platform,
      modelId: r.model_id,
      status: r.status,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
      latencyMs: r.latency_ms,
      error: r.error,
      createdAt: r.created_at,
    })));
  }

  return new Response('Not Found', { status: 404 });
}
