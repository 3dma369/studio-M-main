import { BrowserProvider, parseEther, formatEther } from "ethers";

export const web3Service = {
  getProvider: () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      return new BrowserProvider((window as any).ethereum);
    }
    return null;
  },

  async connectWallet(): Promise<string | null> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error("No Web3 wallet detected. Please install MetaMask.");
    }
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      return accounts[0];
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      throw error;
    }
  },

  async getAddress(): Promise<string | null> {
    const provider = this.getProvider();
    if (!provider) return null;
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
      return accounts[0] || null;
    } catch {
      return null;
    }
  },

  async sendPayment(toAddress: string, amountEth: string): Promise<string | null> {
    const provider = this.getProvider();
    if (!provider) throw new Error("Wallet not connected");

    try {
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: toAddress,
        value: parseEther(amountEth)
      });
      
      const receipt = await tx.wait();
      return receipt?.hash || null;
    } catch (error: any) {
      console.error("Transaction failed:", error);
      throw error;
    }
  },

  async getBalance(address: string): Promise<string> {
    const provider = this.getProvider();
    if (!provider) return "0";
    try {
      const balance = await provider.getBalance(address);
      return formatEther(balance);
    } catch {
      return "0";
    }
  }
};
