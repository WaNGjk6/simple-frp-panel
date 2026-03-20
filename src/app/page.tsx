"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Server, Activity, Save, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { fetchConfig, saveConfig, restartService, FrpsConfig } from "@/lib/api";
import GlobalSettings from "@/components/GlobalSettings";
import ClientNodes from "@/components/ClientNodes";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"global" | "clients">("global");
  const [config, setConfig] = useState<FrpsConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 初始化加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const data = await fetchConfig();
      setConfig(data);
    } catch (error: any) {
      showMessage('error', `加载配置失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setIsSaving(true);
      await saveConfig(config);
      showMessage('success', '配置已成功保存并备份');
    } catch (error: any) {
      showMessage('error', `保存失败: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestart = async () => {
    try {
      setIsRestarting(true);
      const res = await restartService();
      showMessage('success', `服务重启成功: ${res.output}`);
    } catch (error: any) {
      showMessage('error', `重启失败: ${error.message}`);
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8">
      {/* 顶部全局消息提示 */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl border backdrop-blur-md flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-500/20 border-green-500/50 text-green-100' 
                : 'bg-red-500/20 border-red-500/50 text-red-100'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anime 风格：头部悬浮导航栏 */}
      <header className="w-full max-w-7xl mx-auto glass-panel rounded-2xl px-6 py-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 z-10 relative">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-glow flex items-center gap-3">
            <Activity className="w-6 h-6 md:w-8 md:h-8 text-white/90" />
            Frps Web-UI
          </h1>
          
          {/* 状态指示灯 */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 border border-white/10 backdrop-blur-md">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </div>
            <span className="text-xs font-medium text-white/90 tracking-wide">运行中</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 顶部悬浮 Tabs */}
          <nav className="flex gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("global")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-all duration-300 ${
                activeTab === "global"
                  ? "bg-white/20 text-white shadow-lg border border-white/20"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="font-medium text-sm">服务端配置 (frps)</span>
            </button>
            
            <button
              onClick={() => setActiveTab("clients")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-all duration-300 ${
                activeTab === "clients"
                  ? "bg-white/20 text-white shadow-lg border border-white/20"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Server className="w-4 h-4" />
              <span className="font-medium text-sm">客户端管理 (frpc)</span>
            </button>
          </nav>

          <div className="h-8 w-px bg-white/20 hidden md:block"></div>

          {/* 全局操作按钮 (仅在服务端配置页显示保存/重启) */}
          <AnimatePresence>
            {activeTab === "global" && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }} 
                animate={{ opacity: 1, width: 'auto' }} 
                exit={{ opacity: 0, width: 0 }}
                className="flex gap-2 overflow-hidden"
              >
                <button
                  onClick={handleSave}
                  disabled={isSaving || isLoading || !config}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-100 border border-blue-500/30 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="font-medium text-sm">保存配置</span>
                </button>
                <button
                  onClick={handleRestart}
                  disabled={isRestarting || isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/40 text-orange-100 border border-orange-500/30 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isRestarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span className="font-medium text-sm">重启服务端</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 w-full max-w-7xl mx-auto glass-panel rounded-3xl overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-20">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-10 h-10 text-white/80 animate-spin" />
              <p className="text-white/80 tracking-widest font-medium">正在读取配置维度...</p>
            </div>
          </div>
        ) : config ? (
          <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="absolute inset-0 p-6 md:p-10 overflow-y-auto custom-scrollbar"
              >
                {activeTab === "global" ? (
                  <GlobalSettings config={config} onChange={setConfig} />
                ) : (
                  <ClientNodes showMessage={showMessage} />
                )}
              </motion.div>
            </AnimatePresence>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-red-400">无法加载配置数据，请检查后端服务。</p>
          </div>
        )}
      </main>
    </div>
  );
}
