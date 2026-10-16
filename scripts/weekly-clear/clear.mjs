import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const listId = process.env.LIST_ID || "default";
const checklistRef = db.collection("checklists").doc(listId);

const snap = await checklistRef.get();
if (!snap.exists) {
  console.log(`No checklist found for list "${listId}" — nothing to clear.`);
  process.exit(0);
}

const data = snap.data();
const state = data.state || {};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(path.join(repoRoot, "index.html"), "utf8");
const ids = [...html.matchAll(/data-id="([^"]+)"/g)].map(m => m[1]);

const totalTasks = ids.length;
const completedTasks = ids.filter(id => state[id] === true).length;
const completedPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
const weekEnding = new Date().toISOString().split("T")[0];

await db.collection("reports").doc(weekEnding).set({
  weekEnding,
  savedAt: FieldValue.serverTimestamp(),
  state,
  totalTasks,
  completedTasks,
  completedPercent
});

const updates = {};
for (const id of ids) updates[`state.${id}`] = false;
await checklistRef.update({ ...updates, updatedAt: FieldValue.serverTimestamp() });

console.log(`Cleared checklist "${listId}". Saved report ${weekEnding}: ${completedTasks}/${totalTasks} (${completedPercent}%).`);
