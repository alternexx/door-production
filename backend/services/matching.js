/**
 * DOOR — AI-Style Qualification & Matching Engine
 */

function computeQualScore({ annual_income, credit_score, id_verified, income_verified }) {
  let score = 0;
  let credit_tier = 'poor';

  // Credit score (0-40 pts)
  if (credit_score >= 800)      { score += 40; credit_tier = 'exceptional'; }
  else if (credit_score >= 740) { score += 35; credit_tier = 'very-good'; }
  else if (credit_score >= 670) { score += 28; credit_tier = 'good'; }
  else if (credit_score >= 580) { score += 18; credit_tier = 'fair'; }
  else                          { score += 8;  credit_tier = 'poor'; }

  // Income (0-30 pts)
  if      (annual_income >= 150000) score += 30;
  else if (annual_income >= 100000) score += 26;
  else if (annual_income >= 75000)  score += 22;
  else if (annual_income >= 50000)  score += 16;
  else if (annual_income >= 30000)  score += 10;
  else if (annual_income > 0)       score += 5;

  // Verification (0-30 pts)
  if (id_verified)     score += 15;
  if (income_verified) score += 15;

  let qual_tier;
  if      (score >= 80) qual_tier = 'platinum';
  else if (score >= 65) qual_tier = 'gold';
  else if (score >= 45) qual_tier = 'silver';
  else if (score >= 25) qual_tier = 'bronze';
  else                  qual_tier = 'unqualified';

  return { qual_score: score, qual_tier, credit_tier };
}

function scoreListingForUser(listing, qual) {
  if (!qual) {
    return {
      match_score: 0,
      match_reasons: ['Complete qualification to see your match score'],
      eligible: false
    };
  }

  let score = 0;
  const reasons = [];
  const rent = parseFloat(listing.rent);

  // Eligibility
  const required_annual = rent * 40;
  const income_ok    = parseFloat(qual.annual_income) >= required_annual;
  const credit_ok    = parseInt(qual.credit_score) >= 580;
  const budget_ok    = !qual.max_rent || rent <= parseFloat(qual.max_rent);
  const eligible     = income_ok && credit_ok && qual.id_verified && qual.income_verified;

  // Income match (0-30)
  if (income_ok) {
    const ratio = parseFloat(qual.annual_income) / required_annual;
    score += Math.min(30, 20 + Math.floor((ratio - 1) * 10));
    reasons.push(`✓ Income $${Math.round(qual.annual_income / 1000)}k qualifies`);
  } else {
    reasons.push(`⚠ Income needs to be $${Math.round(required_annual / 1000)}k+`);
  }

  // Credit (0-25)
  if (credit_ok) {
    score += Math.min(25, Math.floor((parseInt(qual.credit_score) - 580) / 12) + 10);
    reasons.push(`✓ Credit score ${qual.credit_score} (${qual.credit_tier})`);
  } else {
    reasons.push(`⚠ Credit ${qual.credit_score} below minimum 580`);
  }

  // Budget (0-20)
  if (budget_ok) {
    if (qual.max_rent && rent <= parseFloat(qual.max_rent) * 0.85) {
      score += 20;
      const savings = Math.round((1 - rent / parseFloat(qual.max_rent)) * 100);
      reasons.push(`✓ ${savings}% under your budget`);
    } else {
      score += 12;
      reasons.push('✓ Within your budget');
    }
  } else {
    reasons.push(`⚠ Over your $${qual.max_rent}/mo budget`);
  }

  // Beds (0-10)
  const min_beds = parseInt(qual.min_beds || 0);
  if (listing.beds >= min_beds) {
    score += listing.beds === min_beds ? 10 : 7;
    reasons.push(`✓ ${listing.beds === 0 ? 'Studio' : listing.beds + 'BR'} matches preference`);
  }

  // Neighborhood (0-10)
  const neighborhoods = Array.isArray(qual.neighborhoods)
    ? qual.neighborhoods
    : (typeof qual.neighborhoods === 'string' ? JSON.parse(qual.neighborhoods || '[]') : []);

  if (!neighborhoods.length || neighborhoods.some(n =>
    listing.neighborhood?.toLowerCase().includes(n.toLowerCase()) ||
    n.toLowerCase().includes(listing.neighborhood?.toLowerCase() || '')
  )) {
    score += 10;
    if (neighborhoods.length) reasons.push(`✓ ${listing.neighborhood} matches your areas`);
  }

  // Pet (0-5)
  if (qual.pet_friendly && listing.pet_friendly) {
    score += 5;
    reasons.push('✓ Pet-friendly');
  } else if (qual.pet_friendly && !listing.pet_friendly) {
    score -= 5;
  }

  // Same-day bonus
  if (listing.same_day) reasons.push('⚡ Same-day move-in');

  // Verification bonus
  if (qual.id_verified)     score += 2;
  if (qual.income_verified) score += 3;

  return {
    match_score: Math.max(0, Math.min(100, score)),
    match_reasons: reasons.slice(0, 5),
    eligible,
  };
}

module.exports = { computeQualScore, scoreListingForUser };
