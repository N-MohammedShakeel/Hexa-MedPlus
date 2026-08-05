export function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const diffMs = new Date(expiryDate) - new Date();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isExpiringSoon(expiryDate, thresholdDays = 30) {
  const days = daysUntilExpiry(expiryDate);
  return days !== null && days >= 0 && days <= thresholdDays;
}
