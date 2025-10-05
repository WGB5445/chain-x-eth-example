# On-Chain Signature Tutorial Example

Quickly experience three common signature methods of browser wallets using Vite + React + ethers, and complete signature verification on the frontend. The interface uses English descriptions to help beginners understand the role and differences of on-chain signatures.

## Feature Overview

- One-click connection to browser wallets (MetaMask and other injected wallets)
- Support for multi-network switching: Devnet, Sepolia Testnet, Ethereum Mainnet
- Provides three signature buttons: plain text, raw bytes, EIP-712 structured data
- After each signature, you can immediately click "Verify Latest Signature" for verification
- Key code snippets are embedded in the page for easy learning and copying to your own projects

## Quick Start

> **Note**: Please run `npm install` before first run, internet connection is required to download dependencies.

```bash
npm install
npm run dev
```

Visit the local address output in the terminal in your browser (default `http://localhost:5173`). Make sure MetaMask or compatible wallet is installed and unlocked in your browser.

## Network Configuration

### Aptos Network Configuration

The project supports three Aptos network modes, controlled by the environment variable `VITE_APTOS_NETWORK`:

- **devnet**: Aptos Development Network
- **testnet**: Aptos Test Network (default)
- **mainnet**: Aptos Mainnet

#### Configuration Method

1. **Create environment variable file** `.env.local`:
```bash
# Set Aptos Network
VITE_APTOS_NETWORK=testnet

# Optional API Keys (for better performance)
VITE_APTOS_API_KEY_DEVNET=your_devnet_api_key
VITE_APTOS_API_KEY_TESTNET=your_testnet_api_key  
VITE_APTOS_API_KEY_MAINNET=your_mainnet_api_key
```

2. **Or set environment variables when starting**:
```bash
VITE_APTOS_NETWORK=devnet pnpm run dev
VITE_APTOS_NETWORK=mainnet pnpm run dev
```

### Ethereum Network Configuration

The project also supports Ethereum network switching functionality:

- **Devnet**: Local development network (Chain ID: 1337)
- **Sepolia Testnet**: Ethereum test network (Chain ID: 11155111)  
- **Ethereum Mainnet**: Ethereum mainnet (Chain ID: 1)

If you need to use custom RPC nodes, please modify the `NETWORKS` configuration in `src/App.tsx`.

## Testing Recommendations

1. Select the target network and click the "Switch Network" button.
2. After connecting the wallet, try the three signature methods in sequence.
3. After completing each signature, click "Verify Latest Signature" to confirm that the recovered address matches the current address.
4. In the "Raw Bytes Signature" module, click "Generate New Random Challenge" to experience how signatures change with different challenges.
5. Switch between different networks and observe the changes in chain ID status while still being able to successfully verify signatures.

## Project Structure

```
.
├── src
│   ├── App.tsx          // Page logic and UI
│   ├── codeSnippets.ts  // Code snippets displayed on the page
│   ├── main.tsx         // React entry point
│   ├── styles.css       // Base styles
│   └── vite-env.d.ts    // Global type declarations
├── index.html
├── package.json
└── vite.config.ts
```

## Future Extension Suggestions

- Introduce wagmi or RainbowKit to enhance wallet management experience.
- Move signature verification logic to the backend, combined with JWT or Session to implement on-chain login.
- Record time and context for each signature to facilitate auditing in business systems.