// Account registration only. Identity and permissions are set by this function.
const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const internalHeaders = { "apikey": serviceKey, "Authorization": "Bearer " + serviceKey, "Content-Type":"application/json" };
const cors = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Cache-Control":"no-store"
};
const result = (status:number, code:string) => Response.json({code}, {status, headers:cors});
Deno.serve(async req => {
  if(req.method === "OPTIONS") return new Response(null, {headers:cors});
  if(req.method !== "POST") return result(405,"method");
  try {
    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = body?.password;
    if(!/^[a-z0-9][a-z0-9_]{2,31}$/.test(username) || username === "admin" ||
       typeof password !== "string" || password.length < 8 || new TextEncoder().encode(password).length > 72) return result(400,"invalid_signup");
    const peer = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serviceKey + ":" + peer));
    const client_digest = Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,"0")).join("");
    const quota = await fetch(url+"/rest/v1/rpc/itda_allow_signup",{method:"POST",headers:internalHeaders,body:JSON.stringify({client_digest})});
    if(!quota.ok) return result(503,"unavailable");
    if(await quota.json() !== true) return result(429,"rate_limit");
    const inserted = await fetch(url+"/auth/v1/admin/users",{
      method:"POST",headers:internalHeaders,
      body:JSON.stringify({email:username+"@accounts.itda.invalid",password,email_confirm:true,
        user_metadata:{username},app_metadata:{role:"student"}})
    });
    if(inserted.ok) return result(201,"created");
    const error = await inserted.json().catch(()=>({}));
    if(["email_exists","user_already_exists"].includes(error.error_code || error.code)) return result(409,"unavailable_id");
    if(inserted.status === 429) return result(429,"rate_limit");
    if(inserted.status === 422 || inserted.status === 400) return result(400,"invalid_signup");
    return result(503,"unavailable");
  } catch {return result(503,"unavailable");}
});
