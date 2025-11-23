// Namespace for Reviews Authenticity
window.RealDeal = window.RealDeal || {};

/* ---------- Helper: Wait for Element ---------- */
const waitForElement = (selector, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const interval = 100;
    let elapsed = 0;

    const check = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (elapsed >= timeout) return reject(`Timeout waiting for: ${selector}`);
      elapsed += interval;
      setTimeout(check, interval);
    };

    check();
  });
};

/* ---------- Scrape Overall Rating and Counts ---------- */
window.RealDeal.scrapeOverallRating = () => {
  // Try multiple selectors to find the overall rating
  let rating = 'N/A';
  let ratingsCount = '0';
  let reviewsCount = '0';
  
  // Primary selector: The large rating display
  const ratingElement = document.querySelector('span.sc-dOfePm.fDqAoN');
  if (ratingElement) {
    rating = ratingElement.textContent.trim();
  }
  
  // Get ratings count from the count section
  const allSpans = document.querySelectorAll('span.sc-dOfePm.fTrqZg');
  allSpans.forEach(span => {
    const text = span.textContent.trim();
    if (text.match(/\d+.*Ratings/i)) {
      ratingsCount = text.match(/(\d+)/)?.[1] || '0';
    }
    if (text.match(/\d+.*Reviews/i)) {
      reviewsCount = text.match(/(\d+)/)?.[1] || '0';
    }
  });

  console.log(`[RealDeal] Overall Rating: ${rating}, Ratings: ${ratingsCount}, Reviews: ${reviewsCount}`);
  return { rating, ratingsCount, reviewsCount };
};

/* ---------- Scrape Unique Valid Reviews ---------- */
// Cache for storing scraped reviews
let lastProductId = null;
let cachedReviews = null;

