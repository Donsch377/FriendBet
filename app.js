import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

if (SUPABASE_URL.includes("YOUR_SUPABASE_URL")) {
  alert(
    "Replace SUPABASE_URL and SUPABASE_ANON_KEY with your Supabase credentials.",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const createGroupForm = document.getElementById("create-group-form");
const joinGroupForm = document.getElementById("join-group-form");
const createBetForm = document.getElementById("create-bet-form");

if (createGroupForm) {
  createGroupForm.addEventListener("submit", async (e) => {
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
    const { data: member, error: memberError } = await supabase
      .from("members")
      .insert({
        group_id: group.id,
        name: memberName,
        points: startPoints,
        is_admin: true,
      })
      .select()
      .single();
    if (memberError) {
      alert(memberError.message);
      return;
    }
    localStorage.setItem("groupId", group.id);
    localStorage.setItem("memberId", member.id);
    localStorage.setItem("isAdmin", "true");
    window.location.href = "group.html";
  });
}

if (joinGroupForm) {
  joinGroupForm.addEventListener("submit", async (e) => {
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
    localStorage.setItem("groupId", group.id);
    localStorage.setItem("memberId", member.id);
    localStorage.setItem("isAdmin", "false");
    window.location.href = "group.html";
  });
}

async function loadGroupPage() {
  const groupId = localStorage.getItem("groupId");
  const memberId = localStorage.getItem("memberId");
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  if (!groupId || !memberId) {
    window.location.href = "index.html";
    return;
  }
  const { data: group, error } = await supabase
    .from("groups")
    .select()
    .eq("id", groupId)
    .single();
  if (error) {
    alert(error.message);
    return;
  }
  document.getElementById("group-name").textContent = group.name;
  document.getElementById("group-code").textContent = group.join_code;
  if (isAdmin) {
    document
      .querySelectorAll(".admin-only")
      .forEach((el) => el.classList.remove("hidden"));
    document.getElementById("group-name-input").value = group.name;
  }
  await refreshMembers();
}

async function refreshMembers() {
  const groupId = localStorage.getItem("groupId");
  const memberId = localStorage.getItem("memberId");
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const { data: members } = await supabase
    .from("members")
    .select()
    .eq("group_id", groupId);
  const list = document.getElementById("member-list");
  list.innerHTML = "";
  for (const m of members || []) {
    const li = document.createElement("li");
    li.textContent = `${m.name} (${m.points})`;
    if (isAdmin && m.id !== memberId) {
      const btn = document.createElement("button");
      btn.textContent = "Kick";
      btn.addEventListener("click", () => kickMember(m.id));
      li.appendChild(btn);
    }
    list.appendChild(li);
  }
}

async function kickMember(id) {
  await supabase.from("members").delete().eq("id", id);
  refreshMembers();
}

const deleteGroupBtn = document.getElementById("delete-group");
if (deleteGroupBtn) {
  deleteGroupBtn.addEventListener("click", async () => {
    const groupId = localStorage.getItem("groupId");
    if (confirm("Delete group?")) {
      await supabase.from("groups").delete().eq("id", groupId);
      localStorage.clear();
      window.location.href = "index.html";
    }
  });
}

const updateGroupForm = document.getElementById("update-group-form");
if (updateGroupForm) {
  updateGroupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const groupId = localStorage.getItem("groupId");
    const name = document.getElementById("group-name-input").value.trim();
    const { error } = await supabase
      .from("groups")
      .update({ name })
      .eq("id", groupId);
    if (error) {
      alert(error.message);
      return;
    }
    document.getElementById("group-name").textContent = name;
  });
}

if (createBetForm) {
  createBetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const groupId = localStorage.getItem("groupId");
    const memberId = localStorage.getItem("memberId");
    if (!groupId || !memberId) {
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
        group_id: groupId,
        creator_member_id: memberId,
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
          .eq("group_id", groupId)
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
}

if (document.getElementById("group-info")) {
  loadGroupPage();
}
