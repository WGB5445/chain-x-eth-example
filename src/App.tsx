import { useEffect, useState } from 'react';
import { Deserializer, Network, SimpleTransaction } from '@aptos-labs/ts-sdk';
import { connectWalletSnippet } from './codeSnippets';
import { useAptosClient, useNetworkContext } from './main';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import WalletPopup from './WalletPopup';
import { setupAutomaticEthereumWalletDerivation } from '@aptos-labs/derived-wallet-ethereum';


// Aptos 网络配置
const APTOS_NETWORKS = {
  devnet: {
    name: 'Aptos Devnet',
    network: Network.DEVNET,
    description: 'Aptos 开发网络'
  },
  testnet: {
    name: 'Aptos Testnet', 
    network: Network.TESTNET,
    description: 'Aptos 测试网络'
  },
  mainnet: {
    name: 'Aptos Mainnet',
    network: Network.MAINNET,
    description: 'Aptos 主网'
  }
} as const;

type AptosNetworkType = keyof typeof APTOS_NETWORKS;

const fallbackVerifyingContract = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC';

const formatAddress = (value: string | null | undefined) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : '未连接';


function App() {
  const { selectedAptosNetwork, setSelectedAptosNetwork } = useNetworkContext();
  const aptosClient = useAptosClient();
  // 交易相关状态
  const [transferAmount, setTransferAmount] = useState<string>('1000');
  const [transferRecipient, setTransferRecipient] = useState<string>('0x1');
  const [message, setMessage] = useState('Hello Aptos!');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [showWalletPopup, setShowWalletPopup] = useState(false);

  const { wallets = [], notDetectedWallets = [], connected, wallet, disconnect, account,network, signMessage, signTransaction} = useWallet();

  useEffect(() => {
    setupAutomaticEthereumWalletDerivation({ defaultNetwork: selectedAptosNetwork });
  }, [selectedAptosNetwork]);

  const handleWalletConnect = (walletName: string, address: string) => {
    setStatus(`钱包 ${walletName} 连接成功：${formatAddress(address)}`);
  };

  const handleWalletDisconnect = async () => {
    try {
      disconnect();
      setStatus('钱包已断开连接');
    } catch (error) {
      console.error('断开连接失败:', error);
    }
  };



  const switchAptosNetwork = (networkType: AptosNetworkType) => {
    try {
      setError('');
      const network = APTOS_NETWORKS[networkType];
      setSelectedAptosNetwork(network.network);
      setStatus(`已切换到 ${network.name}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      setError(reason);
    }
  };

  // 转账交易
  const signTransferTransaction = async () => {
    try {
      setError('');
      setIsSigning(true);

      if (!account) {
        throw new Error('请先连接钱包');
      }

      const { authenticator, rawTransaction } = await signTransaction({
        transactionOrPayload: {
          data: {
            function: "0x1::aptos_account::transfer",
            functionArguments: [
              transferRecipient,
              parseInt(transferAmount)
            ]
          },
          options: {
            maxGasAmount: 1500,
            gasUnitPrice: 100,
          }
        }
      });

      const response = await aptosClient.transaction.submit.simple({
        transaction: SimpleTransaction.deserialize(new Deserializer(rawTransaction)),
        senderAuthenticator: authenticator
      });

      const transactionData = {
        type: 'transfer',
        hash: response.hash,
        amount: transferAmount,
        recipient: transferRecipient,
        timestamp: new Date().toISOString()
      };

      setLastTransaction(transactionData);
      setTransactionHistory(prev => [transactionData, ...prev]);
      setStatus(`转账交易已提交！交易哈希: ${response.hash}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      setError(reason);
    } finally {
      setIsSigning(false);
    }
  };


  // 消息签名
  const signMessageTransaction = async () => {
    try {
      setError('');
      setIsSigning(true);

      if (!account) {
        throw new Error('请先连接钱包');
      }

      const signature = await signMessage({
        message: message,
        nonce: '',
        address: true,
        application: true,
        chainId: true,
      });

      const messageData = {
        type: 'message',
        message: message,
        signature: signature,
        timestamp: new Date().toISOString()
      };

      setLastTransaction(messageData);
      setTransactionHistory(prev => [messageData, ...prev]);
      setStatus(`消息签名完成！签名: ${signature.toString().slice(0, 20)}...`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      setError(reason);
    } finally {
      setIsSigning(false);
    }
  };

  // 自定义交易（调用合约函数）
  const signCustomTransaction = async () => {
    try {
      setError('');
      setIsSigning(true);

      if (!account) {
        throw new Error('请先连接钱包');
      }

      const { authenticator, rawTransaction } = await signTransaction({
        transactionOrPayload: {
          data: {
            function: "0x1::coin::transfer",
            functionArguments: [
              "0x1::aptos_coin::AptosCoin",
              transferRecipient,
              parseInt(transferAmount)
            ]
          },
          options: {
            maxGasAmount: 2000,
            gasUnitPrice: 100,
          }
        }
      });

      const response = await aptosClient.transaction.submit.simple({
        transaction: SimpleTransaction.deserialize(new Deserializer(rawTransaction)),
        senderAuthenticator: authenticator
      });

      const customData = {
        type: 'custom',
        hash: response.hash,
        function: "0x1::coin::transfer",
        arguments: [transferRecipient, transferAmount],
        timestamp: new Date().toISOString()
      };

      setLastTransaction(customData);
      setTransactionHistory(prev => [customData, ...prev]);
      setStatus(`自定义交易已提交！交易哈希: ${response.hash}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      setError(reason);
    } finally {
      setIsSigning(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl shadow-slate-900/15 p-8 grid gap-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Aptos 交易签名演示</h1>
          <p className="text-slate-600 leading-relaxed">
            使用 Aptos 钱包体验不同类型的交易签名，包括转账、消息签名和自定义交易。页面展示核心 React + Aptos SDK 代码，帮助你快速在项目中复用。
          </p>
        </header>

        <section className="card">
          <div className="actions">
            <button 
              onClick={() => setShowWalletPopup(true)}
              className={`px-5 py-3 rounded-xl border-2 font-semibold transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${
                connected 
                  ? 'wallet-selected' 
                  : 'wallet-unselected'
              }`}
            >
              {connected && wallet ? (
                <div className="wallet-button-content">
                  <span className="wallet-icon-small">✓</span>
                  <span className="wallet-name">{wallet.name}</span>
                  <span className="wallet-address-small">{formatAddress(account?.address.toString() || '')}</span>
                </div>
              ) : (
                '选择钱包'
              )}
            </button>
            <button 
              onClick={() => setTransactionHistory([])} 
              disabled={transactionHistory.length === 0}
              className="px-5 py-3 rounded-xl border-0 font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200"
            >
              清空交易历史
            </button>
          </div>
          
          <div className="flex gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <label htmlFor="aptos-network-select" className="font-bold text-slate-700">
                Aptos 网络：
              </label>
              <select
                id="aptos-network-select"
                value={Object.keys(APTOS_NETWORKS).find(key => APTOS_NETWORKS[key as AptosNetworkType].network === selectedAptosNetwork) || 'testnet'}
                onChange={(e) => switchAptosNetwork(e.target.value as AptosNetworkType)}
                className="px-3 py-2 rounded border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(APTOS_NETWORKS).map(([key, network]) => (
                  <option key={key} value={key}>
                    {network.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="state-grid">
            <div className="text-sm">
              <strong>当前账户：</strong>
              <span className="font-mono text-slate-600">{formatAddress(account?.address.toString())}</span>
            </div>
            <div className="text-sm">
              <strong>链 ID：</strong>
              <span className="font-mono text-slate-600">{network?.chainId ?? '未连接'}</span>
            </div>
            <div className="text-sm">
              <strong>Aptos 网络：</strong>
              <span className="text-slate-600">{Object.values(APTOS_NETWORKS).find(network => network.network === selectedAptosNetwork)?.name || '未知网络'}</span>
            </div>
            <span className="tag">
              {window.ethereum?.isMetaMask ? 'MetaMask 检测到' : '浏览器钱包状态未知'}
            </span>
          </div>
          
          {connected && wallet && (
            <div className="wallet-status-card">
              <div className="wallet-status-header">
                <div className="wallet-status-icon">✓</div>
                <div className="wallet-status-info">
                  <h3>钱包已连接</h3>
                  <p className="wallet-name">{wallet.name}</p>
                </div>
                <button 
                  className="disconnect-btn" 
                  onClick={handleWalletDisconnect}
                  title="断开连接"
                >
                  断开连接
                </button>
              </div>
              <div className="wallet-address-display">
                <span className="address-label">地址：</span>
                <span className="address-value">{account?.address.toString()}</span>
                <button 
                  className="copy-address-btn" 
                  onClick={() => navigator.clipboard.writeText(account?.address.toString() || '')}
                  title="复制地址"
                >
                  📋
                </button>
              </div>
            </div>
          )}
          {status && <small className="text-slate-500 text-sm">{status}</small>}
          {error && <small className="text-red-600 text-sm">{error}</small>}
        </section>

        <section className="card">
          <h2 className="text-xl font-bold text-slate-800 m-0">1. 转账交易</h2>
          <p className="text-slate-600 m-0">使用 Aptos 账户模块进行简单的 APT 转账。</p>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="block mb-2 font-bold text-slate-700">接收地址：</label>
              <input
                value={transferRecipient}
                onChange={(e) => setTransferRecipient(e.target.value)}
                placeholder="0x1"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-36">
              <label className="block mb-2 font-bold text-slate-700">转账金额 (micro APT)：</label>
              <input
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="1000"
                type="number"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="actions">
            <button 
              onClick={signTransferTransaction} 
              disabled={!account || isSigning}
              className="px-5 py-3 rounded-xl border-0 font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200 cursor-pointer"
            >
              {isSigning ? '签名中...' : '签名转账交易'}
            </button>
          </div>
          <pre className="m-0 p-4 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto text-xs leading-tight">
{`const { authenticator, rawTransaction } = await signTransaction({
  transactionOrPayload: {
    data: {
      function: "0x1::aptos_account::transfer",
      functionArguments: [recipient, amount]
    },
    options: { maxGasAmount: 1500, gasUnitPrice: 100 }
  }
});

const response = await aptosClient.transaction.submit.simple({
  transaction: SimpleTransaction.deserialize(new Deserializer(rawTransaction)),
  senderAuthenticator: authenticator
});`}
          </pre>
        </section>

        <section className="card">
          <h2 className="text-xl font-bold text-slate-800 m-0">2. 消息签名</h2>
          <p className="text-slate-600 m-0">签名任意消息，用于身份验证或授权。</p>
          <textarea 
            value={message} 
            onChange={(event) => setMessage(event.target.value)} 
            rows={3}
            placeholder="输入要签名的消息"
            className="w-full mb-4 p-3 rounded-xl border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="actions">
            <button 
              onClick={signMessageTransaction} 
              disabled={!account || isSigning}
              className="px-5 py-3 rounded-xl border-0 font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200"
            >
              {isSigning ? '签名中...' : '签名消息'}
            </button>
          </div>
          <pre className="m-0 p-4 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto text-xs leading-tight">
{`const signature = await signMessage({
  message: message,
  nonce: '',
  address: true,
  application: true,
  chainId: true,
});`}
          </pre>
        </section>

        <section className="card">
          <h2 className="text-xl font-bold text-slate-800 m-0">3. 自定义交易</h2>
          <p className="text-slate-600 m-0">调用智能合约函数，使用 Coin 模块进行代币转账。</p>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="block mb-2 font-bold text-slate-700">接收地址：</label>
              <input
                value={transferRecipient}
                onChange={(e) => setTransferRecipient(e.target.value)}
                placeholder="0x1"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-36">
              <label className="block mb-2 font-bold text-slate-700">转账金额：</label>
              <input
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="1000"
                type="number"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="actions">
            <button 
              onClick={signCustomTransaction} 
              disabled={!account || isSigning}
              className="px-5 py-3 rounded-xl border-0 font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200"
            >
              {isSigning ? '签名中...' : '签名自定义交易'}
            </button>
          </div>
          <pre className="m-0 p-4 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto text-xs leading-tight">
{`const { authenticator, rawTransaction } = await signTransaction({
  transactionOrPayload: {
    data: {
      function: "0x1::coin::transfer",
      functionArguments: [
        "0x1::aptos_coin::AptosCoin",
        recipient,
        amount
      ]
    },
    options: { maxGasAmount: 2000, gasUnitPrice: 100 }
  }
});`}
          </pre>
        </section>

        {transactionHistory.length > 0 && (
          <section className="card">
            <h2 className="text-xl font-bold text-slate-800 m-0">交易历史</h2>
            <div className="max-h-80 overflow-y-auto">
              {transactionHistory.map((tx, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-3 mb-2 bg-slate-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-bold ${
                      tx.type === 'transfer' ? 'text-green-600' : 
                      tx.type === 'message' ? 'text-blue-600' : 'text-purple-600'
                    }`}>
                      {tx.type === 'transfer' ? '转账交易' : tx.type === 'message' ? '消息签名' : '自定义交易'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(tx.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {tx.hash && (
                    <div className="text-sm font-mono break-all mb-1">
                      哈希: {tx.hash}
                    </div>
                  )}
                  {tx.signature && (
                    <div className="text-sm font-mono break-all mb-1">
                      签名: {tx.signature.slice(0, 40)}...
                    </div>
                  )}
                  {tx.amount && (
                    <div className="text-sm">
                      金额: {tx.amount} micro APT
                    </div>
                  )}
                  {tx.recipient && (
                    <div className="text-sm font-mono">
                      接收方: {tx.recipient}
                    </div>
                  )}
                  {tx.message && (
                    <div className="text-sm">
                      消息: {tx.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card">
          <h2 className="text-xl font-bold text-slate-800 m-0">快速测试流程</h2>
          <ol className="m-0 pl-5 space-y-1.5">
            <li className="text-slate-600">点击顶部"选择钱包"，连接 Aptos 钱包。</li>
            <li className="text-slate-600">选择网络（Devnet/Testnet/Mainnet）。</li>
            <li className="text-slate-600">尝试不同类型的交易签名。</li>
            <li className="text-slate-600">查看交易历史和结果。</li>
          </ol>
        </section>

        <section className="card">
          <h2 className="text-xl font-bold text-slate-800 m-0">体验编码逻辑</h2>
          <p className="text-slate-600 m-0 mb-4">下方代码片段展示了核心步骤，将它们复制到你的前端项目即可快速实现连接、签名与验证。</p>
          <pre className="m-0 p-4 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto text-xs leading-tight">{connectWalletSnippet}</pre>
        </section>

        <WalletPopup
          wallets={wallets as any}
          notDetectedWallets={notDetectedWallets as any}
          isOpen={showWalletPopup}
          onClose={() => setShowWalletPopup(false)}
          onWalletConnect={handleWalletConnect}
        />
      </div>
    </div>
  );
}

export default App;
