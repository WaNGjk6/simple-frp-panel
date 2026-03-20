export interface FrpsConfig {
  bindPort?: number;
  vhostHTTPPort?: number;
  vhostHTTPSPort?: number;
  subDomainHost?: string;
  tcpmuxHTTPConnectPort?: number;
  tls?: {
    certFile?: string;
    keyFile?: string;
  };
  auth?: {
    token?: string;
  };
  webServer?: {
    port?: number;
    user?: string;
    password?: string;
  };
  proxies?: ProxyRule[];
  // 其他可能存在的未解析字段，保持原样
  [key: string]: any;
}

export interface ProxyRule {
  name: string;
  type: 'tcp' | 'udp' | 'http' | 'https' | 'tcpmux' | 'stcp' | 'sudp';
  localIp?: string;
  localPort?: number;
  remotePort?: number;
  customDomains?: string[];
  [key: string]: any;
}

/**
 * 从后端读取 TOML 配置
 */
export async function fetchConfig(): Promise<FrpsConfig> {
  const response = await fetch('/api/config/read', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || '读取配置失败');
  }

  const result = await response.json();
  return result.data as FrpsConfig;
}

/**
 * 将配置写入后端 TOML
 */
export async function saveConfig(config: FrpsConfig): Promise<void> {
  const response = await fetch('/api/config/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || '保存配置失败');
  }
}

/**
 * 触发后端重启 Frps 服务
 */
export async function restartService(): Promise<{ output: string; errorOutput?: string }> {
  const response = await fetch('/api/service/restart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || '服务重启失败');
  }

  return {
    output: result.output,
    errorOutput: result.errorOutput,
  };
}

// ==========================================
// 客户端节点管理相关 API
// ==========================================

export interface ClientNode {
  id: string;
  name: string;
  adminIp?: string;
  adminPort: number;
  adminUser?: string;
  adminPwd?: string;
  remark?: string;
}

/**
 * 获取本地存储的所有客户端节点列表
 */
export async function fetchClientNodes(): Promise<ClientNode[]> {
  const response = await fetch('/api/clients/manage', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || '读取节点列表失败');
  }

  const result = await response.json();
  return result.data as ClientNode[];
}

/**
 * 保存/更新客户端节点列表到本地 json
 */
export async function saveClientNodes(nodes: ClientNode[]): Promise<void> {
  const response = await fetch('/api/clients/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nodes),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || '保存节点列表失败');
  }
}
