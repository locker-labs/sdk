## Getting Started
```zsh
pnpm add @locker-money/sdk
```

## Usage
```ts
import { createLockerClient } from "@locker-money/sdk";

const message = createLockerClient()
console.log(message)
```

## Development
```zsh
# Install dependencies  
pnpm install

# Build the package
pnpm build

# Publish the package
pnpm publish --access public
```