# alchemy-solana-signer

Bridge 0.01 USDC from Solana Devnet to Base Sepolia using Alchemy Solana Signer. Then split the token using Locker Split Plugin.

### Install dependencies

```bash
bun install
```

### Setup environment variables

```bash
cp .env.example .env.local
```

- Create a new embedded accounts configuration for an alchemy app in your [dashboard](https://dashboard.alchemy.com/accounts)
- Add alchemy api key in NEXT_PUBLIC_ALCHEMY_API_KEY in the .env.local file
- Add an evm private key in NEXT_PUBLIC_EVM_PRIVATE_KEY in the .env.local file

### To run:

```bash
bun run dev
```

- Go to (localhost:3000)[http://localhost:3000]
- Sign in with your email. An alchemy signer will be created for you
- Add SOL (devnet)[https://faucet.solana.com/] and USDC (Solana Devnet)[https://faucet.circle.com/] to the displayed Solana Signer Address
- (optional) Update split config (splitRecipients and splitPercentages) in app/bridge-and-split.tsx
- Click Bridge and Split
