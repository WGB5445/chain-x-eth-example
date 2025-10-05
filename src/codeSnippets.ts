export const connectWalletSnippet = `const provider = new ethers.BrowserProvider(window.ethereum);
const accounts = await provider.send('eth_requestAccounts', []);
const signer = await provider.getSigner();`;

export const signTextSnippet = `const message = 'Welcome to On-Chain Signature Tutorial Example';
const signature = await signer.signMessage(message);
const recovered = ethers.verifyMessage(message, signature);`;

export const signTypedDataSnippet = `const domain = {
  name: 'Codex Demo',
  version: '1',
  chainId,
  verifyingContract,
};

const types = {
  DemoMessage: [
    { name: 'user', type: 'address' },
    { name: 'action', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
  ],
};

const value = {
  user: account,
  action: 'Clicked structured data signature',
  timestamp: BigInt(Date.now()),
};

const signature = await signer.signTypedData(domain, types, value);
const recovered = ethers.verifyTypedData(domain, types, value, signature);`;
