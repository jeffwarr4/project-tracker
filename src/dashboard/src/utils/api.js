async function req(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const qs = p => '?' + new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v != null)));

export const api = {
  auth:     phone          => req('/api/auth',    { method: 'POST', body: JSON.stringify({ phone }) }),
  projects: ()             => req('/api/projects'),
  stats:    ()             => req('/api/stats'),
  timelog:  (params = {})  => req('/api/timelog'  + (Object.keys(params).length ? qs(params) : '')),
  activity: (params = {})  => req('/api/activity' + (Object.keys(params).length ? qs(params) : '')),
  updateLinks: (id, links) => req(`/api/projects/${id}/links`, { method: 'PUT', body: JSON.stringify({ links }) }),
  logTime:  data           => req('/api/timelog', { method: 'POST', body: JSON.stringify(data) }),
  message:  data           => req('/api/message', { method: 'POST', body: JSON.stringify(data) }),
};
