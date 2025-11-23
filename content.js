// RealDeal Chrome Extension - Content Script
// Version 1.1 - Complete Fixes
// =============================================
// STYLES
// =============================================
const addStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    /* Sidebar Styles */
    #realdeal-sidebar {
      position: fixed;
      top: 80px;
      right: 0;
      width: 60px;
      background: rgb(98, 171, 243);
      border-radius: 0 12px 12px 0;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 0;
    }
    .sidebar-btn {
      background: none;
      border: none;
      color: #fff;
      width: 48px;
      height: 48px;
      margin: 6px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 50%;
      transition: background 0.2s;
      font-size: 18px;
    }
    .sidebar-btn:hover {
      background: #1565c0;
    }
    .icon {
      font-size: 22px;
      margin-bottom: 2px;
    }
    .label {
      font-size: 10px;
      font-weight: 500;
      line-height: 1;
    }

    /* Seller Panel Styles */
    #realdeal-seller-panel {
      position: fixed;
      top: 100px;
      right: 70px;
      width: 350px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.18);
      z-index: 100000;
      padding: 16px;
      border: 1px solid #1976d2;
      display: none;
    }
    #seller-panel-header {
      font-weight: bold;
      color: #1976d2;
      margin-bottom: 8px;
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #seller-panel-close {
      background: none;
      border: none;
      color: #1976d2;
      font-size: 18px;
      cursor: pointer;
    }

    /* Reviews Panel Styles */
    #realdeal-reviews-panel {
      position: fixed;
      top: 100px;
      right: 70px;
      width: 350px;
      height: 250px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.18);
      z-index: 100000;
      padding: 16px;
      border: 1px solid #1976d2;
      display: none;
    }
    #reviews-panel-header {
      font-weight: bold;
      color: #1976d2;
      margin-bottom: 8px;
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #reviews-panel-close {
      background: none;
      border: none;
      color: #1976d2;
      font-size: 18px;
      cursor: pointer;
    }
    #reviewsContainer {
      max-height: 400px;
      overflow-y: auto;
      margin-top: 8px;
    }
    .review {
      border-bottom: 1px solid #eee;
      padding: 8px 0;
    }
    .review:last-child {
      border-bottom: none;
    }
    .review-author {
      font-weight: bold;
      color: #333;
    }
    .review-rating {
      color: #f39c12;
    }
    .review-text {
      margin: 4px 0;
      color: #555;
    }
  `;
  document.head.appendChild(style);
};

// =============================================
// UI COMPONENTS
// =============================================
const createSidebar = () => {
  const sidebar = document.createElement('div');
  sidebar.id = 'realdeal-sidebar';
  sidebar.innerHTML = `
    <button class="sidebar-btn" id="reviews-auth-btn" title="Reviews Authenticity">
      <span class="icon">⭐</span>
      <span class="label">Reviews Authenticity</span>
    </button>
    <button class="sidebar-btn" id="seller-rep-btn" title="Seller Reputation">
      <span class="icon">📦</span>
      <span class="label">Seller details</span>
    </button>
    <button class="sidebar-btn" id="realdeal-meter-btn" title="RealDeal Meter">
      <span class="icon">✅</span>
      <span class="label">RealDeal Meter</span>
    </button>
    <button class="sidebar-btn realdeal-tool" id="visibility-btn" title="Visibility">
      <span class="icon">👁️</span>
      <span class="label">Visibility</span>
    </button>
  `;
  document.body.appendChild(sidebar);
  return sidebar;
};

// Keep a placeholder for createPricePanel but do not create DOM elements
const createPricePanel = () => null;

const createSellerPanel = () => {
  const panel = document.createElement('div');
  panel.id = 'realdeal-seller-panel';
  panel.innerHTML = `
    <div id="seller-panel-header">
      <span>Seller Reputation</span>
      <button id="seller-panel-close">✖</button>
    </div>
    <div id="sellerDetailsContainer">
      <p>Loading seller details...</p>
    </div>
  `;
  document.body.appendChild(panel);
  return panel;
};

const createReviewsPanel = () => {
  const panel = document.createElement('div');
  panel.id = 'realdeal-reviews-panel';
  panel.innerHTML = `
    <div id="reviews-panel-header">
      <span>Reviews Authenticity</span>
      <button id="reviews-panel-close">✖</button>
    </div>
    <div id="reviewsContainer">
      <p>Loading reviews...</p>
    </div>
  `;
  document.body.appendChild(panel);
  return panel;
};

const createRealDealMeterPanel = () => {
  const panel = document.createElement('div');
  panel.id = 'realdeal-meter-panel';
  panel.style.position = 'fixed';
  panel.style.top = '100px';
  panel.style.right = '70px';
  panel.style.width = '350px';
  panel.style.background = '#fff';
  panel.style.borderRadius = '8px';
  panel.style.boxShadow = '0 2px 16px rgba(0,0,0,0.18)';
  panel.style.zIndex = '100000';
  panel.style.padding = '16px';
  panel.style.border = '1px solid #1976d2';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div id="realdeal-meter-header" style="display:flex; justify-content:space-between; align-items:center;">
      <span style="font-weight:bold; color:#1976d2;">RealDeal Meter</span>
      <button id="realdeal-meter-close" style="background:none; border:none; color:#1976d2; font-size:18px; cursor:pointer;">✖</button>
    </div>
    <div id="realdealMeterContainer" style="margin-top:10px;">
      <p>Loading RealDeal insights...</p>
    </div>
  `;
  document.body.appendChild(panel);
  return panel;
};

