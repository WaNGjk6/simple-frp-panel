"use client";

import { useState, useEffect } from "react";
import { ClientNode, fetchClientNodes, saveClientNodes, ProxyRule } from "@/lib/api";
import { Plus, Trash2, Edit, Save, X, Server, Settings2, RefreshCw, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parse, stringify } from "smol-toml";
import ProxiesManagement from "./ProxiesManagement";
import QuickConnect from "./QuickConnect";

interface ClientNodesProps {
  showMessage: (type: 'success' | 'error', text: string) => void;
}

export default function ClientNodes({ showMessage }: ClientNodesProps) {
  const [nodes, setNodes] = useState<ClientNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ClientNode>>({});
  
  // 用于控制当前打开的“配置规则”面板
  const [activeProxyNodeId, setActiveProxyNodeId] = useState<string | null>(null);
  const [remoteProxies, setRemoteProxies] = useState<ProxyRule[]>([]);
  const [remoteConfigBase, setRemoteConfigBase] = useState<any>({}); // 保存远端除了 proxies 之外的基础配置
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [isRemoteSaving, setIsRemoteSaving] = useState(false);

  useEffect(() => {
    loadNodes();
  }, []);

  const loadNodes = async () => {
    try {
      setIsLoading(true);
      const data = await fetchClientNodes();
      setNodes(data);
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNodes = async (newNodes: ClientNode[]) => {
    try {
      setIsSaving(true);
      await saveClientNodes(newNodes);
      setNodes(newNodes);
      showMessage('success', '节点信息已保存');
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNode = () => {
    const newNode: ClientNode = {
      id: `node_${Date.now()}`,
      name: '新客户端节点',
      adminIp: '127.0.0.1',
      adminPort: 7400,
    };
    setEditingNodeId(newNode.id);
    setEditForm(newNode);
    setNodes([...nodes, newNode]);
  };

  const handleDeleteNode = (id: string) => {
    if (confirm("确定要删除这个节点吗？")) {
      const newNodes = nodes.filter(n => n.id !== id);
      handleSaveNodes(newNodes);
      if (editingNodeId === id) setEditingNodeId(null);
      if (activeProxyNodeId === id) setActiveProxyNodeId(null);
    }
  };

  const handleSaveEdit = () => {
    if (editingNodeId) {
      const newNodes = nodes.map(n => n.id === editingNodeId ? { ...n, ...editForm } as ClientNode : n);
      handleSaveNodes(newNodes);
      setEditingNodeId(null);
    }
  };

  // --- 远端 frpc 通信核心逻辑 ---

  const handleOpenProxies = async (nodeId: string) => {
    setActiveProxyNodeId(nodeId);
    setIsRemoteLoading(true);
    try {
      const res = await fetch('/api/frpc/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, action: 'getConfig' }),
      });
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || '获取远端配置失败');
      
      // frpc 返回的可能是原始 toml 文本，也可能是被 json 包装过的
      const tomlText = typeof result.data === 'string' ? result.data : result.data.content;
      
      // 使用 smol-toml 解析
      const parsed = parse(tomlText);
      
      // 提取 proxies，其他配置保留在 base 中
      const { proxies = [], ...baseConfig } = parsed as any;
      setRemoteProxies(proxies);
      setRemoteConfigBase(baseConfig);
      
    } catch (error: any) {
      showMessage('error', error.message);
      setActiveProxyNodeId(null); // 获取失败自动返回
    } finally {
      setIsRemoteLoading(false);
    }
  };

  const handleSaveRemoteProxies = async (newProxies: ProxyRule[]) => {
    setRemoteProxies(newProxies);
    setIsRemoteSaving(true);

    try {
      if (!activeProxyNodeId) throw new Error('未选中节点');

      const fullConfig = {
        ...remoteConfigBase,
        proxies: newProxies,
      };

      const tomlString = stringify(fullConfig);

      const updateRes = await fetch('/api/frpc/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: activeProxyNodeId, action: 'updateConfig', configData: tomlString }),
      });
      const updateResult = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateResult.error || '写入配置失败');

      const reloadRes = await fetch('/api/frpc/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: activeProxyNodeId, action: 'reload' }),
      });
      const reloadResult = await reloadRes.json();
      if (!reloadRes.ok) throw new Error(reloadResult.error || '重载配置失败');

      showMessage('success', '代理规则已保存并成功热重载！');

    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setIsRemoteSaving(false);
    }
  };

  if (showQuickConnect) {
    return (
      <QuickConnect
        showMessage={showMessage}
        onBack={() => setShowQuickConnect(false)}
      />
    );
  }

  // 如果用户正在编辑代理规则，渲染复用的 ProxiesManagement 组件
  if (activeProxyNodeId) {
    const activeNode = nodes.find(n => n.id === activeProxyNodeId);
    if (!activeNode) return null;

    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => setActiveProxyNodeId(null)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
          >
            ← 返回节点列表
          </button>
          <h2 className="text-xl font-bold text-white">
            正在配置: <span className="text-emerald-400">{activeNode.name}</span>
          </h2>
        </div>
        
        {/* 这里复用之前做的那个完美的代理规则组件 */}
        {/* 注意：由于目前还没对接真实的 frpc API，这里的 onChange 只是演示控制台输出 */}
        <div className="glass-panel-dark p-6 rounded-2xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative">
          <div className="absolute top-0 right-0 px-4 py-1 bg-emerald-500/20 text-emerald-300 rounded-bl-xl rounded-tr-2xl text-xs font-bold flex items-center gap-2">
            {isRemoteLoading || isRemoteSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>}
            FRPC Admin 联机模式
          </div>
          
          {isRemoteLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-white/50">
              <RefreshCw className="w-8 h-8 animate-spin mb-4" />
              正在读取远端节点配置...
            </div>
          ) : (
            <ProxiesManagement 
              proxies={remoteProxies} 
              onChange={handleSaveRemoteProxies} 
            />
          )}
        </div>
      </div>
    );
  }

  // 正常渲染节点列表
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white text-glow flex items-center gap-3">
            <Server className="w-6 h-6 text-emerald-400" />
            远端节点管理 (frpc)
          </h2>
          <p className="text-white/60 text-sm mt-1">通过穿透回来的 Admin API 远程管理各地的 frpc 客户端</p>
        </div>
        <button
          onClick={() => setShowQuickConnect(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-100 border border-yellow-500/30 rounded-xl transition-all shadow-lg"
        >
          <Zap className="w-4 h-4" />
          快速接入
        </button>
        <button
          onClick={handleAddNode}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-500/30 rounded-xl transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          添加节点
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><RefreshCw className="w-8 h-8 text-white/50 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {nodes.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-white/50 glass-panel-dark rounded-2xl border border-white/5">
                暂无客户端节点，请点击右上角添加。
              </motion.div>
            )}

            {nodes.map((node) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel-dark rounded-2xl border border-white/5 overflow-hidden group"
              >
                {editingNodeId === node.id ? (
                  <div className="p-6 bg-emerald-900/10">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                      <h3 className="text-lg font-bold text-emerald-400">编辑节点信息</h3>
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} disabled={isSaving} className="p-2 bg-green-500/20 text-green-300 rounded hover:bg-green-500/40 transition-colors">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingNodeId(null)} className="p-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/40 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-xs text-white/50 mb-1">节点名称</label>
                        <input type="text" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-400/50 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 mb-1">Admin IP / 域名</label>
                        <input type="text" value={editForm.adminIp || ""} onChange={(e) => setEditForm({ ...editForm, adminIp: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-400/50 outline-none" placeholder="127.0.0.1" />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 mb-1">Admin 端口</label>
                        <input type="number" value={editForm.adminPort || ""} onChange={(e) => setEditForm({ ...editForm, adminPort: parseInt(e.target.value) })} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-400/50 outline-none" placeholder="例如: 7400" />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 mb-1">Admin 账号</label>
                        <input type="text" value={editForm.adminUser || ""} onChange={(e) => setEditForm({ ...editForm, adminUser: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-400/50 outline-none" placeholder="admin" />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 mb-1">Admin 密码</label>
                        <input type="password" value={editForm.adminPwd || ""} onChange={(e) => setEditForm({ ...editForm, adminPwd: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-400/50 outline-none" placeholder="******" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Server className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">{node.name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-white/50 font-mono">
                          <span>{node.adminIp || '127.0.0.1'}:{node.adminPort}</span>
                          {node.adminUser && <span>User: {node.adminUser}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                      <button 
                        onClick={() => handleOpenProxies(node.id)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 border border-indigo-500/30 rounded-lg transition-all"
                      >
                        <Settings2 className="w-4 h-4" />
                        联机配置
                      </button>
                      <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingNodeId(node.id); setEditForm(node); }} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteNode(node.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}