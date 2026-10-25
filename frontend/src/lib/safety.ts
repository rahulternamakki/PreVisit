// Emergency detection patterns for client-side early-warning before network round-trip

const EMERGENCY_REGEXES = [
  /\b(chest\s+(pain|pressure|tightness|discomfort)|((crushing|sharp|severe|tight)\s+(chest\s+)?(pain|pressure|tightness))|(pain|pressure|tightness)\s+(in|on)\s+(the\s+|my\s+)?chest|pain\s+radiating\s+to\s+(my\s+)?(arm|jaw|neck|back)|heart\s+attack|cardiac\s+arrest)\b/i,
  /\b((can'?t|cannot|unable\s+to|trouble|difficulty|struggling\s+to)\s+breath\w*|shortness\s+of\s+breath|gasping\s+for\s+air|choking|suffocat\w*|severe\s+asthma\s+attack|respiratory\s+arrest)\b/i,
  /\b(face\s+(is\s+)?droop\w*|facial\s+droop\w*|drooping\s+face|slurr\w*\s+speech|speech\s+is\s+slurr\w*|arm\s+weakness|numb(ness)?\s+(on\s+)?(one|left|right)\s+side|stroke|transient\s+ischemic)\b/i,
  /\b(throat\s+(is\s+)?clos\w*|tongue\s+(is\s+)?swell\w*|swollen\s+(throat|tongue|lips)|anaphylax\w*|severe\s+allergic\s+reaction)\b/i,
  /\b(coughing\s+up\s+blood|vomiting\s+blood|bleeding\s+profusely|gushing\s+blood|uncontrolled\s+bleeding|severe\s+hemorrhage)\b/i,
  /\b(kill\s+myself|suicid\w*|end\s+my\s+life|want\s+to\s+die|harm\s+myself|take\s+my\s+own\s+life)\b/i,
  /\b(worst\s+headache\s+of\s+my\s+life|thunderclap\s+headache|sudden\s+explosive\s+headache)\b/i,
  /\b(passed\s+out|lost\s+consciousness|blacked\s+out|unresponsive|fainted\s+suddenly)\b/i,
  /\b(seiz\w*|convuls\w*|fit\s+and\s+shaking|having\s+a\s+fit)\b/i,
  /\b(overdose|poison\w*|swallowed\s+(pills|chemical|toxic)|drank\s+bleach)\b/i,
];

export function checkClientEmergency(text: string): boolean {
  if (!text) return false;
  return EMERGENCY_REGEXES.some((regex) => regex.test(text));
}
