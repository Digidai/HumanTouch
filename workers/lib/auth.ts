export interface Env {
  JWT_SECRET?: string;
  API_KEY_PREFIX?: string;
  ALLOWED_API_KEYS?: string;
  MOONSHOT_API_KEY?: string;
  MOONSHOT_MODEL?: string;
  MAX_TEXT_LENGTH?: string;
  DETECTOR_MODE?: string;
  ZEROGPT_API_KEY?: string;
  GPTZERO_API_KEY?: string;
  COPYLEAKS_API_KEY?: string;
  WEBHOOK_SECRET?: string;
}

export interface AuthResult {
  valid: boolean;
  userId?: string;
  permissions?: string[];
  error?: string;
}

export function validateApiKey(apiKey: string, env: Env): AuthResult {
  const prefix = env.API_KEY_PREFIX || 'hk_';
  
  if (!apiKey.startsWith(prefix)) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const allowed = env.ALLOWED_API_KEYS;
  
  if (!allowed) {
    console.warn('[Auth] ALLOWED_API_KEYS not configured. Accepting any key with correct prefix.');
    return {
      valid: true,
      userId: 'dev-user',
      permissions: ['process', 'validate', 'batch', 'async', 'status'],
    };
  }

  const allowedKeys = allowed.split(',').map(k => k.trim()).filter(Boolean);
  if (!allowedKeys.includes(apiKey)) {
    return { valid: false, error: 'Invalid API key' };
  }

  return {
    valid: true,
    userId: 'api-key-user',
    permissions: ['process', 'validate', 'batch', 'async', 'status'],
  };
}

export function extractAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

export async function authMiddleware(
  request: Request,
  env: Env,
  requiredPermissions: string[] = []
): Promise<Response | null> {
  const token = extractAuthToken(request);
  
  if (!token) {
    return jsonResponse(
      { error: { code: 'INVALID_API_KEY', message: 'API密钥缺失' } },
      401
    );
  }

  const result = validateApiKey(token, env);
  
  if (!result.valid) {
    return jsonResponse(
      { error: { code: 'INVALID_API_KEY', message: result.error || '无效的API密钥' } },
      401
    );
  }

  const hasPermission = requiredPermissions.length === 0 ||
    requiredPermissions.some(perm => result.permissions?.includes(perm));

  if (!hasPermission) {
    return jsonResponse(
      { error: { code: 'INSUFFICIENT_PERMISSIONS', message: '权限不足' } },
      403
    );
  }

  return null;
}

export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}