// Function to render seller details in the panel
const renderSellerDetails = async (panel) => {
  const container = document.getElementById('sellerDetailsContainer');
  container.innerHTML = `<p>Loading seller details...</p>`;

  const sellerDetails = await window.RealDeal.scrapeSellerDetails();
  container.innerHTML = `
    <h3>Seller Details</h3>
    <p><strong>Name:</strong> ${sellerDetails.name}</p>
    <p><strong>Address:</strong> ${sellerDetails.address}</p>
    <p><strong>Rating:</strong> ${sellerDetails.rating}</p>
  `;
};

// Function to render reviews in the panel
const renderReviews = async (panel) => {
  const container = document.getElementById('reviewsContainer');
  container.innerHTML = `<p>Loading reviews...</p>`;

  const reviews = await window.RealDeal.scrapeReviews();
  container.innerHTML = reviews.map(review => `
    <div class="review">
      <div class="review-author">${review.author}</div>
      <div class="review-rating">Rating: ${review.rating}</div>
      <div class="review-text">${review.text}</div>
    </div>
  `).join('');
};

// Function to set up the Seller Reputation feature
const setupSellerReputation = (panel) => {
  const sellerRepBtn = document.getElementById('seller-rep-btn');
  const closeBtn = document.getElementById('seller-panel-close');

  if (sellerRepBtn && closeBtn) {
    sellerRepBtn.addEventListener('click', () => {
      console.log('[RealDeal] Seller Reputation button clicked');
      panel.style.display = 'block';
      renderSellerDetails(panel);
    });

    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
    });
  }
};

// Function to set up the Reviews Authenticity feature
const setupReviewsAuthenticity = (panel) => {
  const reviewsAuthBtn = document.getElementById('reviews-auth-btn'); // Button to trigger reviews analysis
  const closeBtn = document.getElementById('reviews-panel-close'); // Button to close the reviews panel

  if (reviewsAuthBtn && closeBtn) {
    reviewsAuthBtn.addEventListener('click', () => {
      console.log('[RealDeal] Reviews Authenticity button clicked');
      panel.style.display = 'block';
      window.RealDeal.renderReviews(panel); // Call the renderReviews function from ReviewsAuthenticity.js
    });

    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
    });
  }
};

