// Using Deno.serve per guidelines
Deno.serve(async (req)=>{
  try {
    // Only allow POST
    if (req.method !== 'POST') return new Response('Method Not Allowed', {
      status: 405
    });
    const apiKey = Deno.env.get('MY_CRON_API_KEY') ?? '';
    const forwardResp = await fetch('https://dashboard.nest-link.app/api/check-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': apiKey
      },
      body: await req.text()
    });
    const body = await forwardResp.arrayBuffer();
    const headers = new Headers(forwardResp.headers);
    return new Response(body, {
      status: forwardResp.status,
      headers
    });
  } catch (err) {
    console.error(err);
    return new Response('Internal Server Error', {
      status: 500
    });
  }
});
