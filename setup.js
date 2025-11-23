// Vanilla JS version (no jQuery dependency)
function setTab() {
  console.log("setTab() called");
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    const div = document.createElement('div');
    div.textContent = '✔️ Tab setup done';
    statusDiv.appendChild(div);
  }
}

function setVersion() {
  console.log("setVersion() called");
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    const div = document.createElement('div');
    div.textContent = '✔️ Version setup done';
    statusDiv.appendChild(div);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTab();
  setVersion();
});