// Function to set up the RealDeal Meter feature
const setupRealDealMeter = (panel) => {
  const meterBtn = document.getElementById('realdeal-meter-btn'); // Button to open the RealDeal Meter
  const closeBtn = document.getElementById('realdeal-meter-close'); // Button to close the RealDeal Meter

  if (meterBtn && closeBtn) {
    meterBtn.addEventListener('click', () => {
      console.log('[RealDeal] RealDeal Meter button clicked');
      panel.style.display = 'block';
      window.renderRealDealInsights(panel); // Call the function from RealDealmeter.js
    });

    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
    });
  }
};

// Visibility feature - add a toolbar button and panel rendering logic
(function () {
  const TOOL_TEXT = "Visibility";
  const POLL_INTERVAL = 400;
  const FIND_TIMEOUT = 5000;

  // Wire the toolbar button (will find the button created above)
  waitForToolbar().then(btn => btn && btn.addEventListener("click", onClick));

  function waitForToolbar() {
    return new Promise(resolve => {
      const start = Date.now();
      const iv = setInterval(() => {
        const el = Array.from(document.querySelectorAll(".realdeal-tool"))
          .find(el => (el.innerText || "").trim().includes(TOOL_TEXT));
        if (el) { clearInterval(iv); resolve(el); }
        else if (Date.now() - start > FIND_TIMEOUT) { clearInterval(iv); resolve(null); }
      }, POLL_INTERVAL);
    });
  }

  function onClick() {
    const url = location.href;
    const title = (document.querySelector('meta[property="og:title"]')?.content || document.title || "").trim();
    chrome.runtime.sendMessage({ action: "comparePricesParallel", url, title });
  }

  // Receive results and render panel
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "displayPrices") {
      renderPanel(msg.results);
    }
  });

  function renderPanel(results) {
    const existing = document.getElementById("realdeal-visibility-panel");
    if (existing) existing.remove();

    // Normalize, sort ASC (nulls bottom)
    const norm = (p) => p ? parseFloat(String(p).replace(/[₹,\s]/g, "")) : Infinity;
    results.sort((a, b) => norm(a.price) - norm(b.price));

    // Lowest numeric price (ignore nulls)
    const lowest = results.find(r => r.price && isFinite(norm(r.price)));
    const lowestNum = lowest ? norm(lowest.price) : null;

    const panel = document.createElement("div");
    panel.id = "realdeal-visibility-panel";
    Object.assign(panel.style, {
      position: "fixed",
      top: "80px",
      right: "60px",
      width: "380px",
      maxHeight: "70vh",
      overflowY: "auto",
      background: "#fff",
      border: "2px solid #6B21A8",
      padding: "12px",
      zIndex: "2147483647",
      borderRadius: "10px",
      fontFamily: "'Poppins', sans-serif",
      fontSize: "14px",
      color: "#222",
      boxShadow: "-2px 2px 10px rgba(0,0,0,0.25)"
    });

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h3 style="margin:0;color:#6B21A8;font-weight:700;font-family:'Montserrat',sans-serif;">Price Comparison</h3>
        <button id="rd-close" style="cursor:pointer;background:none;border:none;font-size:18px;color:#6B21A8;">✖</button>
      </div>
    `;

    if (!results?.length) {
      html += `<p>No prices found.</p>`;
    } else {
      html += results.map(item => {
        const logos = {
          "Amazon":  "https://www.google.com/s2/favicons?sz=64&domain=amazon.in",
          "Flipkart": "https://www.google.com/s2/favicons?sz=64&domain=flipkart.com",
          "Myntra":  "https://www.google.com/s2/favicons?sz=64&domain=myntra.com"
        };

        const logoUrl = logos[item.site] || "";
        const isLowest = item.price && lowestNum !== null && norm(item.price) === lowestNum;

        const priceHtml = item.price
          ? `<strong style="${isLowest ? 'color:green;' : ''}">${item.price}</strong>${isLowest ? ' <span style="background:#e9f7e9;color:#0a8a0a;border:1px solid #bfe5bf;border-radius:6px;padding:1px 6px;margin-left:6px;font-size:12px;">Lowest price</span>' : ''}`
          : `<span style="color:#aa0000">Not found</span>`;

        const linkHtml = item.link
          ? `<a href="${item.link}" target="_blank" style="text-decoration:none;">Open</a>`
          : `<span style="color:#888">—</span>`;

        return `
          <div style="margin-bottom:10px;display:grid;grid-template-columns:40px 1fr auto auto;gap:10px;align-items:center;">
            <div>
              ${logoUrl ? `<img src="${logoUrl}" alt="${item.site}" style="width:28px;height:auto;object-fit:contain;">` : ""}
            </div>
            <div><strong>${item.site}</strong></div>
            <div>${priceHtml}</div>
            <div>${linkHtml}</div>
          </div>
        `;
      }).join("");
    }

    panel.innerHTML = html;
    document.body.appendChild(panel);
    document.getElementById("rd-close").onclick = () => panel.remove();
  }
})();

// Remove price table rendering (unused since Price History UI removed)
const renderPriceTable = () => null;

// =============================================
// INITIALIZATION
// =============================================
const initRealDeal = () => {
  console.log('[RealDeal] Initializing extension...');

  // Add styles first
  addStyles();

  // Create UI components
  if (!document.getElementById('realdeal-sidebar')) {
    console.log('[RealDeal] Creating sidebar...');
    createSidebar();
  }

  const sellerPanel = createSellerPanel();
  const reviewsPanel = createReviewsPanel(); // Create the reviews panel
  const realDealMeterPanel = createRealDealMeterPanel(); // Create the RealDeal Meter panel

  // Set up functionality
  console.log('[RealDeal] Setting up Seller Reputation...');
  window.RealDeal.setupSellerReputation(sellerPanel);

  console.log('[RealDeal] Setting up Reviews Authenticity...');
  setupReviewsAuthenticity(reviewsPanel); // Set up reviews authenticity

  console.log('[RealDeal] Setting up RealDeal Meter...');
  setupRealDealMeter(realDealMeterPanel); // Set up RealDeal Meter

  console.log('[RealDeal] Extension initialized successfully');
};

// Start the extension when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initRealDeal();
  });
} else {
  initRealDeal();
}

let currentProductId = getProductIdentifier();

const observer = new MutationObserver(() => {
  const newProductId = getProductIdentifier();
  if (newProductId && newProductId !== currentProductId) {
    console.log('[RealDeal] Product changed, updating RealDeal Meter.');
    currentProductId = newProductId;
    const panel = document.getElementById('realdeal-meter-panel');
    if (panel && panel.style.display === 'block') {
      window.renderRealDealInsights(panel);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

const checkRealDealMeterPanel = () => {
  const panel = document.getElementById('realdeal-meter-panel');
  if (!panel) {
    console.error('[RealDeal] RealDeal Meter panel not found.');
  }
};

checkRealDealMeterPanel();

// Send product ID to popup when the extension popup is opened
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'REQUEST_PRODUCT_ID') {
    const productId = getProductIdentifier();
    sendResponse({ type: 'PRODUCT_ID', productId });
  }
});

const getProductIdentifier = () => {
  const url = window.location.href;

  // Check for Meesho product ID
  if (url.includes('meesho.com')) {
    const match = url.match(/\/p\/([^/]+)/); // Extract product ID from Meesho URL
    return match ? match[1] : null;
  }

  // Check for Amazon product ID
  if (url.includes('amazon.in')) {
    const match = url.match(/\/dp\/([^/]+)/); // Extract product ID from Amazon URL
    return match ? match[1] : null;
  }

  // Check for Flipkart product ID
  if (url.includes('flipkart.com')) {
    const match = url.match(/\/p\/([^?]+)/); // Extract product ID from Flipkart URL
    return match ? match[1] : null;
  }

  console.error('[RealDeal] Unsupported website.');
  return null;
};

// Expose to window for other modules/scripts
window.getProductIdentifier = getProductIdentifier;

