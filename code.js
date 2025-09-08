// Replace with your Supabase project credentials
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createGroup() {
  const hostName = document.getElementById('host-name').value.trim();
  const groupName = document.getElementById('group-name').value.trim();
  if (!hostName || !groupName) {
    alert('Enter a name and group');
    return;
  }
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data: group, error } = await db.from('groups').insert({ name: groupName, code, host_name: hostName }).select().single();
  if (error) {
    alert(error.message);
    return;
  }
  const { data: user, error: userError } = await db.from('users').insert({ group_id: group.id, name: hostName }).select().single();
  if (userError) {
    alert(userError.message);
    return;
  }
  localStorage.setItem('group', JSON.stringify(group));
  localStorage.setItem('user', JSON.stringify(user));
  init();
  alert(`Group created! Share this code: ${code}`);
}

async function joinGroup() {
  const joinName = document.getElementById('join-name').value.trim();
  const joinCode = document.getElementById('join-code').value.trim().toUpperCase();
  if (!joinName || !joinCode) {
    alert('Enter a name and code');
    return;
  }
  const { data: group, error } = await db.from('groups').select().eq('code', joinCode).single();
  if (error || !group) {
    alert('Group not found');
    return;
  }
  const { data: user, error: userError } = await db.from('users').insert({ group_id: group.id, name: joinName }).select().single();
  if (userError) {
    alert(userError.message);
    return;
  }
  localStorage.setItem('group', JSON.stringify(group));
  localStorage.setItem('user', JSON.stringify(user));
  init();
}

async function init() {
  const group = JSON.parse(localStorage.getItem('group'));
  const user = JSON.parse(localStorage.getItem('user'));
  if (!group || !user) return;
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('group-header').textContent = `${group.name} (code: ${group.code})`;
  const { data: freshUser } = await db.from('users').select().eq('id', user.id).single();
  localStorage.setItem('user', JSON.stringify(freshUser));
  document.getElementById('points').textContent = freshUser.points;
  loadBets();
}

async function loadBets() {
  const group = JSON.parse(localStorage.getItem('group'));
  const user = JSON.parse(localStorage.getItem('user'));
  const { data: bets } = await db.from('bets').select('*').eq('group_id', group.id).order('created_at', { ascending: false });
  const list = document.getElementById('bets-list');
  list.innerHTML = '';
  bets.filter(b => !(b.hidden_from && b.hidden_from.includes(user.id))).forEach(bet => {
    const li = document.createElement('li');
    li.innerHTML = `
      <p>${bet.question}</p>
      <form data-bet="${bet.id}">
        <label><input type="radio" name="choice-${bet.id}" value="yes" checked>Yes</label>
        <label><input type="radio" name="choice-${bet.id}" value="no">No</label>
        <input type="number" min="1" placeholder="Points" required />
        <button>Bet</button>
      </form>
    `;
    list.appendChild(li);
    const form = li.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseInt(form.querySelector('input[type="number"]').value, 10);
      if (!amount) return;
      const choice = form.querySelector(`input[name="choice-${bet.id}"]:checked`).value;
      await placeBet(bet.id, choice, amount);
      form.reset();
    });
  });
}

async function createBet() {
  const group = JSON.parse(localStorage.getItem('group'));
  const user = JSON.parse(localStorage.getItem('user'));
  const question = document.getElementById('bet-question').value.trim();
  const exclude = document.getElementById('bet-exclude').value.trim();
  if (!question) {
    alert('Enter a question');
    return;
  }
  const hidden_from = exclude ? exclude.split(',').map(s => s.trim()).filter(Boolean) : [];
  const { error } = await db.from('bets').insert({
    group_id: group.id,
    creator_id: user.id,
    question,
    hidden_from
  });
  if (error) {
    alert(error.message);
    return;
  }
  document.getElementById('bet-question').value = '';
  document.getElementById('bet-exclude').value = '';
  loadBets();
}

async function placeBet(betId, choice, amount) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user.points < amount) {
    alert('Not enough points');
    return;
  }
  const { error } = await db.from('wagers').insert({ bet_id: betId, user_id: user.id, choice, amount });
  if (error) {
    alert(error.message);
    return;
  }
  await db.from('users').update({ points: user.points - amount }).eq('id', user.id);
  user.points -= amount;
  localStorage.setItem('user', JSON.stringify(user));
  document.getElementById('points').textContent = user.points;
}

// Event listeners
if (document.getElementById('create-group')) {
  document.getElementById('create-group').addEventListener('click', createGroup);
}
if (document.getElementById('join-group')) {
  document.getElementById('join-group').addEventListener('click', joinGroup);
}
if (document.getElementById('create-bet')) {
  document.getElementById('create-bet').addEventListener('click', createBet);
}

// Auto-init if stored
init();
