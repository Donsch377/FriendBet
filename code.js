const supabaseUrl = 'https://YOUR_PROJECT.supabase.co';
const supabaseKey = 'YOUR_PUBLIC_ANON_KEY';
const client = supabase.createClient(supabaseUrl, supabaseKey);

let currentGroup = null;
let currentMember = null;

async function createGroup() {
  const hostName = document.getElementById('host-name').value.trim();
  const groupName = document.getElementById('group-name').value.trim();
  if (!hostName || !groupName) return;
  const code = Math.random().toString(36).substring(2, 8);
  const { data: group, error } = await client
    .from('groups')
    .insert({ name: groupName, host_name: hostName, join_code: code })
    .select()
    .single();
  if (error) {
    console.error(error);
    return;
  }
  const { data: member } = await client
    .from('members')
    .insert({ group_id: group.id, name: hostName })
    .select()
    .single();
  currentGroup = group;
  currentMember = member;
  localStorage.setItem('groupId', group.id);
  localStorage.setItem('memberId', member.id);
  document.getElementById('create-group-result').textContent = `Group code: ${code}`;
  showApp();
}

async function joinGroup() {
  const name = document.getElementById('join-name').value.trim();
  const code = document.getElementById('join-code').value.trim();
  if (!name || !code) return;
  const { data: group, error } = await client
    .from('groups')
    .select()
    .eq('join_code', code)
    .single();
  if (error || !group) {
    alert('Group not found');
    return;
  }
  const { data: member } = await client
    .from('members')
    .insert({ group_id: group.id, name })
    .select()
    .single();
  currentGroup = group;
  currentMember = member;
  localStorage.setItem('groupId', group.id);
  localStorage.setItem('memberId', member.id);
  showApp();
}

function showApp() {
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('group-title').textContent = `${currentGroup.name} (code: ${currentGroup.join_code})`;
  loadMembers();
  loadBets();
}

async function loadMembers() {
  const { data } = await client
    .from('members')
    .select()
    .eq('group_id', currentGroup.id);
  const list = document.getElementById('block-members');
  const membersDiv = document.getElementById('members');
  list.innerHTML = '';
  membersDiv.innerHTML = `<h3>Members</h3><ul>${data
    .map((m) => `<li>${m.name} (${m.points} pts)</li>`)
    .join('')}</ul>`;
  data.forEach((m) => {
    if (m.id === currentMember.id) return;
    const option = document.createElement('option');
    option.value = m.id;
    option.textContent = m.name;
    list.appendChild(option);
  });
}

async function loadBets() {
  const { data: blocked } = await client
    .from('bet_blocks')
    .select('bet_id')
    .eq('member_id', currentMember.id);
  const blockedIds = blocked.map((b) => b.bet_id);
  const { data: bets } = await client
    .from('bets')
    .select()
    .eq('group_id', currentGroup.id);
  const visible = bets.filter((b) => !blockedIds.includes(b.id));
  const list = document.getElementById('bet-list');
  list.innerHTML = '';
  visible.forEach((b) => {
    const li = document.createElement('li');
    li.textContent = `${b.description} - by ${b.creator_name}`;
    list.appendChild(li);
  });
}

async function createBet() {
  const desc = document.getElementById('bet-desc').value.trim();
  const select = document.getElementById('block-members');
  if (!desc) return;
  const { data: bet } = await client
    .from('bets')
    .insert({
      group_id: currentGroup.id,
      creator_id: currentMember.id,
      creator_name: currentMember.name,
      description: desc,
    })
    .select()
    .single();
  const blocks = Array.from(select.selectedOptions).map((opt) => ({
    bet_id: bet.id,
    member_id: opt.value,
  }));
  if (blocks.length) {
    await client.from('bet_blocks').insert(blocks);
  }
  document.getElementById('bet-desc').value = '';
  select.selectedIndex = -1;
  loadBets();
}

// Event listeners

document
  .getElementById('create-group-btn')
  .addEventListener('click', createGroup);
document
  .getElementById('join-group-btn')
  .addEventListener('click', joinGroup);
document
  .getElementById('create-bet-btn')
  .addEventListener('click', createBet);

// Resume session if stored
(function init() {
  const groupId = localStorage.getItem('groupId');
  const memberId = localStorage.getItem('memberId');
  if (groupId && memberId) {
    Promise.all([
      client.from('groups').select().eq('id', groupId).single(),
      client.from('members').select().eq('id', memberId).single(),
    ]).then(([g, m]) => {
      if (g.data && m.data) {
        currentGroup = g.data;
        currentMember = m.data;
        showApp();
      }
    });
  }
})();
