# 🚀 FrpUi (Simple FRP Panel)

一款基于 Next.js 构建的简单的现代化 FRP 可视化管理面板。

告别繁琐的 `frpc.toml` 手动配置！FrpUi 让你可以通过优雅的网页端轻松管理 FRP 节点、自动分配端口，并为无公网 IP 的客户端实时生成**“一键接入脚本”**（完美支持 Windows 与 Linux）。

与其他类似的项目不同的是，不需要了解复杂的面板功能，极为简单

## ✨ 核心特性

- 🎨 **现代 UI**：基于 Next.js + TailwindCSS 构建的极暗二次元风格（可自定义）高颜值面板。
- ⚡ **一键接入**：网页端自动生成带参数的专属配置命令，客户端只需复制粘贴即可秒上线。
- 🐧 **全平台兼容**：自动识别并下载对应架构的 FRP（支持 x86_64, arm64 等），提供 Linux (Bash) 与 Windows (PowerShell) 一键脚本。
- 🛡️ **进程守护**：服务端与 Linux 客户端均采用 `systemd` 托管，开机自启，稳如磐石。
- 🚀 **国内加速**：内置 GitHub 加速镜像（ghproxy），国内服务器部署同样纵享丝滑。
- 📱 **移动端适配**：不方便用电脑？没关闭，我为你适配了移动端页面，也可以便捷的设置配置。

------

## 💻展示

#### Frps配置页

<img width="1872" height="948" alt="image" src="https://github.com/user-attachments/assets/55c2777c-d58c-49e0-acb5-fb896c9d46f4" />


#### Frpc配置页

<img width="1872" height="948" alt="image" src="https://github.com/user-attachments/assets/fffe33b8-2f3e-4cab-af38-d3570f444d44" />


<img width="1872" height="948" alt="image" src="https://github.com/user-attachments/assets/27656584-0bdf-4bd0-a0bb-09aa8673037b" />


<img width="1872" height="948" alt="image" src="https://github.com/user-attachments/assets/2e02200a-2215-4b63-bd10-6f048146cc5b" />


<img width="1872" height="948" alt="image" src="https://github.com/user-attachments/assets/dc015e90-5ebf-4392-a977-dcc4f4430a74" />


## 🛠️ 快速启动 (服务端部署)

我提供了一键部署脚本，会自动安装 Node.js、FRP、编译项目并配置 systemd 守护进程。

## 环境要求

- 操作系统：Debian / Ubuntu / CentOS
- 权限：必须使用 `root` 用户运行

## 一键部署命令（已配置为国内加速源）

在你的公网服务器终端中执行以下命令：

Bash

```
curl -sSL https://ghfast.top/https://raw.githubusercontent.com/WaNGjk6/simple-frp-panel/main/scripts/install-frpui.sh | sudo bash
```

## 部署后配置 (重要 ⚠️)

部署完成后，为了您的服务器安全，**建议**修改 FRP 的默认安全令牌：

1. 编辑配置文件：`nano /opt/frpui/frps.toml`

2. 将 `auth.token` 修改为您自己的复杂密码。

3. 重启服务端生效：`systemctl restart frps`

   **❗❗请注意，我不建议你将此 3000 端口暴露在公网上，正确的做法是，每次配置后在防火墙禁用此端口**

------

## 💻 客户端接入指南

服务端部署成功后，你可以通过浏览器访问面板并添加你的内网机器，**请先放行防火墙**。

1. **访问面板**：打开浏览器访问 `http://你的服务器公网IP:3000`。

2. **生成配置**：点击面板上的 **“快速接入”**，填写你的服务器 IP 和刚才修改的 Token，正情况下系统会自动分配映射端口和 IP ，请检查，如果不对请手动填写，**请记住这里你填写的信息**。

3. **一键运行**：在弹出的窗口中，复制系统为你生成的**一句话命令**

   ❗注意：如不修改第二步的 **映射到公网的端口** ，此方法默认将客户端管理端口映射到公网主机端口17400上进行管理。

4. **设备上线**：

   - **Linux 机器**：直接在终端粘贴执行（需 root 权限）。
   - **Windows 机器**：以管理员身份打开 PowerShell 并粘贴执行。

执行完毕后，待无公网ip服务器输出类似以下内容

=================

部署成功！

PID: 339762
Admin API: http://127.0.0.1:7400
远程管理: http://38.92.15.78:17400

=================

然后请在：**客户端管理**—**添加节点**—将 **Admin 端口**改为17400，**如果修改过第二步系统所配置的默认端口，则请按照你修改的信息填写。**



------

## ⚙️ 常用命令

部署成功后，系统已将服务注册为 `systemd` 守护进程，您可以使用以下命令进行管理：

- **查看面板运行状态**：`systemctl status frpui`
- **查看面板实时日志**：`journalctl -u frpui -f`
- **重启面板服务**：`systemctl restart frpui`
- **查看 FRP 服务端状态**：`systemctl status frps`

