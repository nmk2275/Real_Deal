// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  const statusMessages = document.getElementById('status-messages');

  const addStatusMessage = (message) => {
    const div = document.createElement('div');
    div.textContent = message;
    statusMessages.appendChild(div);
  };

  addStatusMessage('✔️ Extension is active');
  addStatusMessage('✔️ Ready to analyze products');

  // Price history removed from popup
  addStatusMessage('⚠️ Price History has been removed from the panel.');
});
