/**
 * js/screens/addExpense.js
 * Redesigned Add Expense Screen
 */

import { getGroupById, addExpense, formatINR } from '../state.js';
import { clearApp, createHeader, createFormGroup, showToast, createElement, validateForm, animateScreenIn } from '../ui.js';

export function renderAddExpense(groupId) {
    clearApp();

    const appEl = document.getElementById('app');
    const group = getGroupById(groupId);

    if (!group) {
        showToast('Group not found', 'error');
        import('./home.js').then(m => m.renderHome());
        return;
    }

    // Header
    const header = createHeader({
        title: 'Add Expense',
        showBack: true,
        onBack: async () => {
            const { renderGroupDetail } = await import('./groupDetail.js');
            renderGroupDetail(groupId);
        }
    });
    appEl.appendChild(header);

    const screenEl = createElement('div', { className: 'screen' });

    // 1. DESCRIPTION
    const descInput = createElement('input', {
        className: 'input',
        attrs: { placeholder: 'e.g. Dinner, Cab, Grocery...' }
    });
    const descGroup = createFormGroup({ label: 'What was it for?', inputEl: descInput });
    screenEl.appendChild(descGroup.container);

    // 2. AMOUNT
    const amountInput = createElement('input', {
        className: 'input',
        attrs: { type: 'number', inputmode: 'decimal', placeholder: '₹ 0' }
    });
    const amountGroup = createFormGroup({ label: 'Amount', inputEl: amountInput });
    screenEl.appendChild(amountGroup.container);

    // 3. PAID BY
    let paidBy = group.members[0].id; // Default to first member
    screenEl.appendChild(createElement('span', { className: 'form-label', text: 'Paid By' }));
    const payerSelector = createElement('div', { 
        attrs: { style: 'display: flex; flex-wrap: wrap; gap: var(--s2); margin-bottom: var(--s5);' } 
    });
    
    group.members.forEach(member => {
        const btn = createElement('button', {
            className: `type-btn ${member.id === paidBy ? 'selected' : ''}`,
            text: member.name,
            attrs: { style: 'flex: none; min-width: 80px;' },
            events: { click: () => {
                payerSelector.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                paidBy = member.id;
            }}
        });
        payerSelector.appendChild(btn);
    });
    screenEl.appendChild(payerSelector);

    // 4. SPLIT BETWEEN
    let splitBetween = group.members.map(m => m.id); // Default to everyone
    screenEl.appendChild(createElement('span', { className: 'form-label', text: 'Split Between' }));
    const splitList = createElement('div', {
        attrs: { style: 'display: flex; flex-direction: column; gap: var(--s2); margin-bottom: var(--s6);' }
    });

    group.members.forEach(member => {
        const row = createElement('div', {
            className: 'card card-pressable',
            attrs: { style: 'padding: var(--s3) var(--s4); display: flex; align-items: center; justify-content: space-between;' },
            events: { click: () => {
                if (splitBetween.includes(member.id)) {
                    if (splitBetween.length > 1) {
                        splitBetween = splitBetween.filter(id => id !== member.id);
                        check.style.display = 'none';
                        row.style.borderColor = 'var(--border)';
                    } else {
                        showToast('At least one person must be in the split', 'error');
                    }
                } else {
                    splitBetween.push(member.id);
                    check.style.display = 'block';
                    row.style.borderColor = 'var(--accent)';
                }
            }}
        });

        if (splitBetween.includes(member.id)) {
            row.style.borderColor = 'var(--accent)';
        }

        const name = createElement('span', { className: 'text-sm font-bold', text: member.name });
        const check = createElement('span', { 
            text: '✓', 
            attrs: { style: `color: var(--accent); font-weight: bold; display: ${splitBetween.includes(member.id) ? 'block' : 'none'};` } 
        });

        row.appendChild(name);
        row.appendChild(check);
        splitList.appendChild(row);
    });
    screenEl.appendChild(splitList);

    // Primary Action
    const addBtn = createElement('button', {
        className: 'btn btn-primary',
        text: 'Add Expense',
        attrs: { style: 'position: sticky; bottom: 0; margin-top: auto;' }
    });

    addBtn.addEventListener('click', async () => {
        const amount = parseFloat(amountInput.value);
        const { isValid, errors } = validateForm([
            { value: descInput.value, required: true, label: 'Description' },
            { value: amount, required: true, min: 1, label: 'Amount' }
        ]);

        if (!isValid) {
            if (errors['Description']) descGroup.showError(errors['Description']);
            if (errors['Amount']) amountGroup.showError(errors['Amount']);
            return;
        }

        addBtn.disabled = true;
        addBtn.textContent = 'Adding...';

        try {
            addExpense(groupId, {
                description: descInput.value,
                amount: amount,
                paidBy: paidBy,
                splitBetween: splitBetween
            });

            showToast('Expense added!', 'success');
            const { renderGroupDetail } = await import('./groupDetail.js');
            renderGroupDetail(groupId);
        } catch (e) {
            showToast(e.message || 'Failed to add expense', 'error');
            addBtn.disabled = false;
            addBtn.textContent = 'Add Expense';
        }
    });

    screenEl.appendChild(addBtn);
    appEl.appendChild(screenEl);
    animateScreenIn(screenEl);
}
