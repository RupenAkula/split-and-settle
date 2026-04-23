/**
 * js/state.js
 * Split & Settle - State Management
 * 
 * This file serves as the single source of truth for all data within the application.
 * It manages reading from and writing to localStorage exclusively; no other parts
 * of the application should touch localStorage directly. All data mutation and access
 * should be done through the exported functions provided in this module.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Versioned storage key to ensure that future schema changes don't break old data.
 * @type {string}
 */
export const STORAGE_KEY = 'sns_v1_groups';

/**
 * Predefined group types and their associated labels and emojis.
 * @type {Object}
 */
export const GROUP_TYPES = {
    trip: { label: 'Trip', emoji: '🚗' },
    flat: { label: 'Flat', emoji: '🏠' },
    hangout: { label: 'Hangout', emoji: '🍻' },
    other: { label: 'Other', emoji: '📦' }
};

// ============================================================================
// STATE OBJECT
// ============================================================================

/**
 * The central state object.
 * @type {Object}
 */
export let state = {
    groups: [],
    currentGroupId: null,
    isLoading: false
};

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

/**
 * Reads from localStorage, parses JSON, and updates state.groups.
 * Handles validation and errors securely.
 * @returns {Array} The loaded user groups.
 */
export function loadState() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                state.groups = parsed;
                return state.groups;
            }
        }
        state.groups = [];
        return state.groups;
    } catch (error) {
        console.error('Failed to parse state from localStorage:', error);
        state.groups = [];
        return state.groups;
    }
}

/**
 * Serializes state.groups to JSON and writes it to localStorage.
 * Handles storage limit quotas via try/catch.
 */
export function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.groups));
    } catch (error) {
        console.error('Storage full — could not save', error);
    }
}

/**
 * Returns the current array of groups, ensuring it is loaded if empty.
 * @returns {Array} The groups array.
 */
export function getGroups() {
    if (state.groups.length === 0) {
        loadState();
    }
    return state.groups;
}

/**
 * Finds and returns a group by its ID.
 * @param {string} id - The UUID of the group.
 * @returns {Object|null} The group object, or null if not found.
 */
export function getGroupById(id) {
    const groups = getGroups();
    const group = groups.find(g => g.id === id);
    if (!group) {
        console.warn(`Group with id ${id} not found.`);
        return null;
    }
    return group;
}

/**
 * Returns the currently active group matching state.currentGroupId.
 * @returns {Object|null} The current active group object.
 */
export function getCurrentGroup() {
    if (!state.currentGroupId) return null;
    return getGroupById(state.currentGroupId);
}

// ============================================================================
// GROUP CRUD
// ============================================================================

/**
 * Creates a new expense group.
 * @param {Object} params - The group creation parameters.
 * @param {string} params.name - The name of the group.
 * @param {string} params.type - The key identifier from GROUP_TYPES.
 * @param {Array<string>} params.members - An array of member names.
 * @returns {Object} The newly created group.
 */
