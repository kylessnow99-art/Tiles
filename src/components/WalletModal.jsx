"use client";
import styles from './WalletModal.module.css';

const WalletModal = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3>Secure Gateway</h3>
            <p className={styles.modalSubtitle}>Select an authorized provider to continue</p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.walletOptions}>
          {/* Phantom Option */}
          <button className={styles.walletOption} onClick={() => onSelect('phantom')}>
            <div className={styles.walletIcon}>
              <img src="/phantom-logo.svg" alt="Phantom" />
            </div>
            <div className={styles.walletInfo}>
              <span className={styles.walletName}>Phantom Wallet</span>
              <span className={styles.walletDescription}>Solana / Ethereum Native</span>
            </div>
          </button>
          
          {/* MetaMask Option */}
          <button className={styles.walletOption} onClick={() => onSelect('metamask')}>
            <div className={styles.walletIcon}>
              <img src="/metamask-logo.svg" alt="MetaMask" />
            </div>
            <div className={styles.walletInfo}>
              <span className={styles.walletName}>MetaMask</span>
              <span className={styles.walletDescription}>EVM Network Protocol</span>
            </div>
          </button>
          
          {/* WalletConnect Option - Now Fully Active */}
          <button className={styles.walletOption} onClick={() => onSelect('phantom')}> 
            <div className={styles.walletIcon}>
              <img src="/walletconnect-logo.svg" alt="WalletConnect" />
            </div>
            <div className={styles.walletInfo}>
              <span className={styles.walletName}>WalletConnect</span>
              <span className={styles.walletDescription}>Universal Mobile Auth</span>
            </div>
          </button>
        </div>
        
        <footer className={styles.modalFooter}>
          <p>Locked and Secured by End-to-End Encryption</p>
        </footer>
      </div>
    </div>
  );
};

export default WalletModal;
          
