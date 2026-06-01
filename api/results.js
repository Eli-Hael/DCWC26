const { Octokit } = require("@octokit/rest");

const OWNER = process.env.GITHUB_OWNER;
const REPO  = process.env.GITHUB_REPO;
const FILE  = "data.json";
const TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "emea2026";

async function readFile() {
  const octokit = new Octokit({ auth: TOKEN });
  try {
    const { data } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: FILE });
    const content = Buffer.from(data.content, "base64").toString("utf8");
    return { data: JSON.parse(content), sha: data.sha };
  } catch {
    return { data: { results: [], schedules: [], customRules: null }, sha: null };
  }
}

async function writeFile(content, sha) {
  const octokit = new Octokit({ auth: TOKEN });
  const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString("base64");
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER, repo: REPO, path: FILE,
    message: "Update data",
    content: encoded,
    ...(sha ? { sha } : {}),
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const { data } = await readFile();
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    if (req.headers.authorization !== `Bearer ${ADMIN_PASSWORD}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { data: current, sha } = await readFile();
    const body = req.body;
    if (body.results   !== undefined) current.results    = body.results;
    if (body.schedules !== undefined) current.schedules  = body.schedules;
    if (body.customRules !== undefined) current.customRules = body.customRules;
    await writeFile(current, sha);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
