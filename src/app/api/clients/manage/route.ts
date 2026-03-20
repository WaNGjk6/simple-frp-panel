import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 节点数据结构
export interface ClientNode {
  id: string;
  name: string;
  adminPort: number;
  adminUser?: string;
  adminPwd?: string;
  // 备用：节点状态或备注
  remark?: string;
}

const getClientsFilePath = () => {
  return path.join(process.cwd(), 'clients.json');
};

// 读取客户端节点列表
export async function GET() {
  try {
    const filePath = getClientsFilePath();
    if (!fs.existsSync(filePath)) {
      // 如果文件不存在，返回空数组
      return NextResponse.json({ success: true, data: [] });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json({
      success: true,
      data: data as ClientNode[],
    });
  } catch (error) {
    console.error('读取 clients.json 失败:', error);
    return NextResponse.json(
      { error: '解析节点数据失败', details: String(error) },
      { status: 500 }
    );
  }
}

// 覆盖写入/更新客户端节点列表
export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const filePath = getClientsFilePath();

    // 如果原文件存在，做个简单备份
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, `${filePath}.bak`);
    }

    // 格式化并写入 JSON 文件
    fs.writeFileSync(filePath, JSON.stringify(requestBody, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: '节点列表已成功保存',
    });
  } catch (error) {
    console.error('写入 clients.json 失败:', error);
    return NextResponse.json(
      { error: '保存节点数据失败', details: String(error) },
      { status: 500 }
    );
  }
}