export function createGroup({ name, type, members }) {
    if (!name || name.trim() === '') {
        throw new Error('Group name is required.');
    }
    if (!members || members.length < 2) {
        throw new Error('At least 2 members are required to split expenses.');
    }

    const newGroup = {
        id: crypto.randomUUID(),
        name: name.trim(),
        type: type || 'other',
        members: members.map(m => {
            if (typeof m === 'string') {
                return { id: crypto.randomUUID(), name: m.trim(), upiId: '' };
            }
            return {
                id: m.id || crypto.randomUUID(),
                name: m.name.trim(),
                upiId: (m.upiId || '').trim()
            };
        }),
        expenses: [],
        settledTransactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    getGroups(); // ensure state is loaded
    state.groups.push(newGroup);
    saveState();
    return newGroup;
}

/**
 * Updates an existing group with merged data.
 * @param {string} id - The group ID to update.
 * @param {Object} updates - Target properties to update on the group.
 * @returns {Object|null} The fully updated group, or null if not found.
 */
export function updateGroup(id, updates) {
    const group = getGroupById(id);
    if (!group) return null;

    Object.assign(group, updates);
    group.updatedAt = new Date().toISOString();
    saveState();
    return group;
}

/**
 * Deletes a group from the storage.
 * @param {string} id - The ID of the group to delete.
 * @returns {boolean} True if deletion succeeded, false otherwise.
 */
export function deleteGroup(id) {
    const groups = getGroups();
    const index = groups.findIndex(g => g.id === id);
    if (index === -1) return false;

    groups.splice(index, 1);
    saveState();
    
    if (state.currentGroupId === id) {
        state.currentGroupId = null;
    }
    
    return true;
}

// ============================================================================
// EXPENSE CRUD
// ============================================================================

/**
 * Adds an expense transaction to a group.
 * @param {string} groupId - The target group ID.
 * @param {Object} expense - The expense details.
 * @param {string} expense.description - What the expense was for.
 * @param {number|string} expense.amount - Total cost.
 * @param {string} expense.paidBy - Member ID who paid the amount.
 * @param {Array<string>} expense.splitBetween - Member IDs participating in the split.
 * @returns {Object} The added expense object.
 */
export function addExpense(groupId, { description, amount, paidBy, splitBetween }) {
    if (!description || description.trim() === '') throw new Error('Description is required.');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error('Amount must be greater than 0.');
    if (!paidBy) throw new Error('paidBy field is required.');
    if (!splitBetween || splitBetween.length < 1) throw new Error('Expense must be split between at least 1 person.');

    const group = getGroupById(groupId);
    if (!group) throw new Error('Group not found.');

    const newExpense = {
        id: crypto.randomUUID(),
        description: description.trim(),
        amount: parsedAmount,
        paidBy: paidBy,
        splitBetween: splitBetween,
        date: new Date().toISOString()
    };

    group.expenses.push(newExpense);
    group.updatedAt = new Date().toISOString();
    saveState();
    return newExpense;
}

/**
 * Removes an expense transaction from a group.
 * @param {string} groupId - The group ID.
 * @param {string} expenseId - The expense ID to remove.
 * @returns {boolean} True if successfully removed.
 */
export function deleteExpense(groupId, expenseId) {
    const group = getGroupById(groupId);
    if (!group) return false;

    const index = group.expenses.findIndex(e => e.id === expenseId);
    if (index === -1) return false;

    group.expenses.splice(index, 1);
    group.updatedAt = new Date().toISOString();
    saveState();
    return true;
}

// ============================================================================
// SETTLEMENT
// ============================================================================

/**
 * Computes net balances for all members in a given group.
 * @param {Object} group - The target group.
 * @returns {Object} An object mapping `memberId` to the computed balance data: { name, balance }.
 */
export function calculateBalances(group) {
    const balances = {};

    // Initialize all members with 0 balance
    group.members.forEach(member => {
        balances[member.id] = { name: member.name, balance: 0 };
    });

    // Iterate through all expenses to mutate balances
    group.expenses.forEach(expense => {
        // Person who paid gets back the amount they paid
        if (balances[expense.paidBy]) {
            balances[expense.paidBy].balance += expense.amount;
        }

        // Split amount evenly among participants
        const splitAmount = expense.amount / expense.splitBetween.length;
        expense.splitBetween.forEach(splitMemberId => {
            if (balances[splitMemberId]) {
                balances[splitMemberId].balance -= splitAmount;
            }
        });
    });

    // Round balances to 2 decimal places to avoid floating point errors
    for (const id in balances) {
        balances[id].balance = Math.round(balances[id].balance * 100) / 100;
    }

    return balances;
}

/**
 * Computes optimal peer-to-peer settlement transactions using a greedy algorithm.
 * @param {Object} group - The target group.
 * @returns {Array<Object>} List of transactions shaped: { id, from: { id, name }, to: { id, name }, amount }
 */
export function calculateSettlements(group) {
    const balancesData = calculateBalances(group);
    const creditors = []; // people owed money (positive balance)
    const debtors = [];   // people who owe money (negative balance)

    // Separate based on threshold to handle floating point noise
    for (const [id, data] of Object.entries(balancesData)) {
        if (data.balance > 0.01) {
            creditors.push({ id, name: data.name, balance: data.balance });
        } else if (data.balance < -0.01) {
            debtors.push({ id, name: data.name, balance: Math.abs(data.balance) });
        }
    }

    // Sort descending by highest absolute balances
    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => b.balance - a.balance);

    const transactions = [];
    let i = 0; // creditors index
    let j = 0; // debtors index

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];

        // The settlement amount is the minimum of what debtor owes and creditor needs
        const settlementAmount = Math.min(creditor.balance, debtor.balance);

        transactions.push({
            id: crypto.randomUUID(),
            from: { id: debtor.id, name: debtor.name },
            to: { id: creditor.id, name: creditor.name },
            amount: Math.round(settlementAmount * 100) / 100
        });

        // Adjust remaining balances
        creditor.balance -= settlementAmount;
        debtor.balance -= settlementAmount;

        // Move pointers if fulfilled
        if (creditor.balance < 0.01) i++;
        if (debtor.balance < 0.01) j++;
    }

    return transactions;
}

/**
 * Marks a specific settlement route as settled persistently.
 * @param {string} groupId - The target group's ID.
 * @param {string} transactionSignature - Unique signature mapping the settled transaction.
 * @returns {boolean} True if successfully added.
 */
export function markSettled(groupId, transactionSignature) {
    const group = getGroupById(groupId);
    if (!group) return false;

    if (!group.settledTransactions) {
        group.settledTransactions = [];
    }

    if (!group.settledTransactions.includes(transactionSignature)) {
        group.settledTransactions.push(transactionSignature);
        group.updatedAt = new Date().toISOString();
        saveState();
        return true;
    }
    return false;
}

/**
 * Checks if a particular transaction signature has been flagged as settled.
 * @param {Object} group - The target group.
 * @param {string} transactionSignature - Signature denoting the transaction flow.
 * @returns {boolean} True if already settled.
 */
export function isSettled(group, transactionSignature) {
    if (!group || !group.settledTransactions) return false;
    return group.settledTransactions.includes(transactionSignature);
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Format a number to Indian Rupees format.
 * @param {number} amount - Localized float number.
 * @returns {string} The formatted string payload.
 */
export function formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Gets a high-level summary overview of a group's activity status.
 * @param {Object} group - The target group to read from.
 * @returns {Object} Data container detailing counts and summation metadata.
 */
export function getGroupSummary(group) {
    if (!group) return { totalExpenses: 0, memberCount: 0, expenseCount: 0, isFullySettled: true };
    
    // Sum all expenses attached to the group
    const totalExpenses = group.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const transactions = calculateSettlements(group);
    
    // Validate if every optimal transaction string exists in the settled pool
    const isFullySettled = transactions.length > 0 && transactions.every(tx => {
        const signature = `${tx.from.id}-${tx.to.id}-${tx.amount}`;
        return isSettled(group, signature);
    });

    return {
        totalExpenses: totalExpenses,
        memberCount: group.members.length,
        expenseCount: group.expenses.length,
        isFullySettled: group.expenses.length === 0 ? true : isFullySettled
    };
}
