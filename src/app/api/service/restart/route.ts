import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

// 将 child_process.exec 转换为 Promise 以支持 async/await
const execPromise = util.promisify(exec);

export async function POST() {
  try {
    // 【生产环境准备】
    // 在真实部署（如 Linux 环境）时，请取消注释下一行，并注释掉本地模拟命令
    const command = 'sudo systemctl restart frps';

    // 【本地开发适配】
    // 由于本地开发环境没有真实的 frps 服务，这里使用 echo 命令模拟重启成功的行为
    //const command = 'echo "模拟重启：frps restarted successfully"';

    console.log(`[服务控制] 准备执行重启命令: ${command}`);

    // 执行系统命令
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.warn(`[服务控制] 命令执行输出警告或错误日志: ${stderr}`);
    } else {
      console.log(`[服务控制] 命令执行成功: ${stdout.trim()}`);
    }

    return NextResponse.json({
      success: true,
      output: stdout.trim(),
      errorOutput: stderr ? stderr.trim() : null,
    });
  } catch (error: any) {
    console.error('[服务控制] 重启服务失败:', error);
    
    return NextResponse.json(
      {
        error: '服务重启执行失败',
        details: error.message || String(error),
        output: error.stdout ? error.stdout.trim() : null,
        errorOutput: error.stderr ? error.stderr.trim() : null,
      },
      { status: 500 }
    );
  }
}
