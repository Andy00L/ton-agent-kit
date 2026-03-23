# @ton-agent-kit/network-mode

CLI utility for choosing how an x402 server is accessed. Interactive prompt at startup. Returns a URL string.

## Usage
```typescript
import { selectNetworkMode } from "@ton-agent-kit/network-mode";

const publicUrl = await selectNetworkMode(4000);
// User sees:
//   [1] Local    (localhost, same machine only)
//   [2] Public   (auto-detect IP, port must be open)
//   [3] Tunnel   (ngrok/cloudflare, you provide URL)
// Returns: "http://localhost:4000" or "http://IP:4000" or "https://abc.ngrok-free.app"
```

## Modes

**Local** returns `http://localhost:{port}`. For development and same-machine demos.

**Public** detects the machine's public IP via api.ipify.org, asks the user to confirm the port is open, returns `http://{ip}:{port}`. For cloud servers with open ports.

**Tunnel** asks for an ngrok/cloudflare tunnel URL, tests reachability with a HEAD request, returns the URL. For machines behind NAT or firewalls.
