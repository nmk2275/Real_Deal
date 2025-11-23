// Create a global namespace if it doesn't exist
window.RealDeal = window.RealDeal || {};
console.log('[RealDeal] SellerReputation.js loaded and RealDeal namespace initialized.');

/* ---------- NEW utility ---------- */
function cleanSellerName(raw) {
  if (!raw) return '';
  return raw
    .replace(/c\/o/gi, '')          // remove "c/o"
    .replace(/meesho|amazon|flipkart|snapdeal/gi, '') // remove platform tags
    .replace(/[^a-z0-9& ]+/gi, ' ') // drop punctuation
    .replace(/\s{2,}/g, ' ')        // collapse spaces
    .trim();
}

// Function to scrape seller details
window.RealDeal.scrapeSellerDetails = async () => {
  const sellerDetails = {};
  let infoOpenedByScript = false;
  let additionalDetailsOpened = false;
  let moreInfoButton = null;

  try {
    // Step 1: Click the "Additional Details" accordion header
    const additionalDetailsHeader = document.querySelector('span.CustomAccordion__TitleContainer-sc-1ntyiim-3');
    if (additionalDetailsHeader && additionalDetailsHeader.textContent.trim().includes('Additional Details')) {
      additionalDetailsHeader.parentElement.click();
      additionalDetailsOpened = true;
      console.log('[RealDeal] Clicked "Additional Details" accordion header.');
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for accordion to open
    }

    // Step 2: Get reference to the "More Information" button inside Additional Details
    moreInfoButton = document.querySelector('.sc-dOfePm.gWcmRE.ProductAdditionalDetails__MoreInfoCaption-sc-1ie6qpk-0');

    // Check if the modal is already visible
    const alreadyVisible = document.querySelector('.AttributesModal__AttributeBox-sc-cqg6t9-0');
    if (!alreadyVisible && moreInfoButton) {
      moreInfoButton.click();
      infoOpenedByScript = true;
      console.log('[RealDeal] Clicked "More Information" button.');
      await window.RealDeal.waitForElement('.AttributesModal__AttributeBox-sc-cqg6t9-0');
    }

    // Extract Supplier Name from modal
    const getSupplierName = () => {
      const boxes = document.querySelectorAll('.AttributesModal__AttributeBox-sc-cqg6t9-0');
      for (let box of boxes) {
        const label = box.querySelector('span.sc-dOfePm.bzUfIa');
        if (label && label.textContent.trim().includes('Supplier Information')) {
          const valueBox = box.querySelector('span.sc-dOfePm.imVgiq');
          return valueBox ? valueBox.textContent.trim() : 'N/A';
        }
      }
      return 'N/A';
    };

    // Extract Seller Contact Info from modal
    const getSellerContactInfo = () => {
      const boxes = document.querySelectorAll('.AttributesModal__AttributeBox-sc-cqg6t9-0');
      for (let box of boxes) {
        const label = box.querySelector('span.sc-dOfePm.bzUfIa');
        if (label && label.textContent.trim().includes('Contact Information')) {
          const valueBox = box.querySelector('span.sc-dOfePm.imVgiq');
          if (!valueBox) return { sellerName: 'N/A', address: 'N/A' };
          
          const divs = valueBox.querySelectorAll('div') || [];
          let sellerName = 'N/A';
          let addressLines = [];
          let startCollecting = false;

          for (let div of divs) {
            const text = div.textContent.trim();
            if (text.startsWith('Seller Name -')) {
              sellerName = text.replace('Seller Name -', '').trim();
              startCollecting = true;
            } else if (startCollecting) {
              if (text.startsWith('PID -') || text.includes('Seller Mailbox') || text.toLowerCase().includes('contact seller')) {
                continue;
              }
              if (text.match(/\d{3,}/) || text.includes(',') || text.includes('Road') || text.includes('Park') || text.includes('Bengaluru')) {
                addressLines.push(text);
              }
            }
          }

          return {
            sellerName,
            address: addressLines.join(', ')
          };
        }
      }

      return { sellerName: 'N/A', address: 'N/A' };
    };

    // Extract Manufacturer Info as Additional Details
    const getAdditionalDetails = () => {
      const boxes = document.querySelectorAll('.AttributesModal__AttributeBox-sc-cqg6t9-0');
      const details = [];
      
      for (let box of boxes) {
        const label = box.querySelector('span.sc-dOfePm.bzUfIa');
        if (label) {
          const labelText = label.textContent.trim();
          // Collect manufacturer, packer, and product info
          if (['Manufacturer Information', 'Packer Information', 'Net Weight(g)', 'Product Safety Information'].some(text => labelText.includes(text))) {
            const valueBox = box.querySelector('span.sc-dOfePm.imVgiq');
            if (valueBox) {
              details.push(`${labelText}: ${valueBox.textContent.trim()}`);
            }
          }
        }
      }
      
      return { detailsText: details.length > 0 ? details.join(' | ') : 'N/A' };
    };

    // Extract Seller Rating
    const getSellerRating = () => {
      // Try primary selector first
      let ratingElement = document.querySelector('.sc-eDvSVe.jkpPSq');
      if (ratingElement) return ratingElement.textContent.trim();
      
      // Fallback: Get from "Sold By" shop card rating
      const ratingSpan = document.querySelector('span.sc-kCDvBi.gpiNZI span.sc-dOfePm.fSsoMQ');
      if (ratingSpan) return ratingSpan.textContent.trim();
      
      return 'N/A';
    };

    // Final assignment
    const contactInfo = getSellerContactInfo();
    sellerDetails.name = getSupplierName();
    sellerDetails.address = contactInfo.address;
    sellerDetails.rating = getSellerRating();

    const additionalInfo = getAdditionalDetails();
    sellerDetails.additionalDetails = additionalInfo.detailsText;

    // Check if seller is Authorised Seller
    const isAuthorisedSeller = () => {
      // Look for all spans with the ivsDoe class that contain "Authorised Seller"
      const allSpans = document.querySelectorAll('span.sc-dOfePm.ivsDoe');
      for (let span of allSpans) {
        if (span.textContent.trim().includes('Authorised Seller')) {
          return true;
        }
      }
      return false;
    };

    // Verify Seller Online
    if (isAuthorisedSeller()) {
      sellerDetails.verification = 'Verified';
      console.log('[RealDeal] Seller is Authorised - marked as Verified');
    } else {
      sellerDetails.verification = await window.RealDeal.verifySeller(sellerDetails.name);
    }

    console.log('[RealDeal] Extracted Seller Details:', sellerDetails);

  } catch (error) {
    console.warn('[RealDeal] Error scraping seller details:', error);
    sellerDetails.name = 'N/A';
    sellerDetails.address = 'N/A';
    sellerDetails.rating = 'N/A';
    sellerDetails.verification = 'Error';
  }

  // Close the "More Information" section if we opened it
  if (infoOpenedByScript && moreInfoButton) {
    moreInfoButton.click();
    console.log('[RealDeal] Closed "More Information" section.');
  }

  // Close the "Additional Details" accordion if we opened it
  if (additionalDetailsOpened) {
    const additionalDetailsHeader = document.querySelector('span.CustomAccordion__TitleContainer-sc-1ntyiim-3');
    if (additionalDetailsHeader && additionalDetailsHeader.textContent.trim().includes('Additional Details')) {
      additionalDetailsHeader.parentElement.click();
      console.log('[RealDeal] Closed "Additional Details" accordion.');
    }
  }

  return sellerDetails;
};

