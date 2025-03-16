## Getting Started
```zsh
pnpm add @locker-labs/sdk
```

## Usage
```ts
import { createLockerClient } from "@locker-labs/sdk";

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