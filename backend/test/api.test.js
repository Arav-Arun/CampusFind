// API integration tests. They rebuild every table, so they only run against a
// throwaway database passed in TEST_DATABASE_URL (never the one in .env).
//
//   TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5432/campusfind_test npm test
const test = require("node:test");
const assert = require("node:assert/strict");

const url = process.env.TEST_DATABASE_URL || "";
const isThrowaway = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || /test/i.test(url.split("/").pop() || "");
if (!url || !isThrowaway) {
  test("API tests", { skip: "set TEST_DATABASE_URL to a local or *_test database" }, () => {});
  return;
}

// Set before the app loads so dotenv can't fill these in from a real .env file.
Object.assign(process.env, {
  DATABASE_URL: url,
  SECRET_KEY: "test-secret",
  VERCEL: "1", // stops server.js from listening on its own
  OPENAI_API_KEY: "",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
});
console.error = () => {}; // expected failures (bad tokens, missing storage) are logged by the app

const jwt = require("jsonwebtoken");
const { sequelize, User, Item, Claim } = require("../db");
const app = require("../server");

const PASSWORD = "Passw0rd!";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

let server, base;
const call = async (method, path, { token, body, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(base + path, { method, headers, body: form || (body && JSON.stringify(body)) });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const signup = async (email, name = email.split("@")[0]) => {
  await call("POST", "/auth/register", { body: { email, password: PASSWORD, phone: "9990001111", name } });
  const { json } = await call("POST", "/auth/login", { body: { email, password: PASSWORD } });
  return { token: json.token, id: json.user.id };
};
const imageForm = (type, bytes = PNG) => {
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: "image/png" }), "photo.png");
  form.append("type", type);
  return form;
};
const makeItem = (fields) =>
  Item.create({
    type: "lost",
    description: "Blue bottle",
    location: "Library, 2nd floor",
    category: "bottle",
    color: "blue",
    distinctive_features: JSON.stringify(["sticker"]),
    contact_info: "ping me on WhatsApp",
    image_url: "https://example.com/a.jpg",
    ...fields,
  });

let owner, claimant, stranger, lost, found;

test.before(async () => {
  await sequelize.sync({ force: true });
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
  owner = await signup("Owner@Campus.edu", "Owner");
  claimant = await signup("claimant@campus.edu");
  stranger = await signup("stranger@campus.edu");
  lost = await makeItem({ user_id: owner.id });
  found = await makeItem({ user_id: claimant.id, type: "found", description: "Found a blue bottle with sticker", category: "Bottle" });
  for (let i = 0; i < 26; i++) {
    await makeItem({ user_id: stranger.id, description: `Item ${i}`, type: i % 2 ? "found" : "lost", category: i % 3 ? "Keys" : "keys", location: `Cafeteria, block ${i}` });
  }
  await makeItem({ user_id: owner.id, description: "100% cotton hoodie", category: "Clothing" });
});

test.after(async () => {
  server?.close();
  await sequelize.close();
});

