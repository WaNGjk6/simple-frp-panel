"use client";

import { useState } from "react";
import { ProxyRule } from "@/lib/api";
import { Plus, Trash2, Edit, Save, X, Globe, Network } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProxiesManagementProps {
  proxies: ProxyRule[];
  onChange: (newProxies: ProxyRule[]) => void;
}

export default function ProxiesManagement({ proxies, onChange }: ProxiesManagementProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProxyRule>>({});

  const handleAdd = () => {
    const newRule: ProxyRule = { name: `new_proxy_${Date.now()}`, type: "tcp" };
    onChange([...proxies, newRule]);
    setEditingIndex(proxies.length);
    setEditForm(newRule);
  };

  const handleDelete = (index: number) => {
    if (confirm("确定要删除这条代理规则吗？")) {
      const newProxies = [...proxies];
      newProxies.splice(index, 1);
      onChange(newProxies);
      if (editingIndex === index) {
        setEditingIndex(null);
      } else if (editingIndex !== null && editingIndex > index) {
        setEditingIndex(editingIndex - 1);
      }
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...proxies[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      const newProxies = [...proxies];
      newProxies[editingIndex] = editForm as ProxyRule;
      onChange(newProxies);
      setEditingIndex(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white text-glow flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-400" />
          代理规则列表
        </h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-100 border border-indigo-500/30 rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          添加规则
        </button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {proxies.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-10 text-white/50 glass-panel-dark rounded-2xl border border-white/5"
            >
              暂无代理规则，点击右上角添加。
            </motion.div>
          )}

          {proxies.map((rule, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`glass-panel-dark rounded-2xl border transition-all ${
                editingIndex === index ? "border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-white/10 hover:border-white/20"
              }`}
            >
              {editingIndex === index ? (
                // 编辑模式
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                    <h3 className="text-lg font-bold text-indigo-300">编辑代理规则</h3>
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} className="p-2 bg-green-500/20 text-green-300 rounded hover:bg-green-500/40 transition-colors" title="保存">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={handleCancelEdit} className="p-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/40 transition-colors" title="取消">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/70 mb-1">规则名称 (name)</label>
                      <input
                        type="text"
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-indigo-400/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">协议类型 (type)</label>
                      <select
                        value={editForm.type || "tcp"}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as ProxyRule['type'] })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-indigo-400/50 focus:outline-none appearance-none"
                      >
                        {['tcp', 'udp', 'http', 'https', 'stcp', 'sudp'].map(t => (
                          <option key={t} value={t} className="bg-gray-900">{t.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {(editForm.type === 'tcp' || editForm.type === 'udp') && (
                      <div>
                        <label className="block text-sm text-white/70 mb-1">远程端口 (remotePort)</label>
                        <input
                          type="number"
                          value={editForm.remotePort || ""}
                          onChange={(e) => setEditForm({ ...editForm, remotePort: parseInt(e.target.value) || undefined })}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-indigo-400/50 focus:outline-none"
                          placeholder="例如: 6000"
                        />
                      </div>
                    )}

                    {(editForm.type === 'http' || editForm.type === 'https') && (
                      <div className="md:col-span-2">
                        <label className="block text-sm text-white/70 mb-1">自定义域名 (customDomains)</label>
                        <input
                          type="text"
                          value={editForm.customDomains?.join(", ") || ""}
                          onChange={(e) => {
                            const domains = e.target.value.split(",").map(d => d.trim()).filter(Boolean);
                            setEditForm({ ...editForm, customDomains: domains.length > 0 ? domains : undefined });
                          }}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-indigo-400/50 focus:outline-none"
                          placeholder="多个域名用逗号分隔，例如: test.com, app.test.com"
                        />
                      </div>
                    )}

                    {/* STCP/SUDP 专属参数 */}
                    {(editForm.type === 'stcp' || editForm.type === 'sudp') && (
                      <div className="md:col-span-2">
                        <label className="block text-sm text-white/70 mb-1">安全密钥 (secretKey)</label>
                        <input
                          type="text"
                          value={editForm.secretKey || ""}
                          onChange={(e) => setEditForm({ ...editForm, secretKey: e.target.value || undefined })}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-indigo-400/50 focus:outline-none"
                          placeholder="访客端必须提供相同的密钥才能连接"
                        />
                      </div>
                    )}

                    {/* 所有协议通常都需要指定内网目标 (localIp / localPort) */}
                    <div>
                      <label className="block text-sm text-white/70 mb-1">内网目标 IP (localIp)</label>
                      <input
                        type="text"
                        value={editForm.localIp || ""}
                        onChange={(e) => setEditForm({ ...editForm, localIp: e.target.value || undefined })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-indigo-400/50 focus:outline-none"
                        placeholder="默认为 127.0.0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/70 mb-1">内网目标端口 (localPort)</label>
                      <input
                        type="number"
                        value={editForm.localPort || ""}
                        onChange={(e) => setEditForm({ ...editForm, localPort: parseInt(e.target.value) || undefined })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-indigo-400/50 focus:outline-none"
                        placeholder="例如: 80, 3306"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // 展示模式
                <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <span className="font-mono font-bold text-indigo-300 text-sm uppercase">{rule.type}</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white tracking-wide">{rule.name}</h4>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-white/60">
                        {rule.remotePort && (
                          <span className="flex items-center gap-1"><Network className="w-3.5 h-3.5" /> Port: {rule.remotePort}</span>
                        )}
                        {rule.customDomains && (
                          <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {rule.customDomains.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(index)} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(index)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
