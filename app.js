import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

if (SUPABASE_URL.includes("YOUR_SUPABASE_URL")) {
  alert(
    "Replace SUPABASE_URL and SUPABASE_ANON_KEY with your Supabase credentials.",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentGroup = null;
let currentMember = null;

document
  .getElementById("create-group-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.groupName.value.trim();
    const startPoints = parseInt(form.startPoints.value, 10) || 100;
    const memberName = form.memberName.value.trim();
    const { data: group, error } = await supabase
      .from("groups")
      .insert({ name, start_points: startPoints })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    currentGroup = group;
    const { data: member, error: memberError } = await supabase
      .from("members")
      .insert({ group_id: group.id, name: memberName, points: startPoints })
      .select()
      .single();
    if (memberError) {
      alert(memberError.message);
      return;
    }
    currentMember = member;
    document.getElementById("group-code-display").textContent =
      `Share this join code: ${group.join_code}`;
    form.reset();
  });

document
  .getElementById("join-group-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const joinCode = form.joinCode.value.trim().toUpperCase();
    const memberName = form.memberName.value.trim();
    const { data: group, error } = await supabase
      .from("groups")
      .select()
      .eq("join_code", joinCode)
      .single();
    if (error) {
      alert("Group not found");
      return;
    }
    currentGroup = group;
    const { data: member, error: memberError } = await supabase
      .from("members")
      .insert({
        group_id: group.id,
        name: memberName,
        points: group.start_points,
      })
      .select()
      .single();
    if (memberError) {
      alert(memberError.message);
      return;
    }
    currentMember = member;
    form.reset();
  });

document
  .getElementById("create-bet-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentGroup || !currentMember) {
      alert("Join a group first");
      return;
    }
    const form = e.target;
    const description = form.description.value.trim();
    const optionA = form.optionA.value.trim();
    const optionB = form.optionB.value.trim();
    const exclusionsRaw = form.exclusions.value.trim();
    const { data: bet, error } = await supabase
      .from("bets")
      .insert({
        group_id: currentGroup.id,
        creator_member_id: currentMember.id,
        description,
        option_a: optionA,
        option_b: optionB,
      })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    if (exclusionsRaw) {
      const names = exclusionsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length) {
        const { data: members } = await supabase
          .from("members")
          .select("id")
          .eq("group_id", currentGroup.id)
          .in("name", names);
        for (const m of members || []) {
          await supabase
            .from("bet_exclusions")
            .insert({ bet_id: bet.id, member_id: m.id });
        }
      }
    }
    form.reset();
  });