window.RealDeal.scrapeReviews = async () => {
  // Get a unique product identifier from DOM
  const productTitle = document.querySelector('h1')?.textContent.trim() || 'unknown-product';

  // If the product has changed, invalidate the cache
  if (lastProductId !== productTitle) {
    console.log('[RealDeal] Product changed. Clearing previous review cache.');
    lastProductId = productTitle;
    cachedReviews = null;
  }

  if (cachedReviews) {
    console.log('[RealDeal] Returning cached reviews for product:', productTitle);
    return cachedReviews;
  }

  const reviewMap = new Map();

  // Step 0: First, try to scrape reviews visible on the page (before opening drawer)
  // These are reviews shown in the initial "Product Ratings & Reviews" section
  const initialReviewSection = document.querySelector('div.sc-kFkjun.krCeEM');
  if (initialReviewSection) {
    console.log('[RealDeal] Found initial review section, checking for visible reviews...');
    const initialReviews = initialReviewSection.querySelectorAll('div.sc-kFkjun.ghANen');
    console.log(`[RealDeal] Found ${initialReviews.length} potential review divs in initial section`);
    
    Array.from(initialReviews).forEach(el => {
      const usernameEl = el.querySelector('span.sc-dOfePm.heJNlj');
      const textEl = el.querySelector('span.sc-dOfePm.kBqyGz.Comment__CommentText-sc-1ju5q0e-3') ||
                     el.querySelector('span.sc-dOfePm.kBqyGz') ||
                     el.querySelector('span[class*="CommentText"]');
      
      if (usernameEl && textEl) {
        const username = usernameEl.textContent.trim();
        const text = textEl.textContent.trim();
        const key = `${username.toLowerCase()}::${text.toLowerCase()}`;
        
        // Extract rating
        let rating = 0;
        const ratingContainer = el.querySelector('span.sc-gozoIq.igICuP') || 
                                el.querySelector('span.sc-kCDvBi.cnIQtr') ||
                                el.querySelector('span.sc-gozoIq') ||
                                el.querySelector('span.sc-kCDvBi');
        if (ratingContainer) {
          const labelAttr = ratingContainer.getAttribute('label');
          if (labelAttr) {
            rating = parseFloat(labelAttr) || 0;
          } else {
            const ratingValueEl = ratingContainer.querySelector('span.sc-dOfePm.jklcNf');
            if (ratingValueEl) {
              rating = parseFloat(ratingValueEl.textContent.trim()) || 0;
            }
          }
        }
        
        // Extract date
        let date = 'Unknown date';
        const dateSpans = el.querySelectorAll('span.sc-dOfePm.fTrqZg');
        for (let dateSpan of dateSpans) {
          const dateText = dateSpan.textContent.trim();
          if (dateText.includes('Posted on')) {
            const dateMatch = dateText.match(/Posted on\s*(.+)/i);
            if (dateMatch) {
              date = dateMatch[1].trim();
            } else {
              date = dateText.replace(/Posted on/gi, '').trim();
            }
            break;
          }
        }
        
        if (!reviewMap.has(key)) {
          reviewMap.set(key, { username, text, rating, date, count: 1 });
          console.log(`[RealDeal] Added initial review: ${username} - ${text.substring(0, 50)}...`);
        }
      }
    });
  }

  // Step 1: Open "View All Reviews" - use flexible selector
  // Look for button with "View all reviews" text - can be in button or span inside button
  const viewAllBtn = [...document.querySelectorAll('button, a, span, div')].find(el => {
    const text = el.textContent.trim().toLowerCase();
    return (text.includes('view all reviews') || text.includes('see all reviews')) &&
           (el.tagName === 'BUTTON' || el.closest('button'));
  });
  
  if (viewAllBtn) {
    console.log('[RealDeal] Clicking "View All Reviews"...');
    const buttonToClick = viewAllBtn.tagName === 'BUTTON' ? viewAllBtn : viewAllBtn.closest('button');
    if (buttonToClick) {
      buttonToClick.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(res => setTimeout(res, 200));
      buttonToClick.click();
      
      // Wait for drawer/modal to open - try multiple selectors
      const drawerSelectors = [
        'div.RatingReviewDrawer__StyledCard-sc-y5ksev-1',
        '[class*="RatingReviewDrawer"]',
        '[class*="Drawer"]',
        '[class*="Modal"]'
      ];
      let drawerFound = false;
      for (let selector of drawerSelectors) {
        try {
          await waitForElement(selector, 3000);
          drawerFound = true;
          console.log(`[RealDeal] Drawer found with selector: ${selector}`);
          break;
        } catch (e) {
          // Try next selector
        }
      }
      
      // Wait a bit more for content to load
      await new Promise(res => setTimeout(res, 1000));
    }
  } else {
    console.log('[RealDeal] "View All Reviews" button not found, checking if drawer is already open...');
  }

  // Step 2: Load all reviews by clicking "View More" repeatedly
  let previousCount = 0;
  let iterationCount = 0;
  const maxIterations = 20;

  while (iterationCount < maxIterations) {
    // Look for "View more" button - can be button.RatingReviewDrawer__ViewMoreButton-sc-y5ksev-0
    // or any button containing "View more" text
    const viewMoreBtn = document.querySelector('button.RatingReviewDrawer__ViewMoreButton-sc-y5ksev-0') ||
                       [...document.querySelectorAll('button')].find(btn => {
                         const text = btn.textContent.trim().toLowerCase();
                         return text.includes('view more') && !text.includes('view all reviews');
                       });
    
    if (!viewMoreBtn) {
      console.log('[RealDeal] "View More" button not found, stopping iteration');
      break;
    }

    // Check if button is visible and clickable
    const rect = viewMoreBtn.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.log('[RealDeal] "View More" button is not visible');
      break;
    }

    viewMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(res => setTimeout(res, 300));
    
    try {
      viewMoreBtn.click();
      console.log(`[RealDeal] Clicked "View More" button (iteration ${iterationCount + 1})`);
    } catch (err) {
      console.warn('[RealDeal] Error clicking "View More" button:', err);
      break;
    }

    // Wait for new reviews to load
    await new Promise(res => setTimeout(res, 800));
    
    // Count review elements - look for divs with username and review text
    const drawerContainer = document.querySelector('div.RatingReviewDrawer__StyledCard-sc-y5ksev-1') ||
                            document.querySelector('[class*="RatingReviewDrawer"]');
    
    let currentCount = 0;
    if (drawerContainer) {
      const reviewDivs = drawerContainer.querySelectorAll('div.sc-kFkjun.ghANen');
      currentCount = Array.from(reviewDivs).filter(el => {
        const usernameEl = el.querySelector('span.sc-dOfePm.heJNlj');
        const textEl = el.querySelector('span.sc-dOfePm.kBqyGz.Comment__CommentText-sc-1ju5q0e-3') ||
                       el.querySelector('span.sc-dOfePm.kBqyGz') ||
                       el.querySelector('span[class*="CommentText"]');
        return usernameEl && textEl;
      }).length;
    }
    
    console.log(`[RealDeal] Iteration ${iterationCount + 1}: Found ${currentCount} reviews`);
    
    if (currentCount === previousCount && currentCount > 0) {
      console.log('[RealDeal] Review count unchanged, stopping iteration');
      break;
    }
    previousCount = currentCount;

    iterationCount++;
  }

  if (iterationCount >= maxIterations) {
    console.warn('[RealDeal] Stopped loading reviews after reaching the maximum iteration limit.');
  }

  // Step 3: Scrape reviews - look for individual review divs
  // Each review is a div with class "sc-kFkjun ghANen" that contains username and review text
  // They are siblings inside the drawer, separated by dividers
  
  // First, find the drawer container
  const drawerContainer = document.querySelector('div.RatingReviewDrawer__StyledCard-sc-y5ksev-1') ||
                          document.querySelector('[class*="RatingReviewDrawer"]') ||
                          document.querySelector('[class*="Drawer"]');
  
  let reviewElements = [];
  
  if (drawerContainer) {
    console.log('[RealDeal] Drawer container found, searching for reviews...');
    // Find all potential review divs - look for divs that contain username spans
    const allDivs = drawerContainer.querySelectorAll('div.sc-kFkjun.ghANen');
    console.log(`[RealDeal] Found ${allDivs.length} potential review divs in drawer`);
    
    reviewElements = Array.from(allDivs).filter(el => {
      // Check for username element (span.sc-dOfePm.heJNlj)
      const usernameEl = el.querySelector('span.sc-dOfePm.heJNlj');
      
      // Check for review text (span.sc-dOfePm.kBqyGz with Comment__CommentText class)
      const textEl = el.querySelector('span.sc-dOfePm.kBqyGz.Comment__CommentText-sc-1ju5q0e-3') ||
                     el.querySelector('span.sc-dOfePm.kBqyGz') ||
                     el.querySelector('span[class*="CommentText"]');
      
      // Must have both username and review text to be a valid review
      const isValid = usernameEl && textEl;
      if (isValid) {
        console.log(`[RealDeal] Valid review found: ${usernameEl.textContent.trim()} - ${textEl.textContent.trim().substring(0, 50)}...`);
      }
      return isValid;
    });
    
    console.log(`[RealDeal] Found ${reviewElements.length} valid review elements in drawer`);
  } else {
    // Fallback: search entire document (including reviews visible on page before opening drawer)
    console.log('[RealDeal] Drawer container not found, searching entire document...');
    const allDivs = document.querySelectorAll('div.sc-kFkjun.ghANen');
    console.log(`[RealDeal] Found ${allDivs.length} potential review divs in document`);
    
    reviewElements = Array.from(allDivs).filter(el => {
      const usernameEl = el.querySelector('span.sc-dOfePm.heJNlj');
      const textEl = el.querySelector('span.sc-dOfePm.kBqyGz.Comment__CommentText-sc-1ju5q0e-3') ||
                     el.querySelector('span.sc-dOfePm.kBqyGz') ||
                     el.querySelector('span[class*="CommentText"]');
      const isValid = usernameEl && textEl;
      if (isValid) {
        console.log(`[RealDeal] Valid review found: ${usernameEl.textContent.trim()} - ${textEl.textContent.trim().substring(0, 50)}...`);
      }
      return isValid;
    });
    
    console.log(`[RealDeal] Found ${reviewElements.length} valid review elements in document`);
  }

  console.log(`[RealDeal] Total filtered to ${reviewElements.length} valid review elements`);

  reviewElements.forEach(el => {
    try {
      // Extract username
      const usernameEl = el.querySelector('span.sc-dOfePm.heJNlj') ||
                         el.querySelector('[class*="user"], [class*="name"]') ||
                         [...el.querySelectorAll('span, div, p')].find(e => {
                           const t = e.textContent.trim();
                           return t.length < 50 && !t.match(/\d+/) && !t.includes('ago') && !t.includes('/');
                         });
      const username = usernameEl?.textContent.trim() || 'Anonymous';
      
      // Extract review text - look for CommentText span
      let text = 'No review text';
      const textEl = el.querySelector('span.sc-dOfePm.kBqyGz.Comment__CommentText-sc-1ju5q0e-3') ||
                     el.querySelector('span.sc-dOfePm.kBqyGz') ||
                     el.querySelector('span[class*="CommentText"]');
      if (textEl) {
        text = textEl.textContent.trim();
      } else {
        // Fallback: find longest text element
        const textElements = el.querySelectorAll('p, span, div');
        let maxLength = 0;
        for (let te of textElements) {
          const t = te.textContent.trim();
          if (t.length > maxLength && t.length > 10 && !t.match(/^(Posted on|Helpful)/i)) {
            text = t;
            maxLength = t.length;
          }
        }
      }
      
      // Extract rating - can be in span.sc-gozoIq or span.sc-kCDvBi with label attribute
      // Or in the nested span.sc-dOfePm.jklcNf
      let rating = 0;
      const ratingContainer = el.querySelector('span.sc-gozoIq.igICuP') || 
                              el.querySelector('span.sc-kCDvBi.cnIQtr') ||
                              el.querySelector('span.sc-gozoIq') ||
                              el.querySelector('span.sc-kCDvBi');
      
      if (ratingContainer) {
        // First try the label attribute
        const labelAttr = ratingContainer.getAttribute('label');
        if (labelAttr) {
          rating = parseFloat(labelAttr) || 0;
        } else {
          // Try to get from nested span with rating value
          const ratingValueEl = ratingContainer.querySelector('span.sc-dOfePm.jklcNf');
          if (ratingValueEl) {
            rating = parseFloat(ratingValueEl.textContent.trim()) || 0;
          } else {
            // Try to parse from container text
            const ratingText = ratingContainer.textContent.trim();
            const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
            if (ratingMatch) {
              rating = parseFloat(ratingMatch[1]) || 0;
            }
          }
        }
      }
      
      // Extract date - look for span with "Posted on" text
      let date = 'Unknown date';
      const dateSpans = el.querySelectorAll('span.sc-dOfePm.fTrqZg');
      for (let dateSpan of dateSpans) {
        const dateText = dateSpan.textContent.trim();
        if (dateText.includes('Posted on')) {
          // Extract date part after "Posted on"
          const dateMatch = dateText.match(/Posted on\s*(.+)/i);
          if (dateMatch) {
            date = dateMatch[1].trim();
          } else {
            date = dateText.replace(/Posted on/gi, '').trim();
          }
          break;
        }
      }
      
      // Fallback: search in all text
      if (date === 'Unknown date') {
        const dateText = el.textContent;
        const dateMatch = dateText.match(/(\d{1,2}\s+\w+\s+\d{4})|(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
        if (dateMatch) date = dateMatch[0];
      }

      const key = `${username.toLowerCase()}::${text.toLowerCase()}`;
      if (reviewMap.has(key)) {
        reviewMap.get(key).count += 1;
      } else {
        reviewMap.set(key, { username, text, rating, date, count: 1 });
      }
    } catch (err) {
      console.warn('[RealDeal] Error processing review:', err);
    }
  });

  const reviews = Array.from(reviewMap.values());
  console.log(`[RealDeal] Scraped ${reviews.length} unique reviews for: ${productTitle}`);

  cachedReviews = reviews;

  // Step 4: Close the drawer
  try {
    console.log('[RealDeal] Attempting to close the drawer...');

    const drawerSelectors = ['[class*="Drawer"]', '[class*="Modal"]', '[class*="drawer"]', '[class*="modal"]'];
    let drawer = null;
    for (let selector of drawerSelectors) {
      drawer = document.querySelector(selector);
      if (drawer) break;
    }
    
    if (!drawer) {
      console.warn('[RealDeal] Drawer not found.');
      return reviews;
    }
    
    // Find close button - try multiple strategies
    const closeSelectors = [
      'button[aria-label*="close" i]',
      '[class*="Close"]',
      '[class*="close"]',
      'svg[class*="close"]',
      'button:has(svg)',
      'span[class*="close"]'
    ];
    
    let closeBtn = null;
    for (let selector of closeSelectors) {
      closeBtn = drawer.querySelector(selector);
      if (closeBtn) break;
    }
    
    if (!closeBtn) {
      const allButtons = drawer.querySelectorAll('button, span, div');
      closeBtn = [...allButtons].find(btn => {
        const text = btn.textContent.trim();
        return text === '✖' || text === '×' || text === 'X' || text.toLowerCase().includes('close');
      });
    }
    
    if (!closeBtn) {
      const svgs = drawer.querySelectorAll('svg');
      closeBtn = [...svgs].find(svg => {
        const parent = svg.closest('button, span, div');
        return parent && (parent.onclick || parent.getAttribute('role') === 'button');
      })?.closest('button, span, div');
    }

    if (closeBtn) {
      closeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
      closeBtn.dispatchEvent(evt);
      console.log('[RealDeal] Dispatched native click to close the drawer.');
    }

  } catch (err) {
    // Silently continue
  }

  return reviews;
};

/* ---------- Analyze Reviews ---------- */
window.RealDeal.analyzeReviews = (reviews) => {
  if (!reviews || reviews.length === 0) {
    return {
      averageRating: 'N/A',
      fakeReviewCount: 0,
      totalReviews: 0,
      mostRecentReview: {
        text: 'No reviews available.',
        username: 'N/A',
        date: 'N/A'
      }
    };
  }

  let totalRating = 0;
  let totalReviews = 0;
  let fakeReviewCount = 0;

  // Helper function to parse dates
  const parseDate = (str) => {
    const match = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    return match ? new Date(`${match[2]} ${match[1]}, ${match[3]}`) : new Date(0);
  };

  let mostRecentReview = null;

  // Process each review
  reviews.forEach(r => {
    totalRating += r.rating * r.count; // Weighted rating
    totalReviews += r.count; // Total number of reviews (including duplicates)
    if (r.count > 1) fakeReviewCount += r.count - 1; // Count duplicates as fake reviews

    // Find the most recent review
    if (!mostRecentReview || parseDate(r.date) > parseDate(mostRecentReview.date)) {
      mostRecentReview = r;
    }
  });

  const averageRating = (totalRating / totalReviews).toFixed(1); // Calculate average rating

  console.log(`Total reviews processed: ${totalReviews}`);
  console.log(`Fake reviews detected: ${fakeReviewCount}`);
  console.log(`Most recent review: ${mostRecentReview.text} by ${mostRecentReview.username} on ${mostRecentReview.date}`);

  return {
    averageRating,
    fakeReviewCount,
    totalReviews,
    mostRecentReview
  };
};

/* ---------- Render Final Output ---------- */
window.RealDeal.renderReviews = async (panel) => {
  const container = document.getElementById('reviewsContainer');
  container.innerHTML = `<p>Loading reviews...</p>`;

  const overallData = window.RealDeal.scrapeOverallRating();
  const reviews = await window.RealDeal.scrapeReviews(); // Uses cached data if available

  if (reviews.length === 0) {
    container.innerHTML = `
      <h3>Reviews Analysis</h3>
      <p><strong>Overall Rating:</strong> ${overallData.rating}</p>
      <p><strong>Number of Ratings:</strong> ${overallData.ratingsCount}</p>
      <p><strong>Number of Reviews:</strong> ${overallData.reviewsCount}</p>
      <p><strong>Fake Reviews Detected:</strong> 0</p>
      <p><strong>Most Recent Review:</strong> No reviews available.</p>
    `;
    return;
  }

  const analysis = window.RealDeal.analyzeReviews(reviews);

  container.innerHTML = `
    <h3>Reviews Analysis</h3>
    <p><strong>Overall Rating:</strong> ${overallData.rating}</p>
    <p><strong>Number of Ratings:</strong> ${overallData.ratingsCount}</p>
    <p><strong>Number of Reviews:</strong> ${overallData.reviewsCount}</p>
    <p><strong>Fake Reviews Detected:</strong> ${analysis.fakeReviewCount}</p>
    <p><strong>Most Recent Review:</strong> ${analysis.mostRecentReview.text} (by ${analysis.mostRecentReview.username} on ${analysis.mostRecentReview.date})</p>
  `;
};
