import React, { useState } from 'react';
import { AdapterWallet } from "@aptos-labs/wallet-adapter-core"
import { AccountAddress } from "@aptos-labs/ts-sdk"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { EIP1193DerivedWallet } from "@aptos-labs/derived-wallet-ethereum"


interface WalletPopupProps {
  wallets?: any[];
  notDetectedWallets?: any[];
  isOpen: boolean;
  onClose: () => void;
  onWalletConnect?: (walletName: string, address: string) => void;
}

const WalletPopup: React.FC<WalletPopupProps> = ({
  wallets = [] as readonly AdapterWallet[],
  notDetectedWallets = [] as readonly AdapterWallet[],
  isOpen,
  onClose,
  onWalletConnect
}) => {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const {connect, connected, wallet} = useWallet();

  const handleWalletConnect = async (walletToConnect: AdapterWallet) => {
    try {
      setIsConnecting(walletToConnect.name);
      
      // 使用 useWallet 的 connect 方法
      await connect(walletToConnect.name);
      
      console.log("钱包连接成功");
      
      // 调用父组件的回调函数，传递钱包名称和地址
      if (onWalletConnect && wallet?.accounts && wallet.accounts.length > 0) {
        const address = wallet.accounts[0].address;
        onWalletConnect(walletToConnect.name, address);
      }
    } catch (error) {
      console.error('连接钱包失败:', error);
    } finally {
      onClose();
      setIsConnecting(null);
    }
  };

  const handleInstallWallet = (wallet: any) => {
    if (wallet.downloadUrl) {
      window.open(wallet.downloadUrl, '_blank');
    } else if (wallet.url) {
      window.open(wallet.url, '_blank');
    } else if (wallet.installUrl) {
      window.open(wallet.installUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="wallet-popup-overlay" onClick={onClose}>
      <div className="wallet-popup" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-popup-header">
          <h2>选择钱包</h2>
          <button className="wallet-popup-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="wallet-popup-content">
          {wallets.length > 0 && (
            <div className="wallet-section">
              <h3>已安装的钱包</h3>
              <div className="wallet-list">
                {wallets.filter((walletItem: AdapterWallet) => walletItem.name.toLocaleLowerCase().includes("ethereum") ).map((walletItem: AdapterWallet, index: number) => {
                  // 使用 useWallet 的状态来判断连接状态
                  const isConnected = connected && wallet?.name === walletItem.name;
                  const isConnectingThis = isConnecting === walletItem.name;
                  
                  return (
                    <div
                      key={index}
                      className={`wallet-item installed ${isConnected ? 'connected' : ''}`}
                      onClick={() => !isConnected && !isConnectingThis && handleWalletConnect(walletItem)}
                      style={{ 
                        cursor: isConnected || isConnectingThis ? 'default' : 'pointer',
                        opacity: isConnected ? 0.7 : 1
                      }}
                    >
                      <div className="wallet-icon">
                        {walletItem.icon ? (
                          <img src={walletItem.icon} alt={walletItem.name} />
                        ) : (
                          <div className="wallet-icon-placeholder">
                            {walletItem.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="wallet-info">
                        <span className="wallet-name">{walletItem.name}</span>
                        {isConnected ? (
                          <div className="wallet-connected-info">
                            <span className="wallet-status" style={{ color: '#16a34a' }}>已连接</span>
                            <span className="wallet-address" style={{ fontSize: '0.8em', color: '#666' }}>
                              {wallet?.accounts && wallet.accounts.length > 0 ? `${wallet.accounts[0].address.slice(0, 6)}...${wallet.accounts[0].address.slice(-4)}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="wallet-status">点击连接</span>
                        )}
                      </div>
                      {isConnectingThis && (
                        <div className="wallet-loading">连接中...</div>
                      )}
                      {isConnected && (
                        <div className="wallet-checkmark" style={{ color: '#16a34a', fontSize: '1.2em' }}>✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {notDetectedWallets.length > 0 && (
            <div className="wallet-section">
              <h3>未安装的钱包</h3>
              <div className="wallet-list">
                {notDetectedWallets.filter((wallet: AdapterWallet) => wallet.name.toLocaleLowerCase().includes("ethereum") ).map((wallet: AdapterWallet, index: number) => (
                  <div
                    key={index}
                    className="wallet-item not-installed"
                    onClick={() => handleInstallWallet(wallet)}
                  >
                    <div className="wallet-icon">
                      {wallet.icon ? (
                        <img src={wallet.icon} alt={wallet.name} />
                      ) : (
                        <div className="wallet-icon-placeholder">
                          {wallet.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="wallet-info">
                      <span className="wallet-name">{wallet.name}</span>
                      <span className="wallet-status">点击安装</span>
                    </div>
                    <div className="wallet-action">
                      <span>安装</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wallets.length === 0 && notDetectedWallets.length === 0 && (
            <div className="wallet-empty">
              <p>暂无可用的钱包</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPopup;
