const DEFAULT_TIMEOUT_MS = 3000;

export class HealthCheck {
  static async check() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      checks: {
        chrome: await this.checkChromeAPI(),
        firefox: await this.checkFirefoxAPI(),
        edge: await this.checkEdgeAPI(),
        github: await this.checkGitHubAPI()
      }
    };
  }

  static async checkChromeAPI() {
    return this.ping('https://www.googleapis.com/discovery/v1/apis/chromewebstore/v1/rest');
  }

  static async checkFirefoxAPI() {
    return this.ping('https://addons.mozilla.org/api/v5/addons/search/?q=gatekeeper');
  }

  static async checkEdgeAPI() {
    return this.ping('https://api.addons.microsoftedge.microsoft.com/v1/products', {
      allowUnauthorized: true
    });
  }

  static async checkGitHubAPI() {
    return this.ping('https://api.github.com/rate_limit', {
      headers: {
        'User-Agent': 'gatekeeper-health-check'
      },
      allowUnauthorized: true
    });
  }

  static async ping(url, options = {}) {
    const { method = 'GET', headers = {}, allowUnauthorized = false, timeout = DEFAULT_TIMEOUT_MS } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        method,
        headers,
        signal: controller.signal
      });
      const latency = Date.now() - startedAt;
      const available = response.ok || (allowUnauthorized && response.status >= 400 && response.status < 500);

      return {
        available,
        latency,
        status: response.status
      };
    } catch (error) {
      return {
        available: false,
        latency: null,
        error: error.message
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
