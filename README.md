# 链上签名教学示例

使用 Vite + React + ethers 快速体验浏览器钱包的三种常见签名方式，并在前端完成验签。界面采用中文说明，方便新手理解链上签名的作用与差异。

## 功能概览

- 一键连接浏览器钱包 (MetaMask 等注入式钱包)
- 支持多网络切换：Devnet、Sepolia Testnet、Ethereum Mainnet
- 提供三种签名按钮：纯文本、原始字节、EIP-712 结构化数据
- 每次签名后可立即点击"验证最近一次签名"进行验签
- 页面中嵌入关键代码片段，方便学习与复制到自己的项目

## 快速开始

> **注意**：首次运行前请执行 `npm install`，需要联网以下载依赖。

```bash
npm install
npm run dev
```

在浏览器访问终端输出的本地地址 (默认 `http://localhost:5173`) 即可。确保浏览器中已安装并解锁 MetaMask 或兼容钱包。

## 网络配置

### Aptos 网络配置

项目支持三种 Aptos 网络模式，通过环境变量 `VITE_APTOS_NETWORK` 控制：

- **devnet**: Aptos 开发网络
- **testnet**: Aptos 测试网络 (默认)
- **mainnet**: Aptos 主网

#### 配置方法

1. **创建环境变量文件** `.env.local`：
```bash
# 设置 Aptos 网络
VITE_APTOS_NETWORK=testnet

# 可选的 API Keys (用于更好的性能)
VITE_APTOS_API_KEY_DEVNET=your_devnet_api_key
VITE_APTOS_API_KEY_TESTNET=your_testnet_api_key  
VITE_APTOS_API_KEY_MAINNET=your_mainnet_api_key
```

2. **或者在启动时设置环境变量**：
```bash
VITE_APTOS_NETWORK=devnet pnpm run dev
VITE_APTOS_NETWORK=mainnet pnpm run dev
```

### 以太坊网络配置

项目还支持以太坊网络切换功能：

- **Devnet**: 本地开发网络 (Chain ID: 1337)
- **Sepolia Testnet**: 以太坊测试网 (Chain ID: 11155111)  
- **Ethereum Mainnet**: 以太坊主网 (Chain ID: 1)

如需使用自定义 RPC 节点，请修改 `src/App.tsx` 中的 `NETWORKS` 配置。

## 测试建议

1. 选择目标网络，点击"切换网络"按钮。
2. 连接钱包后，依次尝试三种签名方式。
3. 每完成一次签名，点击"验证最近一次签名"确认恢复地址是否与当前地址一致。
4. 在"原始字节签名"模块点击"生成新的随机挑战"，体验签名随挑战变化的效果。
5. 切换不同网络，观察链 ID 状态的变化以及仍可成功验签。

## 项目结构

```
.
├── src
│   ├── App.tsx          // 页面逻辑与 UI
│   ├── codeSnippets.ts  // 页面展示的代码片段
│   ├── main.tsx         // React 入口
│   ├── styles.css       // 基础样式
│   └── vite-env.d.ts    // 全局类型声明
├── index.html
├── package.json
└── vite.config.ts
```

## 后续扩展建议

- 引入 wagmi 或 RainbowKit 增强钱包管理体验。
- 将验签逻辑移动到后端，结合 JWT 或 Session 实现链上登录。
- 为每次签名记录时间与上下文，便于在业务系统中审计。
