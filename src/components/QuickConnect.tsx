"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Server, Download, Copy, Check, RefreshCw, Zap, ArrowLeft } from "lucide-react";
import { fetchConfig } from "@/lib/api";

interface GeneratedResult {
  configToml: string;
  startupScript: string;
  windowsScript: string;
  adminUser: string;
  adminPwd: string;
  exposePort: number;
}

interface QuickConnectProps {
  showMessage: (type: 'success' | 'error', text: string) => void;
  onBack: () => void;
}

export default function QuickConnect({ showMessage, onBack }: QuickConnectProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    serverAddr: "",
    serverPort: 7000,
    authToken: "",
    adminPort: 7400,
    adminUser: "admin",
    adminPwd: "",
    exposePort: 17400,
  });

  const loadServerConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchConfig();
      setFormData(prev => ({
        ...prev,
        serverAddr: "",
        serverPort: data.bindPort || 7000,
        authToken: data.auth?.token || "",
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      showMessage('error', `加载服务端配置失败: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadServerConfig();
  }, [loadServerConfig]);

  const handleGenerate = async () => {
    if (!formData.serverAddr) {
      showMessage('error', '请输入服务端地址');
      return;
    }
    if (!formData.authToken) {
      showMessage('error', '请输入认证 Token');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch('/api/clients/generate-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '生成配置失败');

      setGenerated(result.data);
      showMessage('success', '配置生成成功！请在目标服务器执行脚本');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      showMessage('error', message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, adminPwd: password }));
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      showMessage('error', '复制失败');
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-white/50 animate-spin" />
        <span className="ml-4 text-white/50">正在加载服务端配置...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          返回节点列表
        </button>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          快速接入配置
        </h2>
      </div>

      <p className="text-white/60 text-sm">
        填写以下信息，自动生成可在目标服务器一键运行的脚本，无需手动编辑配置文件。
      </p>

      {!generated ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel-dark p-6 rounded-2xl border border-white/10"
        >
          <div className="space-y-6">
            <div className="pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <Server className="w-5 h-5" />
                服务端连接信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">
                    服务端地址 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.serverAddr}
                    onChange={(e) => setFormData(prev => ({ ...prev, serverAddr: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-emerald-400/50 focus:outline-none"
                    placeholder="例如: frp.example.com 或 123.45.67.89"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">服务端端口</label>
                  <input
                    type="number"
                    value={formData.serverPort}
                    onChange={(e) => setFormData(prev => ({ ...prev, serverPort: parseInt(e.target.value) || 7000 }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-emerald-400/50 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/70 mb-1">
                    认证 Token <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.authToken}
                    onChange={(e) => setFormData(prev => ({ ...prev, authToken: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-emerald-400/50 focus:outline-none"
                    placeholder="必须与服务端 frps.toml 中的 token 一致"
                  />
                </div>
              </div>
            </div>

            <div className="pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                <Server className="w-5 h-5" />
                本地 Admin API 配置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Admin 端口</label>
                  <input
                    type="number"
                    value={formData.adminPort}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminPort: parseInt(e.target.value) || 7400 }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-indigo-400/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Admin 用户名</label>
                  <input
                    type="text"
                    value={formData.adminUser}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminUser: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-indigo-400/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Admin 密码</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={formData.adminPwd}
                      onChange={(e) => setFormData(prev => ({ ...prev, adminPwd: e.target.value }))}
                      className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-indigo-400/50 focus:outline-none"
                      placeholder="留空则自动生成"
                    />
                    <button
                      onClick={handleRegeneratePassword}
                      className="px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 rounded-lg transition-all"
                      title="重新生成"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">
                    映射到公网的端口 <span className="text-yellow-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.exposePort}
                    onChange={(e) => setFormData(prev => ({ ...prev, exposePort: parseInt(e.target.value) || 17400 }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-indigo-400/50 focus:outline-none"
                  />
                  <p className="text-xs text-white/40 mt-1">请确保此端口在服务端防火墙开放</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 hover:from-emerald-500/30 hover:to-indigo-500/30 text-white border border-emerald-500/30 rounded-xl transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  正在生成配置...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  生成配置和启动脚本
                </>
              )}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="glass-panel-dark p-6 rounded-2xl border border-emerald-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-400">配置生成成功！</h3>
                <p className="text-sm text-white/60">请在目标服务器执行以下脚本</p>
              </div>
            </div>

            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/50">Admin 用户名:</span>
                  <span className="ml-2 text-white font-mono">{generated.adminUser}</span>
                </div>
                <div>
                  <span className="text-white/50">Admin 密码:</span>
                  <span className="ml-2 text-white font-mono">{generated.adminPwd}</span>
                </div>
                <div>
                  <span className="text-white/50">映射端口:</span>
                  <span className="ml-2 text-yellow-400 font-mono">{generated.exposePort}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 mb-4 border border-white/10">
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                一键命令（复制到服务器执行）
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded">Linux</span>
                  <code className="flex-1 text-xs text-blue-300 bg-black/40 px-3 py-2 rounded truncate font-mono">
                    {`curl -sSL https://ghfast.top/https://raw.githubusercontent.com/WaNGjk6/simple-frp-panel/main/scripts/frpc-quick.sh | bash -s -- ${formData.serverAddr} ${formData.serverPort} ${formData.authToken} ${generated.exposePort}`}
                  </code>
                  <button
                    onClick={() => copyToClipboard(`curl -sSL https://ghfast.top/https://raw.githubusercontent.com/WaNGjk6/simple-frp-panel/main/scripts/frpc-quick.sh | bash -s -- ${formData.serverAddr} ${formData.serverPort} ${formData.authToken} ${generated.exposePort}`, 'linuxCmd')}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors"
                  >
                    {copied === 'linuxCmd' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">Windows</span>
                  <code className="flex-1 text-xs text-purple-300 bg-black/40 px-3 py-2 rounded truncate font-mono">
                    powershell -ExecutionPolicy Bypass -Command &quot;irm https://ghfast.top/https://raw.githubusercontent.com/WaNGjk6/simple-frp-panel/main/scripts/frpc-quick.ps1 | iex&quot;
                  </code>
                  <button
                    onClick={() => copyToClipboard(`powershell -ExecutionPolicy Bypass -Command "irm https://ghfast.top/https://raw.githubusercontent.com/WaNGjk6/simple-frp-panel/main/scripts/frpc-quick.ps1 | iex"`, 'winCmd')}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors"
                  >
                    {copied === 'winCmd' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/40 mt-3">
                💡 一键命令会自动下载脚本并执行，适合快速部署。如需自定义配置，可下载脚本后手动执行。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => downloadFile(generated.configToml, 'frpc.toml')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/30 rounded-lg transition-all"
              >
                <Download className="w-4 h-4" />
                下载 frpc.toml
              </button>
              <button
                onClick={() => downloadFile(generated.startupScript, 'frpc-quick-start.sh')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-200 border border-blue-500/30 rounded-lg transition-all"
              >
                <Download className="w-4 h-4" />
                下载 Linux 脚本
              </button>
              <button
                onClick={() => downloadFile(generated.windowsScript, 'frpc-quick-start.ps1')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 border border-purple-500/30 rounded-lg transition-all"
              >
                <Download className="w-4 h-4" />
                下载 Windows 脚本
              </button>
              <button
                onClick={() => setGenerated(null)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                重新生成
              </button>
            </div>
          </div>

          <div className="glass-panel-dark p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">生成的 frpc.toml</h3>
              <button
                onClick={() => copyToClipboard(generated.configToml, 'toml')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 rounded-lg transition-all text-sm"
              >
                {copied === 'toml' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied === 'toml' ? '已复制' : '复制'}
              </button>
            </div>
            <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-sm text-emerald-300 font-mono max-h-64 overflow-y-auto">
              {generated.configToml}
            </pre>
          </div>

          <div className="glass-panel-dark p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Linux/macOS 启动脚本</h3>
              <button
                onClick={() => copyToClipboard(generated.startupScript, 'script')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 rounded-lg transition-all text-sm"
              >
                {copied === 'script' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied === 'script' ? '已复制' : '复制'}
              </button>
            </div>
            <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-sm text-blue-300 font-mono max-h-64 overflow-y-auto">
              {generated.startupScript}
            </pre>
          </div>
        </motion.div>
      )}
    </div>
  );
}
