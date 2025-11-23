// =======================
// RealDealmeter.js (FINAL)
// =======================

// Function to render RealDeal insights
const renderRealDealInsights = async (panel) => {
  const container = document.getElementById('realdealMeterContainer');
  if (!container) {
    console.error('[RealDeal] RealDeal Meter container not found.');
    return;
  }

  container.innerHTML = `<p>Loading RealDeal insights...</p>`;

  try {
    const insights = await fetchRealDealInsights();

    if (insights.details.length === 0) {
      container.innerHTML = `<p>No insights available.</p>`;
      return;
    }

    // Render insights
    container.innerHTML = insights.details.map((insight, index) => `
      <div class="insight" style="opacity: 0; transform: translateY(10px); transition: all 0.5s ease ${index * 0.2}s; margin-bottom: 8px;">
        <p>${insight}</p>
      </div>
    `).join('');

    // Animate entries
    setTimeout(() => {
      const insightElements = container.querySelectorAll('.insight');
      insightElements.forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    }, 100);

    // Add Animated Recommendation Bar
    const barContainer = document.createElement('div');
    let barColor = '';
    if (insights.label === 'Skip') barColor = 'red';
    else if (insights.label === 'Wait') barColor = 'orange';
    else if (insights.label === 'Okay') barColor = 'teal';
    else if (insights.label === 'Yes') barColor = 'green';

    barContainer.innerHTML = `
      <h3>Recommendation</h3>
      <div style="background: #ddd; border-radius: 25px; height: 20px; width: 100%; position: relative; overflow: hidden; margin-bottom: 8px;">
        <div id="progress-bar" style="background: ${barColor}; height: 100%; width: 0%; border-radius: 25px; transition: width 1s ease;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 4px;">
        <span style="color: red;">Skip</span>
        <span style="color: orange;">Wait</span>
        <span style="color: teal;">Okay</span>
        <span style="color: green;">Yes</span>
      </div>
      <p style="margin-top: 8px; font-weight: bold; font-size: 16px;">Recommendation: ${insights.label}</p>
    `;

    container.appendChild(barContainer);

    // Animate the progress bar
    setTimeout(() => {
      document.getElementById('progress-bar').style.width = `${insights.percentage}%`;
    }, 100);

  } catch (err) {
    console.error('[RealDeal] Failed to load insights:', err);
    container.innerHTML = `<p style="color: red;">Failed to load insights. Please try again later.</p>`;
  }
};

// Function to fetch RealDeal insights
const fetchRealDealInsights = async () => {
  const seller = await window.RealDeal.scrapeSellerDetails();
  const reviews = await window.RealDeal.scrapeReviews();
  console.log(`[RealDeal] Reviews scraped: ${reviews.length}`);
  console.log(`[RealDeal] Reviews passed to analyzeReviews:`, reviews);
  const analysis = window.RealDeal.analyzeReviews(reviews);
  // Get product identifier safely (may be undefined if not exposed)
  const productId = (typeof window.getProductIdentifier === 'function') ? window.getProductIdentifier() : null;

  let insights = [];
  let score = 0;

  const maxScore = 7; // return policy (2), seller verification (2), rating (1), fake reviews (2)

  // 1. Return Policy Insight
  const returnPolicyElement = document.querySelector(
    'div.Marketing__TagCardStyled-sc-1ngqanf-1 span'
  );
  if (returnPolicyElement) {
    const returnPolicyText = returnPolicyElement.textContent.trim();
    insights.push(`✅ Product has a return policy`);
    score += 2;
  } else {
    insights.push('❌ No return policy information found.');
  }

  // 2. Seller Verification Insight
  if (seller.verification === 'Verified') {
    insights.push('✅ The seller is verified and trustworthy.');
    score += 2;
  } else if (seller.verification === 'Unverified') {
    insights.push('⚠️ The seller is not verified. Proceed with caution.');
  } else {
    insights.push('❌ Seller verification failed or unavailable.');
  }

  // 3. Product Rating Insight
  if (parseFloat(analysis.averageRating) >= 4.0) {
    insights.push('✅ This product has a good average rating.');
    score += 1;
  } else {
    insights.push('⚠️ This product has a low average rating.');
  }

  // 4. Fake Reviews Insight
  const totalReviews = analysis.totalReviews || 0; // Ensure totalReviews is available
  const fakeReviewCount = analysis.fakeReviewCount || 0; // Ensure fakeReviewCount is available

  if (totalReviews === 0) {
    insights.push('ℹ️ No reviews available to analyze fake reviews.');
  } else if (fakeReviewCount < 10) {
    insights.push(`✅ Few fake reviews detected (${fakeReviewCount} fake reviews out of ${totalReviews} total reviews).`);
    score += 2;
  } else {
    insights.push(`⚠️ Multiple potential fake reviews detected (${fakeReviewCount} fake reviews out of ${totalReviews} total reviews).`);
  }

  // Calculate Recommendation using maxScore
  let percentage = Math.round((score / maxScore) * 100);

  let label = '';
  if (percentage <= 30) label = 'Skip';
  else if (percentage <= 60) label = 'Wait';
  else if (percentage <= 85) label = 'Okay';
  else label = 'Yes';

  return { details: insights, score, percentage, label };
};

// Attach functions to the global window object for accessibility
window.renderRealDealInsights = renderRealDealInsights;
window.fetchRealDealInsights = fetchRealDealInsights;
