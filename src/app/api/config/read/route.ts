import { NextResponse } from 'next/server';
import { parse } from 'smol-toml';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // 优先从项目根目录读取测试用的 frps.toml
    // 实际生产环境中可以配置环境变量指定完整路径
    const configPath = process.env.FRPS_CONFIG_PATH || path.join(process.cwd(), 'frps.toml');

    if (!fs.existsSync(configPath)) {
      return NextResponse.json(
        { error: '找不到 frps.toml 配置文件' },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(configPath, 'utf-8');
    const parsedData = parse(fileContent);

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error) {
    console.error('读取 TOML 文件失败:', error);
    return NextResponse.json(
      { error: '解析配置文件失败', details: String(error) },
      { status: 500 }
    );
  }
}
