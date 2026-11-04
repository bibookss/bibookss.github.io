export async function ensureSubdomain(api, name) {
  let subdomain;
  try {
    ({ subdomain } = await api('/workers/subdomain'));
  } catch (error) {
    const unregistered = error.errors?.some(item =>
      item.message?.includes('You do not have a workers.dev subdomain.')
    );
    if (!unregistered) throw error;
  }
  if (!subdomain) {
    ({ subdomain } = await api('/workers/subdomain', {
      method: 'PUT', body: JSON.stringify({ subdomain: name }),
    }));
  }
  if (!subdomain) throw new Error('Cloudflare did not return a workers.dev subdomain after registration');
  return subdomain;
}
