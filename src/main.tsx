import React, { createContext, useContext, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { setupAutomaticEthereumWalletDerivation } from "@aptos-labs/derived-wallet-ethereum";
import { setupAutomaticSolanaWalletDerivation } from "@aptos-labs/derived-wallet-solana";
import { PropsWithChildren } from "react";
import { Network, Aptos, AptosConfig } from "@aptos-labs/ts-sdk";

// Create network context
interface NetworkContextType {
  selectedAptosNetwork: Network;
  setSelectedAptosNetwork: (network: Network) => void;
  aptosClient: Aptos;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetworkContext = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkContext must be used within a NetworkProvider');
  }
  return context;
};

export const useAptosClient = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useAptosClient must be used within a NetworkProvider');
  }
  return context.aptosClient;
};


let dappImageURI: string | undefined;
if (typeof window !== "undefined") {
  dappImageURI = `${window.location.origin}${window.location.pathname}favicon.ico`;
}

const WalletProvider = ({ children }: PropsWithChildren) => {
  const { selectedAptosNetwork } = useNetworkContext();

  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: selectedAptosNetwork,
        aptosApiKeys: {
          testnet: import.meta.env.VITE_APTOS_API_KEY_TESTNET,
          devnet: import.meta.env.VITE_APTOS_API_KEY_DEVNET,
          mainnet: import.meta.env.VITE_APTOS_API_KEY_MAINNET,
        },
        aptosConnect: {
          claimSecretKey: false,
          dappId: "57fa42a9-29c6-4f1e-939c-4eefa36d9ff5",
          dappImageURI,
        },
        mizuwallet: {
          manifestURL:
            "https://assets.mz.xyz/static/config/mizuwallet-connect-manifest.json",
        },
        crossChainWallets: true,
      }}
      onError={(error: any) => {
        console.error(error); 
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
};



// Read network settings from localStorage
const getStoredNetwork = (): Network => {
  try {
    const stored = localStorage.getItem('aptos-network');
    if (stored) {
      // Verify if stored value is a valid network type
      const validNetworks = [Network.DEVNET, Network.TESTNET, Network.MAINNET];
      const networkValue = stored as Network;
      if (validNetworks.includes(networkValue)) {
        return networkValue;
      }
    }
  } catch (error) {
    console.warn('Failed to read network from localStorage:', error);
  }
  return Network.TESTNET;
};

// Save network settings to localStorage
const saveNetworkToStorage = (network: Network) => {
  try {
    localStorage.setItem('aptos-network', network);
  } catch (error) {
    console.warn('Failed to save network to localStorage:', error);
  }
};

// Create Aptos client based on network
const createAptosClient = (network: Network): Aptos => {
  const config = new AptosConfig({ network });
  return new Aptos(config);
};

// Network provider component
const NetworkProvider = ({ children }: PropsWithChildren) => {
  const [selectedAptosNetwork, setSelectedAptosNetwork] = useState<Network>(getStoredNetwork);
  const [aptosClient, setAptosClient] = useState<Aptos>(() => createAptosClient(getStoredNetwork()));

  // When network changes, recreate Aptos client
  useEffect(() => {
    const newClient = createAptosClient(selectedAptosNetwork);
    setAptosClient(newClient);
  }, [selectedAptosNetwork]);

  // Wrap setSelectedAptosNetwork to also save to localStorage
  const handleSetSelectedAptosNetwork = (network: Network) => {
    setSelectedAptosNetwork(network);
    saveNetworkToStorage(network);
  };

  return (
    <NetworkContext.Provider value={{ 
      selectedAptosNetwork, 
      setSelectedAptosNetwork: handleSetSelectedAptosNetwork,
      aptosClient 
    }}>
      {children}
    </NetworkContext.Provider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <NetworkProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </NetworkProvider>
  </React.StrictMode>
);

