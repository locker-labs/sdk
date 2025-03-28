## Getting Started
```zsh
bun add @locker-labs/sdk
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
bun install

# Build the package
bun run build

# Publish the package
bun publish --access public
```

### Generating a plugin actions file
- Create a config file, refer to splits/def/splitPluginConfig.
- Update plugingen.config.ts to refer to the added config file.
- Then run command:
```zsh 
bunx plugingen generate 
```
