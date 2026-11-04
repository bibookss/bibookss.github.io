const isUnregistered = error => error.errors?.some(item =>
  item.code === 10007 || item.message?.includes('You do not have a workers.dev subdomain.')
);

export async function ensureSubdomain(api, name, {
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  attempts = 12,
} = {}) {
  let subdomain;
  try {
    ({ subdomain } = await api('/workers/subdomain'));
  } catch (error) {
    if (!isUnregistered(error)) throw error;
  }
  if (subdomain) return subdomain;
  const registered = await api('/workers/subdomain', {
    method: 'PUT', body: JSON.stringify({ subdomain: name }),
  });
  if (!registered.subdomain) throw new Error('Cloudflare did not return a workers.dev subdomain after registration');
  // Registration is asynchronous: Wrangler uses GET, not the successful PUT response.
  for (let attempt = 0; attempt < attempts; attempt++) {
    await sleep(5000);
    try {
      const visible = await api('/workers/subdomain');
      if (visible.subdomain) return visible.subdomain;
    } catch (error) {
      if (!isUnregistered(error)) throw error;
    }
  }
  throw new Error('Cloudflare accepted workers.dev registration but it is not readable yet. Retry the deployment once registration finishes.');
}
