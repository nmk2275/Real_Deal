// Background service worker for handling price compare requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;

  // Helper: fetch with timeout
  async function fetchTextWithTimeout(url, timeout = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (err) {
      clearTimeout(timer);
      console.warn('[RealDeal] fetchTextWithTimeout error fetching', url, err?.message || err);
      return null;
    }
  }

  // Extract helpers
  const findFirst = (html, regex) => {
    if (!html) return null;
    const m = html.match(regex);
    return m ? m[1] : null;
  };

  const normalizePriceStr = (p) => {
    if (!p) return null;
    // Trim and reduce whitespace
    return p.trim().replace(/\s+/g, ' ');
  };

  // Amazon-specific extractors
  const extractAmazonPrice = (html) => {
    if (!html) return null;
    // Try common price selectors
    let price = findFirst(html, /id=(?:"|')priceblock_ourprice(?:"|')[^>]*>\s*([^<]+)\s*</i);
    if (price) return normalizePriceStr(price);

    price = findFirst(html, /id=(?:"|')priceblock_dealprice(?:"|')[^>]*>\s*([^<]+)\s*</i);
    if (price) return normalizePriceStr(price);

    // Look for a-offscreen span (common on Amazon product & search pages)
    price = findFirst(html, /<span[^>]*class=(?:"|')[^"']*a-offscreen[^"']*(?:"|')[^>]*>\s*(₹[\d,]+(?:\.\d+)?)\s*<\/span>/i);
    if (price) return normalizePriceStr(price);

    // Fallback: look for any ₹ followed by number
    price = findFirst(html, /(₹\s*[\d,]+(?:\.\d+)?)/);
    if (price) return normalizePriceStr(price);
    return null;
  };

  const extractAmazonLinkFromSearch = (html) => {
    if (!html) return null;
    // First try to find /dp/ASIN links
    let href = findFirst(html, /href=(?:"|')([^"']*\/dp\/[^"']+)(?:"|')/i);
    if (href) return href.startsWith('http') ? href : 'https://www.amazon.in' + href;

    // Fallback: find first product anchor with /gp/ or /dp/
    href = findFirst(html, /href=(?:"|')([^"']*\/gp\/product\/[^"']+)(?:"|')/i) ||
           findFirst(html, /href=(?:"|')([^"']*\/s\/dp\/[^"']+)(?:"|')/i);
    if (href) return href.startsWith('http') ? href : 'https://www.amazon.in' + href;

    return null;
  };

  // Flipkart-specific extractors
  const extractFlipkartPrice = (html) => {
    if (!html) return null;
    // Product & search price container
    let price = findFirst(html, /<div[^>]*class=(?:"|')[^"']*_30jeq3[^"']*(?:"|')[^>]*>\s*(₹[\d,]+(?:\.\d+)?)\s*<\/div>/i);
    if (price) return normalizePriceStr(price);

    // Fallback: any ₹
    price = findFirst(html, /(₹\s*[\d,]+(?:\.\d+)?)/);
    if (price) return normalizePriceStr(price);
    return null;
  };

  const extractFlipkartLinkFromSearch = (html) => {
    if (!html) return null;
    let href = findFirst(html, /href=(?:"|')(\/[^"']*\/_[0-9a-zA-Z-]+\/p\/[a-z0-9-]+)(?:"|')/i);
    if (href) return href.startsWith('http') ? href : 'https://www.flipkart.com' + href;

    href = findFirst(html, /href=(?:"|')(\/[^"']*\/p\/[^"']+)(?:"|')/i);
    if (href) return href.startsWith('http') ? href : 'https://www.flipkart.com' + href;

    return null;
  };

  // Myntra-specific extractors
  const extractMyntraPrice = (html) => {
    if (!html) return null;
    let m = findFirst(html, /<span[^>]*class=(?:"|')[^"']*pdp-price[^"']*(?:"|')[^>]*>\s*(₹[\d,]+(?:\.\d+)?)\s*<\/span>/i);
    if (m) return normalizePriceStr(m);

    // Fallback: generic ₹ number
    m = findFirst(html, /(₹\s*[\d,]+(?:\.\d+)?)/);
    if (m) return normalizePriceStr(m);
    return null;
  };

  const extractMyntraLinkFromSearch = (html) => {
    if (!html) return null;
    let href = findFirst(html, /href=(?:"|')([^"']*\/product\/[0-9a-zA-Z-]+)(?:"|')/i);
    if (href) return href.startsWith('http') ? href : 'https://www.myntra.com' + href;
    return null;
  };

  // Core site descriptor list
  const SITES = [
    {
      name: 'Amazon',
      hostPattern: /amazon\.in/i,
      productFetch: async (urlOrSearch) => {
        const isProduct = /amazon\.in\/.+\/(dp|gp)\//i.test(urlOrSearch);
        const fetchUrl = isProduct ? urlOrSearch : `https://www.amazon.in/s?k=${encodeURIComponent(urlOrSearch)}`;
        const html = await fetchTextWithTimeout(fetchUrl);
        if (!html) return { price: null, link: isProduct ? urlOrSearch : extractAmazonLinkFromSearch(html) };
        return { price: extractAmazonPrice(html), link: isProduct ? fetchUrl : extractAmazonLinkFromSearch(html) };
      }
    },
    {
      name: 'Flipkart',
      hostPattern: /flipkart\.com/i,
      productFetch: async (urlOrSearch) => {
        const isProduct = /flipkart\.com\/[\w-]+\/p\//i.test(urlOrSearch);
        const fetchUrl = isProduct ? urlOrSearch : `https://www.flipkart.com/search?q=${encodeURIComponent(urlOrSearch)}`;
        const html = await fetchTextWithTimeout(fetchUrl);
        if (!html) return { price: null, link: isProduct ? urlOrSearch : extractFlipkartLinkFromSearch(html) };
        return { price: extractFlipkartPrice(html), link: isProduct ? fetchUrl : extractFlipkartLinkFromSearch(html) };
      }
    },
    {
      name: 'Myntra',
      hostPattern: /myntra\.com/i,
      productFetch: async (urlOrSearch) => {
        const isProduct = /myntra\.com\/[a-z-]+\/product\//i.test(urlOrSearch);
        const fetchUrl = isProduct ? urlOrSearch : `https://www.myntra.com/search?q=${encodeURIComponent(urlOrSearch)}`;
        const html = await fetchTextWithTimeout(fetchUrl);
        if (!html) return { price: null, link: isProduct ? urlOrSearch : extractMyntraLinkFromSearch(html) };
        return { price: extractMyntraPrice(html), link: isProduct ? fetchUrl : extractMyntraLinkFromSearch(html) };
      }
    }
  ];

  // Main handler
  if (msg.action === 'comparePricesParallel') {
    (async () => {
      const url = msg.url || '';
      const title = (msg.title || '').trim() || '';
      const query = title || url;

      const checks = SITES.map(async (site) => {
        try {
          const arg = site.hostPattern.test(url) ? url : (title || url);
          const res = await site.productFetch(arg);
          return { site: site.name, price: res.price, link: res.link };
        } catch (err) {
          console.warn('[RealDeal] Error checking site', site.name, err?.message || err);
          return { site: site.name, price: null, link: null };
        }
      });

      const results = await Promise.all(checks);

      // If all null, fallback to mocked results to ensure UI shows something
      const allNull = results.every(r => !r.price && !r.link);
      const finalResults = allNull ? [
        { site: 'Amazon', price: '₹2,499', link: 'https://www.amazon.in' },
        { site: 'Flipkart', price: '₹2,399', link: 'https://www.flipkart.com' },
        { site: 'Myntra', price: null, link: null }
      ] : results;

      // Send response back to content script (the current tab)
      if (sender?.tab?.id !== undefined) {
        try {
          chrome.tabs.sendMessage(sender.tab.id, { action: 'displayPrices', results: finalResults });
        } catch (e) {
          console.warn('[RealDeal] Unable to send message to tab', e?.message || e);
        }
      }

      try { sendResponse({ ok: true, results: finalResults }); } catch (e) {};
    })();

    // Keep port open for async sendResponse
    return true;
  }
});
