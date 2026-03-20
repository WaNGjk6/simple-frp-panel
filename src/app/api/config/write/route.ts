import { NextResponse } from 'next/server';
import { stringify } from 'smol-toml';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();

    // 在写入 frps.toml 之前，强制剔除可能误传的 proxies 字段（确保服务端配置的纯净性）
    const { proxies, ...frpsConfigData } = requestBody;

    // 优先从环境变量读取配置路径，默认取项目根目录的 frps.toml
    const configPath = process.env.FRPS_CONFIG_PATH || path.join(process.cwd(), 'frps.toml');

    // 核心安全要求：检查原文件是否存在，存在则备份
    if (fs.existsSync(configPath)) {
      const backupPath = `${configPath}.bak`;
      fs.copyFileSync(configPath, backupPath);
      console.log(`[备份成功] 已将原配置备份至: ${backupPath}`);
    }

    // 将 JSON 数据序列化为 TOML 格式的字符串
    const tomlString = stringify(frpsConfigData);

    // 写入文件
    fs.writeFileSync(configPath, tomlString, 'utf-8');
    console.log(`[写入成功] 新配置已写入: ${configPath}`);

    return NextResponse.json({
      success: true,
      message: '配置已成功保存并备份',
    });
  } catch (error) {
    console.error('[写入失败] TOML 文件写入异常:', error);
    return NextResponse.json(
      {
        error: '写入配置文件失败',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
