// Global State (Multiple Groups)
let groups = [];
let currentGroupId = null;

// Group-specific state
let members = [];
let expenses = [];
let groupName = "";

// DOM Elements
const groupsView = document.getElementById('groups-view');
const groupDetailView = document.getElementById('group-detail-view');
const groupsListDiv = document.getElementById('groups-list');
const addGroupForm = document.getElementById('add-group-form');
const groupNameInput = document.getElementById('group-name-input');
const backBtn = document.getElementById('back-btn');

// Existing DOM Elements
const groupTitleInput = document.getElementById('group-title');
const membersListDiv = document.getElementById('members-list');
const addMemberForm = document.getElementById('add-member-form');
const memberNameInput = document.getElementById('member-name');
const expensePayerSelect = document.getElementById('expense-payer');
const splitMembersListDiv = document.getElementById('split-members-list');
const addExpenseForm = document.getElementById('add-expense-form');
const balancesListDiv = document.getElementById('balances-list');
const historyListDiv = document.getElementById('history-list');

// Initialize
function init() {
    performMigration();
    loadGlobalData();
    
    // View Handlers
    addGroupForm.addEventListener('submit', handleAddGroup);
    backBtn.addEventListener('click', showGroupsView);

    // Group Detail Handlers
    groupTitleInput.addEventListener('change', (e) => {
        groupName = e.target.value;
        updateGroupNameInGlobalList(currentGroupId, groupName);
        saveGroupData();
    });

    addMemberForm.addEventListener('submit', handleAddMember);
    addExpenseForm.addEventListener('submit', handleAddExpense);

    showGroupsView();
}

// Migration (Legacy Data -> Groups Architecture)
function performMigration() {
    const legacyMembers = localStorage.getItem('et_members');
    const legacyExpenses = localStorage.getItem('et_expenses');
    const legacyGroup = localStorage.getItem('et_group');
    
    if (legacyMembers || legacyExpenses) {
        // Create a default group with legacy data
        const oldId = 'group_' + Date.now();
        const oldGroups = [{
            id: oldId,
            name: legacyGroup || "Migrated Group"
        }];
        
        localStorage.setItem('et_groups', JSON.stringify(oldGroups));
        localStorage.setItem(`et_members_${oldId}`, legacyMembers || '[]');
        localStorage.setItem(`et_expenses_${oldId}`, legacyExpenses || '[]');
        
        // Clean up old loose keys to avoid migrating twice
        localStorage.removeItem('et_members');
        localStorage.removeItem('et_expenses');
        localStorage.removeItem('et_group');
        console.log("Migration complete.");
    }
}

// Global Storage Handlers
function loadGlobalData() {
    const savedGroups = localStorage.getItem('et_groups');
    if (savedGroups) groups = JSON.parse(savedGroups);
}

function saveGlobalData() {
    localStorage.setItem('et_groups', JSON.stringify(groups));
}

// Group Storage Handlers
function loadGroupData(groupId) {
    const savedMembers = localStorage.getItem(`et_members_${groupId}`);
    const savedExpenses = localStorage.getItem(`et_expenses_${groupId}`);
    
    members = savedMembers ? JSON.parse(savedMembers) : [];
    expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
    
    const targetGroup = groups.find(g => g.id === groupId);
    groupName = targetGroup ? targetGroup.name : "";
    
    groupTitleInput.value = groupName;
}

function saveGroupData() {
    if (!currentGroupId) return;
    localStorage.setItem(`et_members_${currentGroupId}`, JSON.stringify(members));
    localStorage.setItem(`et_expenses_${currentGroupId}`, JSON.stringify(expenses));
}

function updateGroupNameInGlobalList(id, newName) {
    const g = groups.find(g => g.id === id);
    if (g) {
        g.name = newName;
        saveGlobalData();
    }
}

// View Switches
function showGroupsView() {
    currentGroupId = null;
    groupDetailView.style.display = 'none';
    groupsView.style.display = 'flex';
    renderGroupsView();
}

