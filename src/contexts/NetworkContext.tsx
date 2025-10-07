import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
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
export const NetworkProvider = ({ children }: PropsWithChildren) => {
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
