export const connectWalletSnippet = `const provider = new ethers.BrowserProvider(window.ethereum);
const accounts = await provider.send('eth_requestAccounts', []);
const signer = await provider.getSigner();`;

export const signTextSnippet = `const message = '欢迎使用链上签名教学示例';
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
  action: '点击了结构化数据签名',
  timestamp: BigInt(Date.now()),
};

const signature = await signer.signTypedData(domain, types, value);
const recovered = ethers.verifyTypedData(domain, types, value, signature);`;