function showGroupDetailView(groupId) {
    currentGroupId = groupId;
    loadGroupData(groupId);
    groupsView.style.display = 'none';
    groupDetailView.style.display = 'flex';
    renderGroupDetailView();
}

// Groups View Logic
function handleAddGroup(e) {
    e.preventDefault();
    const name = groupNameInput.value.trim();
    if (name) {
        const newGroup = {
            id: 'group_' + Date.now(),
            name: name
        };
        groups.push(newGroup);
        groupNameInput.value = '';
        saveGlobalData();
        renderGroupsView();
    }
}

function handleDeleteGroup(groupId, event) {
    event.stopPropagation(); // don't open the group when clicking delete
    if(confirm("Are you sure you want to delete this group? All expenses and members inside it will be lost.")) {
        groups = groups.filter(g => g.id !== groupId);
        localStorage.removeItem(`et_members_${groupId}`);
        localStorage.removeItem(`et_expenses_${groupId}`);
        saveGlobalData();
        renderGroupsView();
    }
}

function renderGroupsView() {
    groupsListDiv.innerHTML = '';
    if (groups.length === 0) {
        groupsListDiv.innerHTML = '<div class="empty-state">No groups yet. Create one!</div>';
        return;
    }

    groups.forEach(group => {
        // Quick lookups for members/expenses
        const expData = localStorage.getItem(`et_expenses_${group.id}`);
        const memData = localStorage.getItem(`et_members_${group.id}`);
        const parsedExp = expData ? JSON.parse(expData) : [];
        const parsedMem = memData ? JSON.parse(memData) : [];
        
        let totalExp = parsedExp.reduce((sum, e) => sum + e.amount, 0);

        const card = document.createElement('div');
        card.className = 'group-card';
        card.onclick = () => showGroupDetailView(group.id);
        
        card.innerHTML = `
            <div>
                <div class="group-card-title">${group.name}</div>
                <div class="group-card-meta">${parsedMem.length} members • $${totalExp.toFixed(2)} total</div>
            </div>
            <button class="btn btn-danger-outline" onclick="handleDeleteGroup('${group.id}', event)">Delete</button>
        `;
        groupsListDiv.appendChild(card);
    });
}

// Group Detail Logic
function handleAddMember(e) {
    e.preventDefault();
    const name = memberNameInput.value.trim();
    
    if (name && !members.includes(name)) {
        members.push(name);
        memberNameInput.value = '';
        saveGroupData();
        renderGroupDetailView();
    } else if (members.includes(name)) {
        alert("Member already exists!");
    }
}

function handleRemoveMember(name) {
    const involved = expenses.some(exp => exp.payer === name || exp.splits.includes(name));
    if (involved) {
        alert("Cannot remove member because they are involved in existing expenses.");
        return;
    }
    
    members = members.filter(m => m !== name);
    saveGroupData();
    renderGroupDetailView();
}

function handleAddExpense(e) {
    e.preventDefault();
    
    const title = document.getElementById('expense-title').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const payer = document.getElementById('expense-payer').value;
    
    const splitCheckboxes = document.querySelectorAll('.split-checkbox:checked');
    const splits = Array.from(splitCheckboxes).map(cb => cb.value);
    
    if (splits.length === 0) {
        alert("Please select at least one member to split the cost with.");
        return;
    }
    
    const expense = {
        id: Date.now().toString(),
        title,
        amount,
        payer,
        splits,
        date: new Date().toLocaleDateString()
    };
    
    expenses.unshift(expense); 
    
    document.getElementById('expense-title').value = '';
    document.getElementById('expense-amount').value = '';
    
    saveGroupData();
    renderGroupDetailView();
}

function renderGroupDetailView() {
    renderMembers();
    renderExpenseFormMembers();
    renderHistory();
    renderBalances();
}

