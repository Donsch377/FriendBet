const supabaseUrl = 'https://YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let currentGroup = null;
let currentMember = null;
let groupMembers = [];

document.getElementById('create-group-btn').onclick = async () => {
  const name = document.getElementById('create-name').value.trim();
  const groupName = document.getElementById('create-group-name').value.trim();
  const joinCode = document.getElementById('create-join-code').value.trim();
  const startPoints = parseInt(document.getElementById('create-start-points').value, 10) || 0;
  if (!name || !groupName || !joinCode) {
    alert('Please fill out all fields');
    return;
  }
  const { data: group, error } = await supabase
    .from('groups')
    .insert([{ name: groupName, join_code: joinCode, start_points: startPoints }])
    .select()
    .single();
  if (error) {
    alert(error.message);
    return;
  }
  const { data: member, error: mErr } = await supabase
    .from('members')
    .insert([{ group_id: group.id, name, points: startPoints }])
    .select()
    .single();
  if (mErr) {
    alert(mErr.message);
    return;
  }
  currentGroup = group;
  currentMember = member;
  showGroup();
};

document.getElementById('join-group-btn').onclick = async () => {
  const name = document.getElementById('join-name').value.trim();
  const joinCode = document.getElementById('join-code').value.trim();
  if (!name || !joinCode) {
    alert('Please fill out all fields');
    return;
  }
  const { data: group, error } = await supabase
    .from('groups')
    .select('*')
    .eq('join_code', joinCode)
    .single();
  if (error) {
    alert('Group not found');
    return;
  }
  const { data: member, error: mErr } = await supabase
    .from('members')
    .insert([{ group_id: group.id, name, points: group.start_points }])
    .select()
    .single();
  if (mErr) {
    alert(mErr.message);
    return;
  }
  currentGroup = group;
  currentMember = member;
  showGroup();
};

async function showGroup() {
  document.getElementById('setup').classList.add('hidden');
  document.getElementById('group').classList.remove('hidden');
  document.getElementById('group-title').innerText = currentGroup.name;
  await loadMembers();
  await loadBets();
  renderExclusionOptions();
}

async function loadMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('group_id', currentGroup.id);
  if (error) {
    console.error(error);
    return;
  }
  groupMembers = data;
  const membersDiv = document.getElementById('members');
  membersDiv.innerHTML = '';
  data.forEach((m) => {
    const div = document.createElement('div');
    div.textContent = `${m.name}: ${m.points} pts`;
    membersDiv.appendChild(div);
  });
}

async function loadBets() {
  const { data, error } = await supabase
    .from('bets')
    .select('*, bet_exclusions(member_id)')
    .eq('group_id', currentGroup.id);
  if (error) {
    console.error(error);
    return;
  }
  const betsDiv = document.getElementById('bets');
  betsDiv.innerHTML = '';
  data
    .filter((b) => !b.bet_exclusions.some((e) => e.member_id === currentMember.id))
    .forEach((b) => {
      const div = document.createElement('div');
      div.className = 'bet';
      const desc = document.createElement('p');
      desc.textContent = b.description;
      const aBtn = document.createElement('button');
      aBtn.textContent = b.option_a;
      aBtn.onclick = () => placeWager(b.id, 'option_a');
      const bBtn = document.createElement('button');
      bBtn.textContent = b.option_b;
      bBtn.onclick = () => placeWager(b.id, 'option_b');
      div.appendChild(desc);
      div.appendChild(aBtn);
      div.appendChild(bBtn);
      betsDiv.appendChild(div);
    });
}

function renderExclusionOptions() {
  const container = document.getElementById('bet-exclusions');
  container.innerHTML = '<p>Exclude members:</p>';
  groupMembers
    .filter((m) => m.id !== currentMember.id)
    .forEach((m) => {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = m.id;
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(m.name));
      container.appendChild(label);
    });
}

document.getElementById('create-bet-btn').onclick = async () => {
  const description = document.getElementById('bet-desc').value.trim();
  const optionA = document.getElementById('bet-a').value.trim();
  const optionB = document.getElementById('bet-b').value.trim();
  if (!description || !optionA || !optionB) {
    alert('Please fill out all bet fields');
    return;
  }
  const { data: bet, error } = await supabase
    .from('bets')
    .insert([
      {
        group_id: currentGroup.id,
        creator_member_id: currentMember.id,
        description,
        option_a: optionA,
        option_b: optionB,
      },
    ])
    .select()
    .single();
  if (error) {
    alert(error.message);
    return;
  }
  const excludedIds = Array.from(
    document.querySelectorAll('#bet-exclusions input:checked')
  ).map((c) => c.value);
  for (const id of excludedIds) {
    await supabase.from('bet_exclusions').insert([{ bet_id: bet.id, member_id: id }]);
  }
  document.getElementById('bet-desc').value = '';
  document.getElementById('bet-a').value = '';
  document.getElementById('bet-b').value = '';
  await loadBets();
};

async function placeWager(betId, option) {
  const amount = parseInt(prompt('Wager amount?'), 10);
  if (!amount) return;
  await supabase
    .from('wagers')
    .insert([{ bet_id: betId, member_id: currentMember.id, option, amount }]);
  currentMember.points -= amount;
  await supabase
    .from('members')
    .update({ points: currentMember.points })
    .eq('id', currentMember.id);
  await loadMembers();
}
