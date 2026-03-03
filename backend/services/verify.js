/**
 * DOOR — Mock Verification Services
 * Production: swap with Stripe Identity, Plaid, TransUnion
 */

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function mockVerifyID({ id_type, id_number, dob }) {
  await delay(400);
  if (!id_type || !id_number || !dob) return { verified: false, reason: 'Missing ID fields' };
  const passed = id_number.length >= 6 && Math.random() > 0.05;
  return {
    verified: passed,
    provider: 'DOOR Identity v1',
    reason: passed ? 'Identity verified' : 'Could not verify',
    timestamp: new Date().toISOString(),
  };
}

async function mockVerifyIncome({ annual_income, employer, employment_type }) {
  await delay(500);
  if (!annual_income || annual_income <= 0) return { verified: false, reason: 'No income provided' };
  const hasEmployer = !!(employer?.length > 1);
  const passed = hasEmployer ? Math.random() > 0.08 : Math.random() > 0.25;
  return {
    verified: passed,
    provider: 'DOOR Income v1',
    reported_income: annual_income,
    verified_income: passed ? annual_income * (0.95 + Math.random() * 0.1) : null,
    reason: passed ? 'Income verified via bank statements' : 'Unable to verify income',
    timestamp: new Date().toISOString(),
  };
}

async function mockPullCredit({ ssn_last4, credit_score_override }) {
  await delay(600);
  if (credit_score_override) {
    return { score: Math.min(850, Math.max(300, parseInt(credit_score_override))), provider: 'DOOR Credit Demo' };
  }
  const scores = [580, 620, 650, 680, 710, 730, 750, 770, 790, 810];
  const weights = [0.05, 0.08, 0.12, 0.15, 0.20, 0.18, 0.12, 0.06, 0.03, 0.01];
  let r = Math.random(), score = 680, cum = 0;
  for (let i = 0; i < scores.length; i++) {
    cum += weights[i];
    if (r <= cum) { score = scores[i] + Math.floor(Math.random() * 20); break; }
  }
  return {
    score: Math.min(850, Math.max(300, score)),
    provider: 'DOOR TransUnion Mock',
    report_id: `RPT-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { mockVerifyID, mockVerifyIncome, mockPullCredit };
