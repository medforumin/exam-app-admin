export const getExpiryMs = (g) => {
  if (!g) return null;
  if (typeof g === 'number') return g;
  if (g instanceof Date) return g.getTime();
  if (g && typeof g.toDate === 'function') return g.toDate().getTime();
  if (g && typeof g.seconds === 'number') return g.seconds * 1000;
  const parsed = Date.parse(g);
  return isNaN(parsed) ? null : parsed;
};

export const getDateMs = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toDate === 'function') return value.toDate().getTime();
  if (value && typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = Date.parse(value);
  return isNaN(parsed) ? null : parsed;
};

export const formatExpiry = (g) => {
  const ms = getExpiryMs(g);
  return ms ? new Date(ms).toLocaleDateString() : 'N/A';
};

export const formatJoinDate = (createdAt, fallbackValue = null) => {
  const ms = getDateMs(createdAt) ?? getDateMs(fallbackValue);
  return ms ? new Date(ms).toLocaleDateString() : 'N/A';
};