// Helper function to wait for an element to appear in the DOM
window.RealDeal.waitForElement = (selector, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const interval = 100; // Check every 100ms
    let elapsedTime = 0;

    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (elapsedTime >= timeout) {
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      } else {
        elapsedTime += interval;
        setTimeout(checkElement, interval);
      }
    };

    checkElement();
  });
};

// Function to set up the Seller Reputation feature
window.RealDeal.setupSellerReputation = (panel) => {
  const sellerRepBtn = document.getElementById('seller-rep-btn');
  const closeBtn = document.getElementById('seller-panel-close');

  if (sellerRepBtn && closeBtn) {
    sellerRepBtn.addEventListener('click', () => {
      console.log('[RealDeal] Seller Reputation button clicked');
      panel.style.display = 'block';
      window.RealDeal.renderSellerDetails(panel);
    });

    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
    });
  }
};

// Function to render seller details in the panel
window.RealDeal.renderSellerDetails = async (panel) => {
  // Inject badge CSS into the panel
  if (!document.getElementById('realdeal-badge-style')) {
    const style = document.createElement('style');
    style.id = 'realdeal-badge-style';
    style.textContent = `
      .verified-badge, .unverified-badge {
        display: inline-flex;
        align-items: center;
        font-weight: bold;
        font-size: 0.8rem;
        padding: 2px 8px;
        border-radius: 12px;
        animation: pulse 1.5s infinite;
        margin-left: 8px;
        color: white;
      }
      .verified-badge {
        background-color: #28a745;
      }
      .unverified-badge {
        background-color: #dc3545;
      }
      .badge-icon {
        display: inline-block;
        margin-right: 5px;
        font-size: 1em;
        vertical-align: middle;
      }
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  const container = document.getElementById('sellerDetailsContainer');
  container.innerHTML = `<p>Loading seller details...</p>`;

  const sellerDetails = await window.RealDeal.scrapeSellerDetails();
  container.innerHTML = `
    <h3>Seller Details</h3>
    <p><strong>Name:</strong> ${sellerDetails.name}</p>
    <p><strong>Address:</strong> ${sellerDetails.address}</p>
    <p><strong>Rating:</strong> ${sellerDetails.rating}</p>
    <p><strong>Verification:</strong> ${
      sellerDetails.verification === 'Verified'
        ? `<span class="verified-badge">Verified <span class="badge-icon">&#10003;</span></span>`
        : `<span class="unverified-badge">Unverified <span class="badge-icon">&#10007;</span></span>`
    }</p>
  `;
};

// Function to verify seller using Google Custom Search
window.RealDeal.verifySeller = async (rawName) => {
  const sellerName = cleanSellerName(rawName);
  if (!sellerName || sellerName.length < 3) return 'Unverified';

  // Simple result cache to avoid repeated API calls
  window.RealDeal._verifyCache = window.RealDeal._verifyCache || {};
  const cacheKey = sellerName.toLowerCase();
  if (window.RealDeal._verifyCache[cacheKey]) {
    return window.RealDeal._verifyCache[cacheKey];
  }

  const apiKey = 'AIzaSyCCCMgVBWYlq2WfMe-DXCsxYhyKMEDh4AI'; // Your API Key
  const cx = '0210f1e3f09a441d4'; // Your Custom Search Engine ID
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(sellerName)}`;

  const approvedDomains = [
    'indiamart', 'justdial', 'linkedin', 'tradeindia', 'yellowpages'
  ];

  const marketplaceDomains = [
    'amazon', 'flipkart', 'myntra', 'ajio', 'snapdeal', 'meesho', 'ebay'
  ];

  const bizKeywords = [
    'private limited', 'pvt ltd', 'pvt. ltd', 'limited', 'company', 'firm',
    'retail', 'wholesale', 'manufacturer', 'supplier', 'seller',
    'store', 'shop', 'buy', 'official', 'contact', 'manufacturer'
  ];

  // Tokenize seller name and filter short tokens
  const tokens = sellerName.toLowerCase().split(/\s+/).filter(t => t.length >= 3);

  const tokensInText = (text) => tokens.reduce((acc, tok) => acc + (text.includes(tok) ? 1 : 0), 0);
  const keywordsInText = (text) => bizKeywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
  const hostHasTokens = (host) => tokens.reduce((acc, tok) => acc + (host.includes(tok) ? 1 : 0), 0) >= 2;
  const textHasTokens = (text) => tokensInText(text) >= 2;

  try {
    const r = await fetch(url);
    const res = await r.json();
    if (!(res.items && res.items.length)) {
      window.RealDeal._verifyCache[cacheKey] = 'Unverified';
      return 'Unverified';
    }

    // Only consider top N results
    const topResults = (res.items || []).slice(0, 5);
    let verified = false;

    for (let idx = 0; idx < topResults.length; idx++) {
      const item = topResults[idx];
      const titleSnippet = `${(item.title || '')} ${(item.snippet || '')}`.toLowerCase();
      const link = (item.link || '').toLowerCase();
      let host = '';
      try {
        host = new URL(link).hostname.replace(/^www\./, '');
      } catch (_) {
        host = '';
      }

      const isApprovedDir = approvedDomains.some(d => host.includes(d));
      const isMarketplace = marketplaceDomains.some(d => host.includes(d));

      // Path A: direct site match (host contains >= 2 tokens) — not a marketplace
      if (host && hostHasTokens(host) && !isMarketplace) {
        verified = true;
        break;
      }

      // Path B: Approved directory & strong evidence: name in snippet + biz keyword(s)
      if (isApprovedDir) {
        if (textHasTokens(titleSnippet) && keywordsInText(titleSnippet) >= 1) {
          verified = true;
          break;
        }
      }

      // Path C: Marketplace results are only valid if from top marketplaces
      if (isMarketplace) {
        if (textHasTokens(titleSnippet)) {
          verified = true;
          break;
        }
      }
    }

    window.RealDeal._verifyCache[cacheKey] = verified ? 'Verified' : 'Unverified';
    return verified ? 'Verified' : 'Unverified';

  } catch (err) {
    console.error('[RealDeal] verifySeller error:', err);
    return 'Error'; // Handle API errors gracefully
  }
};
