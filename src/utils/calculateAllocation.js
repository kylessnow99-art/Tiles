export const calculateAllocation = (walletAddress) => {
  if (!walletAddress) return 0;
  
  // Deterministic calculation based on wallet address
  // Returns value between 2.37 and 5.29 SOL
  
  // Take last 8 characters of address
  const hashPart = walletAddress.slice(-8);
  
  // Convert to number (hexadecimal)
  let hashValue = 0;
  for (let i = 0; i < hashPart.length; i++) {
    hashValue = ((hashValue << 5) - hashValue) + hashPart.charCodeAt(i);
    hashValue = hashValue & hashValue; // Convert to 32-bit integer
  }
  
  // Normalize to 0-1 range
  const normalized = Math.abs(hashValue) % 10000 / 10000;
  
  // Scale to 2.37 - 5.29 range
  const amount = 2.37 + (normalized * 2.92);
  
  // Round to 2 decimal places
  return Math.round(amount * 100) / 100;
};

// Example outputs for different addresses:
// 8zFH5... → 3.42
// 4xQ9p... → 4.87  
// 1tM6r... → 2.91
// A3bK8... → 5.29
// Z9yL2... → 2.37
       
