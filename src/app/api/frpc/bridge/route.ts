import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { nodeId, action, configData } = await request.json();

    if (!nodeId || !action) {
      return NextResponse.json({ error: 'Missing nodeId or action' }, { status: 400 });
    }

    // 1. 查表获取凭证
    const clientsFilePath = path.join(process.cwd(), 'clients.json');
    if (!fs.existsSync(clientsFilePath)) {
      return NextResponse.json({ error: 'clients.json not found' }, { status: 404 });
    }

    const clients = JSON.parse(fs.readFileSync(clientsFilePath, 'utf-8'));
    const node = clients.find((c: any) => c.id === nodeId);

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // 2. 构造 Basic Auth
    const { adminIp = '127.0.0.1', adminPort, adminUser = '', adminPwd = '' } = node;
    const authHeader = 'Basic ' + Buffer.from(`${adminUser}:${adminPwd}`).toString('base64');
    
    // 基础请求配置
    const baseUrl = `http://${adminIp}:${adminPort}`;
    const headers: Record<string, string> = {
      'Authorization': authHeader,
    };

    // 3. 精准路由分发
    let response;
    
    try {
      if (action === 'getConfig') {
        response = await fetch(`${baseUrl}/api/config`, {
          method: 'GET',
          headers,
        });
      } 
      else if (action === 'updateConfig') {
        headers['Content-Type'] = 'text/plain'; // frpc 接收的是原始 toml 文本
        response = await fetch(`${baseUrl}/api/config`, {
          method: 'PUT',
          headers,
          body: configData,
        });
      } 
      else if (action === 'reload') {
        response = await fetch(`${baseUrl}/api/reload`, {
          method: 'GET',
          headers,
        });
      } 
      else {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      // 检查远端 frpc API 的响应状态
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error from frpc');
        return NextResponse.json(
          { error: `frpc API error: ${response.status} ${response.statusText}`, details: errorText },
          { status: response.status }
        );
      }

      // 返回成功结果
      const data = await response.text();
      
      // 尝试解析 JSON（以防 frpc 某些接口返回的是 json）
      try {
        return NextResponse.json({ success: true, data: JSON.parse(data) });
      } catch {
        return NextResponse.json({ success: true, data }); // 如果不是 json（比如 getConfig 返回的是 toml 文本），直接返回文本
      }

    } catch (fetchError: any) {
      // 捕获连接拒绝等网络错误
      console.error(`Fetch to frpc (${baseUrl}) failed:`, fetchError);
      
      if (fetchError.code === 'ECONNREFUSED' || fetchError.message.includes('ECONNREFUSED')) {
        return NextResponse.json({ error: 'Node is offline or connection refused' }, { status: 502 });
      }
      
      return NextResponse.json({ error: 'Network error communicating with frpc', details: fetchError.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Bridge API error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