test("auth: registration rules and login", async () => {
  assert.equal((await call("POST", "/auth/register", { body: { email: "x@y.com", password: "weak", phone: "1" } })).status, 400);
  assert.equal((await call("POST", "/auth/register", { body: { email: "owner@campus.edu", password: PASSWORD, phone: "1" } })).status, 409, "duplicate email in another case");

  const wrong = await call("POST", "/auth/login", { body: { email: "owner@campus.edu", password: "Nope1234!" } });
  const unknown = await call("POST", "/auth/login", { body: { email: "ghost@campus.edu", password: "Nope1234!" } });
  assert.equal(wrong.status, 401);
  assert.deepEqual(wrong.json, unknown.json, "wrong password and unknown email look identical");

  const ok = await call("POST", "/auth/login", { body: { email: "OWNER@campus.edu", password: PASSWORD } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.user.email, "owner@campus.edu");
});

test("auth: tokens are checked properly", async () => {
  assert.equal((await call("GET", "/auth/me", { token: owner.token })).status, 200);
  assert.equal((await call("GET", "/auth/me")).status, 401);
  const oldDefaultSecret = jwt.sign({ userId: owner.id }, "dev_secret_key_change_me");
  assert.equal((await call("GET", "/auth/me", { token: oldDefaultSecret })).status, 401);
  const unsigned = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(`{"userId":${owner.id}}`).toString("base64url")}.`;
  assert.equal((await call("GET", "/auth/me", { token: unsigned })).status, 401);
  assert.equal((await call("POST", "/auth/google", { body: { token: "garbage" } })).status, 401);
});

test("auth: profile updates are validated", async () => {
  assert.equal((await call("PUT", "/auth/profile", { token: owner.token, body: { profile_photo: "javascript:alert(1)" } })).status, 400);
  const res = await call("PUT", "/auth/profile", { token: owner.token, body: { bio: "x".repeat(5000), phone: "123" } });
  assert.equal(res.status, 200);
  assert.equal(res.json.user.bio.length, 1000);
});

test("items: uploads require sign-in before any processing", async () => {
  assert.equal((await call("POST", "/items", { form: imageForm("found") })).status, 401);
  assert.equal((await call("POST", "/items", { token: owner.token, form: imageForm("found", Buffer.from("not an image")) })).status, 400);
  assert.equal((await call("POST", "/items", { token: owner.token, form: imageForm("banana") })).status, 400);
  const noStorage = await call("POST", "/items", { token: owner.token, form: imageForm("found") });
  assert.equal(noStorage.status, 502, "valid photo but no image storage configured");
  assert.equal((await call("POST", `/items/${lost.id}/analyze`, { token: owner.token })).status, 404, "removed endpoint");
});

test("items: feed pagination and search", async () => {
  const page1 = await call("GET", "/items?limit=10");
  assert.equal(page1.json.items.length, 10);
  assert.equal(page1.json.has_more, true);
  const page2 = await call("GET", "/items?limit=10&offset=10");
  assert.notEqual(page2.json.items[0].id, page1.json.items[0].id);
  assert.ok((await call("GET", "/items?limit=9999")).json.items.length <= 60);

  const percent = await call("GET", `/items?q=${encodeURIComponent("%")}`);
  assert.deepEqual(percent.json.items.map((i) => i.description), ["100% cotton hoodie"], "LIKE wildcards are literal");
  assert.equal((await call("GET", "/items?q[]=a&type[]=lost")).status, 200);
  assert.equal((await call("GET", `/items?q=${encodeURIComponent("'; DROP TABLE item;--")}`)).json.items.length, 0);
  assert.ok(page1.json.items.every((i) => i.claim_state === "available"));
});

test("items: stats and matches", async () => {
  const stats = (await call("GET", "/items/stats")).json;
  assert.equal(stats.total, 29);
  assert.equal(stats.open, 29);
  assert.equal(stats.categories.filter((c) => c.name.toLowerCase() === "keys").length, 1, "category case merged");
  assert.ok(stats.locations.length <= 5);
  const matches = (await call("GET", `/items/match/${lost.id}`)).json;
  assert.ok(matches.some((m) => m.id === found.id));
});

test("items: reporter contact details stay private", async () => {
  const anon = (await call("GET", `/items/${lost.id}`)).json.reporter;
  assert.equal(anon.name, "Owner");
  assert.ok(!("email" in anon) && !("phone" in anon) && !("contact_info" in anon));
  assert.ok(!("phone" in (await call("GET", `/items/${lost.id}`, { token: stranger.token })).json.reporter));
  assert.equal((await call("GET", `/items/${lost.id}`, { token: "bogus" })).status, 200, "bad token on a public route is anonymous");
  assert.equal((await call("GET", `/items/${lost.id}`, { token: owner.token })).json.reporter.contact_info, "ping me on WhatsApp");
  assert.equal((await call("GET", "/items/abc")).status, 404);
  assert.equal((await call("GET", "/items/99999999")).status, 404);
});

test("claims: full handoff", async () => {
  assert.equal((await call("POST", "/claims", { token: owner.token, body: { item_id: lost.id } })).status, 400, "own item");
  assert.equal((await call("POST", "/claims", { body: { item_id: lost.id } })).status, 401);
  const created = await call("POST", "/claims", { token: claimant.token, body: { item_id: lost.id, message: "I found it!" } });
  assert.equal(created.status, 201);
  const claimId = created.json.claim_id;
  assert.equal((await call("POST", "/claims", { token: claimant.token, body: { item_id: lost.id } })).status, 400, "duplicate");
  const second = await call("POST", "/claims", { token: stranger.token, body: { item_id: lost.id, message: "mine?" } });
  assert.equal(second.status, 201);

  const list = (await call("GET", `/claims/item/${lost.id}`, { token: owner.token })).json;
  assert.ok(list.every((c) => !("email" in c.claimant) && !("phone" in c.claimant)));

  const meeting = { action: "accept", meeting_location: "Library desk", meeting_time: new Date(Date.now() + 3600e3).toISOString() };
  assert.equal((await call("POST", `/claims/${claimId}/respond`, { token: stranger.token, body: meeting })).status, 403);
  assert.equal((await call("POST", `/claims/${claimId}/respond`, { token: owner.token, body: { ...meeting, meeting_time: "soon" } })).status, 400);
  const accepted = await call("POST", `/claims/${claimId}/respond`, { token: owner.token, body: meeting });
  assert.equal(accepted.status, 200);
  assert.ok(!("qr_token" in accepted.json), "the reporter never receives the code");
  assert.equal((await call("POST", `/claims/${claimId}/respond`, { token: owner.token, body: { action: "reject" } })).status, 409);
  assert.equal((await call("POST", `/claims/${second.json.claim_id}/respond`, { token: owner.token, body: meeting })).status, 409, "one handoff at a time");

  assert.equal((await call("GET", `/items/${lost.id}`)).json.claim_state, "in_progress");
  assert.ok(!("qr_code" in (await call("GET", `/claims/item/${lost.id}`, { token: owner.token })).json[0]));
  const code = (await call("GET", `/claims/item/${lost.id}`, { token: claimant.token })).json[0].qr_code;
  assert.match(code, /^\d{6}$/);
  assert.equal((await call("GET", `/items/${lost.id}`, { token: claimant.token })).json.reporter.phone, "123", "accepted claimant sees contact");

  assert.equal((await call("POST", "/claims/verify", { token: claimant.token, body: { token: code } })).status, 400);
  assert.equal((await call("POST", "/claims/verify", { token: stranger.token, body: { token: code } })).status, 400);

  await Claim.update({ meeting_time: new Date(Date.now() - 30 * 86400e3) }, { where: { id: claimId } });
  assert.equal((await call("POST", "/claims/verify", { token: owner.token, body: { token: code } })).status, 400, "expired");
  await Claim.update({ meeting_time: new Date(Date.now() + 3600e3) }, { where: { id: claimId } });

  const verified = await call("POST", "/claims/verify", { token: owner.token, body: { token: code } });
  assert.equal(verified.status, 200);
  assert.equal((await User.findByPk(claimant.id)).trust_score, 10, "finder of a lost item gets the points");
  assert.equal((await call("POST", "/claims/verify", { token: owner.token, body: { token: code } })).status, 400, "no replay");
  assert.equal((await User.findByPk(claimant.id)).trust_score, 10);

  assert.equal((await call("GET", `/items/${lost.id}`)).json.claim_state, "claimed");
  assert.ok(!(await call("GET", "/items?limit=60")).json.items.some((i) => i.id === lost.id), "recovered items leave the feed");
  assert.equal((await call("POST", "/claims", { token: (await signup("late@campus.edu")).token, body: { item_id: lost.id } })).status, 409);
  const stats = (await call("GET", "/items/stats")).json;
  assert.equal(stats.recovered, 1);

  const notes = (await call("GET", "/claims/notifications", { token: claimant.token })).json;
  assert.ok(notes.some((n) => n.id === `claim_${claimId}_completed`));
  assert.equal((await call("POST", "/claims/notifications/read", { token: claimant.token, body: { id: "<script>" } })).status, 400);
});

test("claims: legacy completed claim still locks the item", async () => {
  const legacy = await makeItem({ user_id: owner.id, description: "Legacy umbrella" });
  await Claim.create({ item_id: legacy.id, claimant_id: stranger.id, status: "completed" });
  assert.equal((await call("GET", `/items/${legacy.id}`)).json.claim_state, "claimed");
  assert.ok(!(await call("GET", "/items?q=umbrella")).json.items.length, "hidden from the feed");
  assert.equal((await call("POST", "/claims", { token: claimant.token, body: { item_id: legacy.id } })).status, 409);
});

test("claims: handoff codes can't be brute-forced", async () => {
  const guesser = await signup("guesser@campus.edu");
  let last;
  for (let i = 0; i < 12; i++) last = await call("POST", "/claims/verify", { token: guesser.token, body: { token: String(100000 + i) } });
  assert.equal(last.status, 429);
});

test("errors are JSON and never leak internals", async () => {
  const missing = await call("GET", "/nope");
  assert.deepEqual([missing.status, missing.json], [404, { error: "Not found" }]);
  const res = await fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "Invalid request body" });
});
