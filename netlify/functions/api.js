exports.handler = async function(event) {
  const params = new URLSearchParams(event.queryStringParameters).toString();
  const API = "https://script.google.com/macros/s/AKfycbwJb7TxxSZq7z87R_JdM_pyJgHwBa_Dv7k01u_ubFd68z5uFdVU6AS73DWHbUJnDDSK/exec";
  
  try {
    const res = await fetch(`${API}?${params}`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const text = await res.text();
    
    // Strip JSONP wrapper if present (e.g. callback({...}) )
    const stripped = text.trim().replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/, '').replace(/\);?\s*$/, '');
    
    // Parse and verify it has ok:true — if not, wrap it
    let data;
    try {
      data = JSON.parse(stripped);
    } catch(e) {
      data = { ok: false, error: "Parse error: " + stripped.slice(0, 100) };
    }
    
    // If it's a raw array (items directly), wrap it
    if (Array.isArray(data)) {
      data = { ok: true, items: data };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
