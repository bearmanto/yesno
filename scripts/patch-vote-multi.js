const fs = require('fs');
const path = 'app/surveys/[id]/page.tsx';
let src = fs.readFileSync(path, 'utf8');

// New voteMulti body (keeps both qid & opt_id in RPC call)
const block = `
  async function voteMulti(questionId: string, optionId: string) {
    if (!survey?.id) return;
    if (!optionId) { push("Internal: missing option id", "error"); return; }
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { push("Please sign in to vote.", "error"); return; }

      const args: { qid: string; opt_id: string } = { qid: questionId, opt_id: optionId };
      console.debug("RPC set_multi_choice_vote args:", args);

      const { data, error } = await supabase.rpc("set_multi_choice_vote", args);
      if (error) { push(error.message || "Vote failed", "error"); return; }

      const updated = (data as QOption[] | null) ?? [];
      const sorted = updated.slice().sort((a,b)=>a.position-b.position);
      setOptionsByQ(prev => ({ ...prev, [questionId]: sorted }));
      push("Vote recorded", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Vote failed", "error");
    }
  }
`;

// Replace the existing voteMulti(...) { ... } function
const replaced = src.replace(
  /async function voteMulti\([\s\S]*?\n\}\n/,
  block + '\n'
);

if (replaced === src) {
  console.error('Did not find voteMulti(...) to replace. Aborting without changes.');
  process.exit(1);
}
fs.writeFileSync(path, replaced, 'utf8');
console.log('voteMulti patched');
