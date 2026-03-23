export async function selectNetworkMode(port: number): Promise<string> {
  const rl = await import("readline");
  const iface = rl.createInterface({ input: process.stdin, output: process.stdout });
  function ask(q: string): Promise<string> {
    return new Promise(resolve => iface.question(q, answer => resolve(answer.trim())));
  }

  console.log("\n  How will buyers reach your x402 endpoints?\n");
  console.log("  [1] Local    (localhost, same machine only)");
  console.log("  [2] Public   (auto-detect IP, port must be open)");
  console.log("  [3] Tunnel   (ngrok/cloudflare, you provide URL)\n");

  while (true) {
    const choice = await ask("  Choose [1/2/3]: ");

    if (choice === "1") {
      iface.close();
      return `http://localhost:${port}`;
    }

    if (choice === "2") {
      let ip: string;
      try {
        const res = await fetch("https://api.ipify.org");
        ip = await res.text();
      } catch {
        console.log("  Cannot detect IP. Try tunnel mode.\n");
        continue;
      }
      console.log(`  IP: ${ip}`);
      const ok = await ask(`  Is port ${port} open? [y/n]: `);
      if (ok.toLowerCase() !== "y") {
        console.log(`  Open it: sudo ufw allow ${port}\n`);
        continue;
      }
      iface.close();
      return `http://${ip}:${port}`;
    }

    if (choice === "3") {
      console.log(`\n  Start your tunnel: ngrok http ${port}\n`);
      while (true) {
        const url = (await ask("  Paste tunnel URL: ")).replace(/\/$/, "");
        if (!url.startsWith("http")) { console.log("  Must start with http\n"); continue; }
        process.stdout.write("  Testing... ");
        try {
          await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
          console.log("OK");
          iface.close();
          return url;
        } catch {
          console.log("FAILED. Is the tunnel running?\n");
        }
      }
    }
    console.log("  Invalid choice.\n");
  }
}

export default selectNetworkMode;
