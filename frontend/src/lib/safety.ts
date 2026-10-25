// Emergency detection patterns for client-side early-warning before network round-trip

const EMERGENCY_REGEXES = [
  /\b(chest\s+pain|pressure\s+(in|on)\s+(the\s+)?chest|tightness\s+(in|on)\s+(the\s+)?chest|pain\s+radiating\s+to\s+(my\s+)?(arm|jaw|neck|back)|heart\s+attack)\b/i,
  /\b((can'?t|cannot|unable\s+to|trouble|difficulty|struggling\s+to)\s+breath\w*|shortness\s+of\s+breath|gasping\s+for\s+air|choking)\b/i,
  /\b(face\s+(is\s+)?droop\w*|facial\s+droop\w*|drooping\s+face|slurr\w*\s+speech|speech\s+is\s+slurr\w*|arm\s+weakness|numb(ness)?\s+(on\s+)?(one|left|right)\s+side|stroke)\b/i,
  /\b(throat\s+(is\s+)?clos\w*|tongue\s+(is\s+)?swell\w*|swollen\s+(throat|tongue|lips)|anaphylax\w*)\b/i,
  /\b(coughing\s+up\s+blood|vomiting\s+blood|bleeding\s+profusely|gushing\s+blood|uncontrolled\s+bleeding)\b/i,
  /\b(kill\s+myself|suicid\w*|end\s+my\s+life|want\s+to\s+die|harm\s+myself)\b/i,
  /\b(worst\s+headache\s+of\s+my\s+life|thunderclap\s+headache)\b/i,
  /\b(passed\s+out|lost\s+consciousness|blacked\s+out)\b/i,
];

export function checkClientEmergency(text: string): boolean {
  if (!text) return false;
  return EMERGENCY_REGEXES.some((regex) => regex.test(text));
}
