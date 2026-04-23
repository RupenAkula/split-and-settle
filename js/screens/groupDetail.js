/**
 * js/screens/groupDetail.js
 * Redesigned Group Detail Screen
 */

import { getGroupById, calculateSettlements, calculateBalances, formatINR, deleteExpense, markSettled, isSettled } from '../state.js';
import { clearApp, createHeader, createElement, createCard, showToast, animateScreenIn, formatDate } from '../ui.js';

export function renderGroupDetail(groupId) {
    clearApp();

    const appEl = document.getElementById('app');
    const group = getGroupById(groupId);

    if (!group) {
        showToast('Group not found', 'error');
        import('./home.js').then(m => m.renderHome());
        return;
    }

    // 1. Header
    const header = createHeader({
        title: group.name,
        showBack: true,
        onBack: async () => {
            const { renderHome } = await import('./home.js');
            renderHome();
        }
    });
    appEl.appendChild(header);

    const screenEl = createElement('div', { className: 'screen' });

    // --- Section 1: Summary ---
    const totalAmount = group.expenses.reduce((sum, e) => sum + e.amount, 0);
    const summaryCard = createElement('div', {
        className: 'card',
        attrs: { style: 'margin-bottom: var(--s6); background: var(--accent-subtle); border-color: var(--accent);' }
    });
    
    summaryCard.appendChild(createElement('div', {
        className: 'form-label',
        text: 'Total Expenses',
        attrs: { style: 'color: var(--accent);' }
    }));
    
    summaryCard.appendChild(createElement('div', {
        className: 'amount-large',
        text: formatINR(totalAmount)
    }));
    screenEl.appendChild(summaryCard);

    // --- Tab-like navigation (Section labels) ---
    const sectionNav = createElement('div', {
        attrs: { style: 'display: flex; gap: var(--s4); margin-bottom: var(--s4); border-bottom: 1px solid var(--border);' }
    });
    
    let activeSection = 'expenses';
    const sections = [
        { id: 'expenses', label: 'Expenses' },
        { id: 'settlements', label: 'Settlements' }
    ];

    const contentContainer = createElement('div', { attrs: { style: 'flex: 1;' } });

    sections.forEach(sec => {
        const btn = createElement('button', {
            className: 'text-xs font-bold',
            text: sec.label.toUpperCase(),
            attrs: { style: `padding: var(--s2) 0; letter-spacing: 0.06em; color: ${activeSection === sec.id ? 'var(--accent)' : 'var(--text-secondary)'}; border-bottom: 2px solid ${activeSection === sec.id ? 'var(--accent)' : 'transparent'};` }
        });
        
        btn.addEventListener('click', () => {
            activeSection = sec.id;
            updateContent();
            // Update UI state of buttons
            sectionNav.querySelectorAll('button').forEach(b => {
                const bId = b.textContent.toLowerCase();
                if (bId === activeSection) {
                    b.style.color = 'var(--accent)';
                    b.style.borderBottomColor = 'var(--accent)';
                } else {
                    b.style.color = 'var(--text-secondary)';
                    b.style.borderBottomColor = 'transparent';
                }
            });
        });
        sectionNav.appendChild(btn);
    });

    screenEl.appendChild(sectionNav);
    screenEl.appendChild(contentContainer);

    function updateContent() {
        contentContainer.innerHTML = '';
        
        if (activeSection === 'expenses') {
            renderExpenses();
        } else {
            renderSettlements();
        }
    }

    function renderExpenses() {
        if (group.expenses.length === 0) {
            contentContainer.appendChild(createElement('div', {
                className: 'text-secondary text-sm',
                text: 'No expenses added yet.',
                attrs: { style: 'text-align: center; margin-top: var(--s8);' }
            }));
            return;
        }

        const list = createElement('div', {
            attrs: { style: 'display: flex; flex-direction: column; gap: var(--s3);' }
        });

        [...group.expenses].reverse().forEach(exp => {
            const card = createElement('div', { className: 'card' });
            
            const row1 = createElement('div', { attrs: { style: 'display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--s1);' } });
            row1.appendChild(createElement('span', { className: 'text-sm font-bold', text: exp.description }));
            row1.appendChild(createElement('span', { className: 'text-sm font-bold tabular-nums', text: formatINR(exp.amount) }));

            const row2 = createElement('div', { attrs: { style: 'display: flex; justify-content: space-between; align-items: baseline;' } });
            const payer = group.members.find(m => m.id === exp.paidBy)?.name || 'Unknown';
            row2.appendChild(createElement('span', { className: 'text-xs text-secondary', text: `Paid by ${payer}` }));
            row2.appendChild(createElement('span', { className: 'text-xs text-muted', text: formatDate(exp.date) }));

            card.appendChild(row1);
            card.appendChild(row2);

            // Double tap to delete or similar? Rule says one primary action.
            // I'll add a long press for deletion.
            let pressTimer;
            card.addEventListener('touchstart', () => { pressTimer = setTimeout(() => { if (confirm('Delete expense?')) { deleteExpense(group.id, exp.id); renderGroupDetail(group.id); } }, 500); }, { passive: true });
            card.addEventListener('touchend', () => clearTimeout(pressTimer));

            list.appendChild(card);
        });

        contentContainer.appendChild(list);
    }

    function renderSettlements() {
        const transactions = calculateSettlements(group);
        
        if (transactions.length === 0) {
            contentContainer.appendChild(createElement('div', {
                className: 'text-secondary text-sm',
                text: 'All settled up!',
                attrs: { style: 'text-align: center; margin-top: var(--s8); font-weight: 600;' }
            }));
            return;
        }

        const list = createElement('div', {
             attrs: { style: 'display: flex; flex-direction: column; gap: var(--s3);' }
        });

        transactions.forEach(tx => {
            const signature = `${tx.from.id}-${tx.to.id}-${tx.amount}`;
            const settled = isSettled(group, signature);
            const card = createElement('div', { 
                className: 'card',
                attrs: { style: settled ? 'opacity: 0.5;' : '' }
            });

            const content = createElement('div', { attrs: { style: 'display: flex; flex-direction: column; gap: var(--s1);' } });
            
            const topRow = createElement('div', { attrs: { style: 'display: flex; justify-content: space-between; align-items: center;' } });
            const mainText = createElement('div', { className: 'text-sm' });
            mainText.innerHTML = `<strong>${tx.from.name}</strong> owes <strong>${tx.to.name}</strong>`;
            
            const amount = createElement('div', { className: 'amount-small', text: formatINR(tx.amount), attrs: { style: settled ? 'text-decoration: line-through;' : 'color: var(--accent);' } });
            
            topRow.appendChild(mainText);
            topRow.appendChild(amount);
            content.appendChild(topRow);

            if (!settled) {
                const settleBtn = createElement('button', {
                    className: 'btn-ghost btn-sm',
                    text: 'Settle Up',
                    events: { click: () => {
                        if (markSettled(group.id, signature)) {
                            showToast('Transaction settled', 'success');
                            renderGroupDetail(group.id);
                        }
                    }},
                    attrs: { style: 'margin-top: var(--s3); width: auto; align-self: flex-start;' }
                });
                content.appendChild(settleBtn);
            } else {
                content.appendChild(createElement('div', { className: 'text-xs text-muted', text: 'Settled ✓', attrs: { style: 'margin-top: var(--s1);' } }));
            }

            card.appendChild(content);
            list.appendChild(card);
        });

        contentContainer.appendChild(list);
    }

    updateContent();

    // --- Universal Primary Action: Add Expense ---
    const addExpenseBtn = createElement('button', {
        className: 'btn btn-primary',
        text: 'Add Expense',
        events: { click: async () => {
            const { renderAddExpense } = await import('./addExpense.js');
            renderAddExpense(group.id);
        }},
        attrs: { style: 'position: sticky; bottom: 0; margin-top: var(--s6);' }
    });
    screenEl.appendChild(addExpenseBtn);

    appEl.appendChild(screenEl);
    animateScreenIn(screenEl);
}
