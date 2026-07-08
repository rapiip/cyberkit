import { NextResponse } from 'next/server';
import { fetchWithTimeout, TIMEOUTS } from '@/lib/server/scanner';
import { logger } from '@/lib/server/logger';

export async function GET() {
  const providers = {
    redis: false,
    abuseIpDb: false,
    shodan: false,
    virusTotal: false,
    urlhaus: false,
  };

  try {
    // Redis (Upstash) Health
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    if (redisUrl) {
      try {
        const response = await fetchWithTimeout(
          `${redisUrl.replace(/\/$/, '')}/get/cyberkit:health`,
          { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } },
          TIMEOUTS.httpMs
        );
        providers.redis = response.ok;
      } catch (err) {
        logger.warn('Redis health check failed', { provider: 'redis', errorCategory: 'PROVIDER_ERROR' }, err);
      }
    }

    // AbuseIPDB Health (Requires API Key)
    if (process.env.ABUSEIPDB_API_KEY) {
      providers.abuseIpDb = true; // Minimal check just to confirm config, avoids wasting quota
    }

    // Shodan Health
    if (process.env.SHODAN_API_KEY) {
      providers.shodan = true;
    }

    // VirusTotal Health
    if (process.env.VIRUSTOTAL_API_KEY) {
      providers.virusTotal = true;
    }

    // URLhaus Health
    if (process.env.URLHAUS_AUTH_KEY) {
      providers.urlhaus = true;
    }

    // The core service is considered "ok" even if optional providers fail (partial degradation)
    return NextResponse.json({
      status: 'ok',
      providers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed', { errorCategory: 'SYSTEM_ERROR' }, error);
    // Return 200 even on error to not fail the load balancer if this is used as a readiness probe,
    // since the app uses partial degradation.
    return NextResponse.json({
      status: 'degraded',
      providers,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  }
}
