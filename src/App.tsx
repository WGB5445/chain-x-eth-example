import { useEffect, useState } from 'react';
import { Deserializer, Network, SimpleTransaction } from '@aptos-labs/ts-sdk';
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
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  
  // Custom Transaction states
  const [customFunction, setCustomFunction] = useState<string>('0x1::coin::transfer');
  const [customGenericParams, setCustomGenericParams] = useState<string[]>(['0x1::aptos_coin::AptosCoin']);
  const [customArguments, setCustomArguments] = useState<string[]>(['0x1', '1000']);
  const [customMaxGas, setCustomMaxGas] = useState<string>('2000');
  const [customGasPrice, setCustomGasPrice] = useState<string>('100');

  const { wallets = [], notDetectedWallets = [], connected, wallet, disconnect, account,network, signMessage, signTransaction, signMessageAndVerify} = useWallet();

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

  // 复制到剪贴板
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${label} 已复制到剪贴板`);
    } catch (err) {
      setError(`复制失败: ${err}`);
    }
  };

  // Custom Transaction helper functions
  const addCustomGenericParam = () => {
    setCustomGenericParams([...customGenericParams, '']);
  };

  const removeCustomGenericParam = (index: number) => {
    setCustomGenericParams(customGenericParams.filter((_, i) => i !== index));
  };

  const updateCustomGenericParam = (index: number, value: string) => {
    const newParams = [...customGenericParams];
    newParams[index] = value;
    setCustomGenericParams(newParams);
  };

  const addCustomArgument = () => {
    setCustomArguments([...customArguments, '']);
  };

  const removeCustomArgument = (index: number) => {
    setCustomArguments(customArguments.filter((_, i) => i !== index));
  };

  const updateCustomArgument = (index: number, value: string) => {
    const newArgs = [...customArguments];
    newArgs[index] = value;
    setCustomArguments(newArgs);
  };

  const resetCustomTransaction = () => {
    setCustomFunction('0x1::coin::transfer');
    setCustomGenericParams(['0x1::aptos_coin::AptosCoin']);
    setCustomArguments(['0x1', '1000']);
    setCustomMaxGas('2000');
    setCustomGasPrice('100');
  };

  // 查看交易详情
  const viewTransactionDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
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

  // 签名转账交易（仅签名，不提交）
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

      const transactionData = {
        type: 'transfer_sign',
        authenticator: authenticator,
        rawTransaction: rawTransaction,
        amount: transferAmount,
        recipient: transferRecipient,
        timestamp: new Date().toISOString()
      };

      setLastTransaction(transactionData);
      setTransactionHistory(prev => [transactionData, ...prev]);
      setStatus(`转账交易已签名！签名: ${JSON.stringify(authenticator).slice(0, 50)}...`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      setError(reason);
    } finally {
      setIsSigning(false);
    }
  };

  // 签名并提交转账交易
  const submitTransferTransaction = async () => {
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
        type: 'transfer_submit',
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
  const signMessageAction = async () => {
    try {
      setError('');
      setIsSigning(true);

      if (!account) {
        throw new Error('请先连接钱包');
      }

      const signature = await signMessage({
        message: message,
        nonce: crypto.randomUUID().replaceAll("-", ""),
      });

      const messageData = {
        type: 'message',
        message: message,
        signature: signature,
        timestamp: new Date().toISOString()
      };

      setLastTransaction(messageData);
      setTransactionHistory(prev => [messageData, ...prev]);
      setStatus(`消息签名完成！签名: ${JSON.stringify(signature).slice(0, 50)}...`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      setError(reason);
    } finally {
      setIsSigning(false);
    }
  };
 
  const signMessageAndVerifyAction = async () => {
    try {
      setError('');
      setIsSigning(true);

      if (!account) {
        throw new Error('请先连接钱包');
      }

      const nonce = crypto.randomUUID().replaceAll("-", "");
      const signature = await signMessageAndVerify({
        message: message,
        nonce: nonce,
      });

      const messageData = {
        type: 'sign_verify',
        message: message,
        signature: signature,
        nonce: nonce,
        timestamp: new Date().toISOString()
      };

      setLastTransaction(messageData);
      setTransactionHistory(prev => [messageData, ...prev]);
      setStatus(`消息签名并验证完成！签名: ${JSON.stringify(signature).slice(0, 50)}...`);
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

      // 过滤空的泛型参数和函数参数
      const validGenericParams = customGenericParams.filter(param => param.trim() !== '');
      const validArguments = customArguments.filter(arg => arg.trim() !== '');

      const { authenticator, rawTransaction } = await signTransaction({
        transactionOrPayload: {
          data: {
            function: customFunction as `${string}::${string}::${string}`,
            typeArguments: validGenericParams as `${string}::${string}::${string}`[],
            functionArguments: validArguments
          },
          options: {
            maxGasAmount: parseInt(customMaxGas),
            gasUnitPrice: parseInt(customGasPrice),
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
        function: customFunction,
        typeArguments: validGenericParams,
        arguments: validArguments,
        maxGas: customMaxGas,
        gasPrice: customGasPrice,
        timestamp: new Date().toISOString()
      };

      setLastTransaction(customData);
      setTransactionHistory(prev => [customData, ...prev]);
      setStatus(`自定义交易已提交！交易哈希: ${response.hash}`);
      console.log(response)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      setError(reason);
    } finally {
      setIsSigning(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Aptos Wallet Demo</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={Object.keys(APTOS_NETWORKS).find(key => APTOS_NETWORKS[key as AptosNetworkType].network === selectedAptosNetwork) || 'testnet'}
                onChange={(e) => switchAptosNetwork(e.target.value as AptosNetworkType)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(APTOS_NETWORKS).map(([key, network]) => (
                  <option key={key} value={key}>
                    {network.name}
                  </option>
                ))}
              </select>
              
              <button 
                onClick={() => setShowWalletPopup(true)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  connected 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {connected && wallet ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{wallet.name}</span>
                    <span className="text-xs opacity-75">{formatAddress(account?.address.toString() || '')}</span>
                  </div>
                ) : (
                  'Connect Wallet'
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Wallet Status & Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Wallet Status Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Wallet Status</h2>
              
              {connected && wallet ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">{wallet.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{wallet.name}</p>
                      <p className="text-sm text-gray-500">Connected</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Address</p>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono text-gray-900 flex-1 truncate">
                        {account?.address.toString()}
                      </code>
                      <button 
                        onClick={() => navigator.clipboard.writeText(account?.address.toString() || '')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Chain ID</p>
                      <p className="font-mono">{network?.chainId ?? 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Network</p>
                      <p className="truncate">{Object.values(APTOS_NETWORKS).find(network => network.network === selectedAptosNetwork)?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleWalletDisconnect}
                    className="w-full px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No wallet connected</p>
                  <p className="text-sm text-gray-400 mt-1">Connect a wallet to get started</p>
                </div>
              )}
              
              {status && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 break-words overflow-wrap-anywhere">{status}</p>
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 break-words overflow-wrap-anywhere">{error}</p>
                </div>
              )}
            </div>

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                  <button 
                    onClick={() => setTransactionHistory([])} 
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {transactionHistory.slice(0, 5).map((tx, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-medium ${
                          tx.type === 'transfer_sign' ? 'text-green-600' : 
                          tx.type === 'transfer_submit' ? 'text-orange-600' : 
                          tx.type === 'message' ? 'text-blue-600' : 
                          tx.type === 'sign_verify' ? 'text-indigo-600' : 
                          tx.type === 'custom' ? 'text-purple-600' : 'text-gray-600'
                        }`}>
                          {tx.type === 'transfer_sign' ? 'Transfer Sign' : 
                           tx.type === 'transfer_submit' ? 'Transfer Submit' : 
                           tx.type === 'message' ? 'Message Sign' : 
                           tx.type === 'sign_verify' ? 'Sign & Verify' : 
                           tx.type === 'custom' ? 'Custom Transaction' : 'Unknown'}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </span>
                          <button
                            onClick={() => viewTransactionDetails(tx)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View
                          </button>
                        </div>
                      </div>
                      {tx.hash && (
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-xs font-mono text-gray-600 truncate flex-1">
                            Hash: {tx.hash}
                          </p>
                          <button
                            onClick={() => copyToClipboard(tx.hash, 'Transaction Hash')}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy Hash"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      )}
                      {tx.signature && (
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-xs font-mono text-gray-600 truncate flex-1">
                            Signature: {JSON.stringify(tx.signature).slice(0, 30)}...
                          </p>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(tx.signature), 'Signature')}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy Signature"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      )}
                      {tx.message && (
                        <p className="text-xs text-gray-600 truncate">
                          Message: {tx.message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Demo Actions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Sign Message */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sign Message</h2>
                  <p className="text-sm text-gray-500">Sign an arbitrary message for authentication</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message to Sign</label>
                  <textarea 
                    value={message} 
                    onChange={(event) => setMessage(event.target.value)} 
                    rows={3}
                    placeholder="Enter message to sign..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button 
                    onClick={signMessageAction} 
                    disabled={!account || isSigning}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSigning ? 'Signing...' : 'Sign Message'}
                  </button>
                  
                  <button 
                    onClick={signMessageAndVerifyAction} 
                    disabled={!account || isSigning}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSigning ? 'Signing...' : 'Sign & Verify'}
                  </button>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-900 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-300">
{`const signature = await signMessage({
  message: message,
  nonce: crypto.randomUUID().replaceAll("-", ""),
});`}
                </pre>
              </div>
            </div>

            {/* 2. Sign Transaction */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sign Transaction</h2>
                  <p className="text-sm text-gray-500">Sign a transaction without submitting to the network</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Address</label>
                    <input
                      value={transferRecipient}
                      onChange={(e) => setTransferRecipient(e.target.value)}
                      placeholder="0x1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (micro APT)</label>
                    <input
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="1000"
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button 
                    onClick={signTransferTransaction} 
                    disabled={!account || isSigning}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSigning ? 'Signing...' : 'Sign Transaction'}
                  </button>
                  
                  <button 
                    onClick={submitTransferTransaction} 
                    disabled={!account || isSigning}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSigning ? 'Submitting...' : 'Sign And Submit Transaction'}
                  </button>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-900 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-300">
{`const { authenticator, rawTransaction } = await signTransaction({
  transactionOrPayload: {
    data: {
      function: "0x1::aptos_account::transfer",
      functionArguments: [recipient, amount]
    },
    options: { maxGasAmount: 1500, gasUnitPrice: 100 }
  }
});

// For submission:
const response = await aptosClient.transaction.submit.simple({
  transaction: SimpleTransaction.deserialize(new Deserializer(rawTransaction)),
  senderAuthenticator: authenticator
});`}
                </pre>
              </div>
            </div>

            {/* 3. Custom Transaction */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Custom Transaction</h2>
                    <p className="text-sm text-gray-500">Sign and submit a custom smart contract transaction</p>
                  </div>
                </div>
                <button
                  onClick={resetCustomTransaction}
                  className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Function Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Function Name</label>
                  <input
                    value={customFunction}
                    onChange={(e) => setCustomFunction(e.target.value)}
                    placeholder="0x1::coin::transfer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Generic Parameters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Generic Parameters (Type Arguments)</label>
                    <button
                      onClick={addCustomGenericParam}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {customGenericParams.map((param, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          value={param}
                          onChange={(e) => updateCustomGenericParam(index, e.target.value)}
                          placeholder="0x1::aptos_coin::AptosCoin"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => removeCustomGenericParam(index)}
                          className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={customGenericParams.length === 1}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Function Arguments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Function Arguments</label>
                    <button
                      onClick={addCustomArgument}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {customArguments.map((arg, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          value={arg}
                          onChange={(e) => updateCustomArgument(index, e.target.value)}
                          placeholder="0x1 or 1000"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => removeCustomArgument(index)}
                          className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={customArguments.length === 1}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gas Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Gas Amount</label>
                    <input
                      value={customMaxGas}
                      onChange={(e) => setCustomMaxGas(e.target.value)}
                      placeholder="2000"
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gas Unit Price</label>
                    <input
                      value={customGasPrice}
                      onChange={(e) => setCustomGasPrice(e.target.value)}
                      placeholder="100"
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <button 
                  onClick={signCustomTransaction} 
                  disabled={!account || isSigning}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isSigning ? 'Processing...' : 'Sign & Submit Custom Transaction'}
                </button>
              </div>
              
              <div className="mt-4 p-4 bg-gray-900 rounded-lg overflow-x-auto">
                <pre className="text-sm text-gray-300">
{`const { authenticator, rawTransaction } = await signTransaction({
  transactionOrPayload: {
    data: {
      function: customFunction,
      typeArguments: validGenericParams,
      functionArguments: validArguments
    },
    options: { 
      maxGasAmount: parseInt(customMaxGas), 
      gasUnitPrice: parseInt(customGasPrice) 
    }
  }
});

const response = await aptosClient.transaction.submit.simple({
  transaction: SimpleTransaction.deserialize(new Deserializer(rawTransaction)),
  senderAuthenticator: authenticator
});`}
                </pre>
              </div>
            </div>

          </div>
        </div>
      </main>

      <WalletPopup
        wallets={wallets as any}
        notDetectedWallets={notDetectedWallets as any}
        isOpen={showWalletPopup}
        onClose={() => setShowWalletPopup(false)}
        onWalletConnect={handleWalletConnect}
      />

      {/* Transaction Details Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      selectedTransaction.type === 'transfer_sign' ? 'bg-green-100 text-green-800' : 
                      selectedTransaction.type === 'transfer_submit' ? 'bg-orange-100 text-orange-800' : 
                      selectedTransaction.type === 'message' ? 'bg-blue-100 text-blue-800' : 
                      selectedTransaction.type === 'sign_verify' ? 'bg-indigo-100 text-indigo-800' : 
                      selectedTransaction.type === 'custom' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedTransaction.type === 'transfer_sign' ? 'Transfer Sign' : 
                       selectedTransaction.type === 'transfer_submit' ? 'Transfer Submit' : 
                       selectedTransaction.type === 'message' ? 'Message Sign' : 
                       selectedTransaction.type === 'sign_verify' ? 'Sign & Verify' : 
                       selectedTransaction.type === 'custom' ? 'Custom Transaction' : 'Unknown'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(selectedTransaction.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedTransaction.hash && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Hash</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                        {selectedTransaction.hash}
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedTransaction.hash, 'Transaction Hash')}
                        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {selectedTransaction.signature && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all max-h-32 overflow-y-auto">
                        {JSON.stringify(selectedTransaction.signature, null, 2)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(selectedTransaction.signature), 'Signature')}
                        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {selectedTransaction.message && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-sm break-all">
                        {selectedTransaction.message}
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedTransaction.message, 'Message')}
                        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {selectedTransaction.nonce && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nonce</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                        {selectedTransaction.nonce}
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedTransaction.nonce, 'Nonce')}
                        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {selectedTransaction.amount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <code className="p-2 bg-gray-100 rounded text-sm">
                      {selectedTransaction.amount} micro APT
                    </code>
                  </div>
                )}

                {selectedTransaction.recipient && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                        {selectedTransaction.recipient}
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedTransaction.recipient, 'Recipient Address')}
                        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {selectedTransaction.typeArguments && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type Arguments</label>
                    <div className="space-y-2">
                      {selectedTransaction.typeArguments.map((arg: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                            {arg}
                          </code>
                          <button
                            onClick={() => copyToClipboard(arg, 'Type Argument')}
                            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTransaction.arguments && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Function Arguments</label>
                    <div className="space-y-2">
                      {selectedTransaction.arguments.map((arg: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                            {arg}
                          </code>
                          <button
                            onClick={() => copyToClipboard(arg, 'Function Argument')}
                            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTransaction.maxGas && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Gas</label>
                    <code className="p-2 bg-gray-100 rounded text-sm">
                      {selectedTransaction.maxGas}
                    </code>
                  </div>
                )}

                {selectedTransaction.gasPrice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gas Price</label>
                    <code className="p-2 bg-gray-100 rounded text-sm">
                      {selectedTransaction.gasPrice}
                    </code>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raw Data</label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all max-h-32 overflow-y-auto">
                      {JSON.stringify(selectedTransaction, null, 2)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedTransaction, null, 2), 'Raw Data')}
                      className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Copy All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
