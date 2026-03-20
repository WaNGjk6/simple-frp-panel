"use client";

import { FrpsConfig } from "@/lib/api";

interface GlobalSettingsProps {
  config: FrpsConfig;
  onChange: (newConfig: FrpsConfig) => void;
}

export default function GlobalSettings({ config, onChange }: GlobalSettingsProps) {
  const handleChange = (field: string, value: string | number) => {
    // 简单处理嵌套对象，如 'auth.token'
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      onChange({
        ...config,
        [parent]: {
          ...(config[parent as keyof FrpsConfig] as any || {}),
          [child]: value,
        },
      });
    } else {
      onChange({
        ...config,
        [field]: value,
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 端口配置卡片 */}
        <div className="glass-panel-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-400 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-blue-400">#</span> 基础端口
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">绑定端口 (bindPort)</label>
              <input
                type="number"
                value={config.bindPort || ''}
                onChange={(e) => handleChange('bindPort', parseInt(e.target.value))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/50 transition-all"
                placeholder="例如: 7000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">HTTP 虚拟主机端口 (vhostHTTPPort)</label>
              <input
                type="number"
                value={config.vhostHTTPPort || ''}
                onChange={(e) => handleChange('vhostHTTPPort', parseInt(e.target.value))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400/50 transition-all"
                placeholder="例如: 80"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">HTTPS 虚拟主机端口 (vhostHTTPSPort)</label>
              <input
                type="number"
                value={config.vhostHTTPSPort || ''}
                onChange={(e) => handleChange('vhostHTTPSPort', parseInt(e.target.value))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400/50 transition-all"
                placeholder="例如: 443"
              />
            </div>
          </div>
        </div>

        {/* 鉴权配置卡片 */}
        <div className="glass-panel-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-400 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-purple-400">#</span> 鉴权机制
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">安全令牌 (auth.token)</label>
              <input
                type="text"
                value={config.auth?.token || ''}
                onChange={(e) => handleChange('auth.token', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400/50 transition-all"
                placeholder="请输入高强度 Token"
              />
            </div>
            <p className="text-xs text-white/50 leading-relaxed mt-2">
              客户端连接 frps 时必须提供与此一致的 token，这是保障服务不被滥用的重要屏障。
            </p>
          </div>
        </div>

        {/* 域名与 TLS 证书配置卡片 (新增) */}
        <div className="glass-panel-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group md:col-span-2">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-emerald-400">#</span> 泛域名与 TLS 证书
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">泛域名 (subDomainHost)</label>
              <input
                type="text"
                value={config.subDomainHost || ''}
                onChange={(e) => handleChange('subDomainHost', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-400/50 transition-all"
                placeholder="例如: frp.example.com"
              />
              <p className="text-xs text-white/50 mt-1">配置后，客户端只需指定 subdomain="test" 即可解析为 test.frp.example.com</p>
            </div>
            {/* tcpmuxHTTPConnectPort 属于高级端口转发优化 */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">TCP 多路复用端口 (tcpmuxHTTPConnectPort)</label>
              <input
                type="number"
                value={config.tcpmuxHTTPConnectPort || ''}
                onChange={(e) => handleChange('tcpmuxHTTPConnectPort', parseInt(e.target.value) || '')}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-400/50 transition-all"
                placeholder="例如: 1337"
              />
              <p className="text-xs text-white/50 mt-1">当通过 HTTP 代理连接 frps 时使用</p>
            </div>
            {/* TLS 证书相关 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">TLS 证书路径 (tls.certFile)</label>
                <input
                  type="text"
                  value={config.tls?.certFile || ''}
                  onChange={(e) => handleChange('tls.certFile', e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-400/50 transition-all"
                  placeholder="例如: /etc/frp/server.crt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">TLS 私钥路径 (tls.keyFile)</label>
                <input
                  type="text"
                  value={config.tls?.keyFile || ''}
                  onChange={(e) => handleChange('tls.keyFile', e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-400/50 transition-all"
                  placeholder="例如: /etc/frp/server.key"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 仪表盘配置卡片 */}
        <div className="glass-panel-dark p-6 rounded-2xl border border-white/5 md:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-pink-400 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-pink-400">#</span> Web 仪表盘 (Dashboard)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">面板端口</label>
              <input
                type="number"
                value={config.webServer?.port || ''}
                onChange={(e) => handleChange('webServer.port', parseInt(e.target.value))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-pink-400/50 transition-all"
                placeholder="例如: 7500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">登录账号</label>
              <input
                type="text"
                value={config.webServer?.user || ''}
                onChange={(e) => handleChange('webServer.user', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-pink-400/50 transition-all"
                placeholder="例如: admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">登录密码</label>
              <input
                type="password"
                value={config.webServer?.password || ''}
                onChange={(e) => handleChange('webServer.password', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-pink-400/50 transition-all"
                placeholder="留空则无需密码"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
