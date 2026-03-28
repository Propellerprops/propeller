exports.handler = async function(event) {
  const params = new URLSearchParams(event.queryStringParameters).toString();
  const API = "https://script.google.com/macros/s/AKfycbwJb7TxxSZq7z87R_JdM_pyJgHwBa_Dv7k01u_ubFd68z5uFdVU6AS73DWHbUJnDDSK/exec";
  
  try {
    const res = await fetch(`${API}?${params}`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const text = await res.text();
    // Strip JSONP wrapper if present
    const json = text.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, '');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: json
    };
  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