function renderMembers() {
    membersListDiv.innerHTML = '';
    if (members.length === 0) {
        membersListDiv.innerHTML = '<span class="empty-state" style="padding:0">No members added yet.</span>';
        return;
    }
    
    members.forEach(member => {
        const badge = document.createElement('div');
        badge.className = 'member-badge';
        badge.innerHTML = `
            ${member}
            <span class="remove-member" onclick="handleRemoveMember('${member}')">&times;</span>
        `;
        membersListDiv.appendChild(badge);
    });
}

function renderExpenseFormMembers() {
    expensePayerSelect.innerHTML = '<option value="" disabled selected>Select member</option>';
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        expensePayerSelect.appendChild(option);
    });

    splitMembersListDiv.innerHTML = '';
    if (members.length === 0) {
        splitMembersListDiv.innerHTML = '<div class="empty-state" style="padding: 0;">Add members first</div>';
        return;
    }
    
    members.forEach(member => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'split-checkbox';
        checkbox.value = member;
        checkbox.checked = true; 
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(member));
        splitMembersListDiv.appendChild(label);
    });
}

function renderHistory() {
    historyListDiv.innerHTML = '';
    if (expenses.length === 0) {
        historyListDiv.innerHTML = '<div class="empty-state">No expenses added yet.</div>';
        return;
    }
    
    expenses.forEach(exp => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const splitText = exp.splits.length === members.length && members.length > 0 ? 'everyone' : exp.splits.join(', ');
        
        item.innerHTML = `
            <div class="history-details">
                <span class="history-title">${exp.title}</span>
                <span class="history-meta">${exp.payer} paid • Split by: ${splitText}</span>
            </div>
            <div class="history-amount">$${exp.amount.toFixed(2)}</div>
        `;
        historyListDiv.appendChild(item);
    });
}

function renderBalances() {
    balancesListDiv.innerHTML = '';
    
    if (members.length === 0 || expenses.length === 0) {
        balancesListDiv.innerHTML = '<div class="empty-state">No balances to settle yet.</div>';
        return;
    }
    
    const balances = {};
    members.forEach(m => balances[m] = 0);
    
    expenses.forEach(exp => {
        const amountPerPerson = exp.amount / exp.splits.length;
        balances[exp.payer] += exp.amount;
        exp.splits.forEach(person => {
            balances[person] -= amountPerPerson;
        });
    });
    
    const debtors = [];
    const creditors = [];
    
    for (const [person, balance] of Object.entries(balances)) {
        if (balance > 0.01) creditors.push({ person, amount: balance });
        else if (balance < -0.01) debtors.push({ person, amount: -balance });
    }
    
    const settlements = [];
    let d = 0, c = 0;
    
    while (d < debtors.length && c < creditors.length) {
        const debtor = debtors[d];
        const creditor = creditors[c];
        
        const amount = Math.min(debtor.amount, creditor.amount);
        
        if (amount > 0.01) {
            settlements.push({
                from: debtor.person,
                to: creditor.person,
                amount: amount
            });
        }
        
        debtor.amount -= amount;
        creditor.amount -= amount;
        
        if (debtor.amount < 0.01) d++;
        if (creditor.amount < 0.01) c++;
    }
    
    if (settlements.length === 0) {
        balancesListDiv.innerHTML = '<div class="empty-state">All settled up!</div>';
        return;
    }
    
    settlements.forEach(settlement => {
        const item = document.createElement('div');
        item.className = 'balance-item';
        item.innerHTML = `
            <span class="balance-text"><strong>${settlement.from}</strong> owes <strong>${settlement.to}</strong></span>
            <span class="amount-owe">$${settlement.amount.toFixed(2)}</span>
        `;
        balancesListDiv.appendChild(item);
    });
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('SW registered: ', registration.scope);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

// PWA Install Logic
let deferredPrompt;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt !== null) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
        installBtn.hidden = true;
    }
});

// Run Init
init();
