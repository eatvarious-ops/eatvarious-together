// Run the deployed handler against stub Auth and database responses.
import assert from "node:assert/strict";

let handler;
globalThis.Deno = {
  env: { get: name => name === "SUPABASE_URL" ? "https://accounts.example" : "test-only" },
  serve: callback => { handler = callback; }
};
await import("../supabase/functions/itda-student-signup/index.ts");
const registered = new Set();
let allowed = true;
globalThis.fetch = async (url, options) => {
  const body = JSON.parse(options.body);
  if (new URL(url).pathname === "/rest/v1/rpc/itda_allow_signup") {
    assert.match(body.client_digest, /^[a-f0-9]{64}$/);
    return Response.json(allowed);
  }
  assert.equal(new URL(url).pathname, "/auth/v1/admin/users");
  assert.equal(body.app_metadata.role, "student");
  assert.equal(body.email, "campus_food@accounts.itda.invalid");
  if (registered.has(body.email)) return Response.json({code:"email_exists"}, {status:422});
  registered.add(body.email);
  return Response.json({}, {status:201});
};
function signup(username) {
  return handler(new Request("https://accounts.example/signup", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username,password:"fixture-student",role:"admin"})
  }));
}
assert.equal((await signup("ADMIN")).status,400);
assert.equal((await signup("ab")).status,400);
assert.equal((await signup(" Campus_Food ")).status,201);
assert.equal((await signup("campus_food")).status,409);
allowed=false;
assert.equal((await signup("campus_food")).status,429);
console.log("PASS student-only signup, normalized duplicates, reserved name and signup limit");
