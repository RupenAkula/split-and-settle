/**
 * js/screens/createGroup.js
 * Redesigned Create Group Screen
 */

import { createGroup, GROUP_TYPES } from '../state.js';
import { clearApp, createHeader, createFormGroup, createChip, showToast, createElement, validateForm, animateScreenIn } from '../ui.js';

export function renderCreateGroup() {
    clearApp();

    const appEl = document.getElementById('app');
    let selectedType = 'trip';
    let members = [];

    // Header
    const header = createHeader({
        title: 'New Group',
        showBack: true,
        onBack: async () => {
            const { renderHome } = await import('./home.js');
            renderHome();
        }
    });
    appEl.appendChild(header);

    const screenEl = createElement('div', { className: 'screen' });

    // a) GROUP NAME
    const nameInput = createElement('input', {
        className: 'input',
        attrs: { id: 'group-name-input', placeholder: 'e.g. Goa Trip', maxLength: '40' }
    });
    const nameCounter = createElement('div', {
        className: 'text-xs text-muted',
        text: '0/40',
        attrs: { style: 'text-align: right; margin-top: var(--s1);' }
    });
    const nameGroup = createFormGroup({ label: 'Group Name', inputEl: nameInput });
    
    nameInput.addEventListener('input', () => {
        const len = nameInput.value.length;
        nameCounter.textContent = `${len}/40`;
        nameCounter.style.color = len >= 36 ? 'var(--danger)' : 'var(--text-muted)';
        nameGroup.hideError();
    });

    screenEl.appendChild(nameGroup.container);
    nameGroup.container.appendChild(nameCounter);

    // b) TYPE
    const typeLabel = createElement('span', { className: 'form-label', text: 'Type' });
    screenEl.appendChild(typeLabel);
    const typeSelector = createElement('div', { className: 'type-selector', attrs: { style: 'margin-bottom: var(--s5);' } });
    
    Object.entries(GROUP_TYPES).forEach(([key, info]) => {
        const btn = createElement('button', {
            className: `type-btn ${key === selectedType ? 'selected' : ''}`,
            text: info.label,
            events: { click: () => {
                typeSelector.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedType = key;
            }}
        });
        typeSelector.appendChild(btn);
    });
    screenEl.appendChild(typeSelector);

    // c) MEMBERS
    const membersLabel = createElement('span', { className: 'form-label', text: 'Members' });
    const membersStatus = createElement('div', { className: 'text-xs text-secondary', text: '0 added', attrs: { style: 'margin-bottom: var(--s2); margin-top: calc(-1 * var(--s1));' } });
    
    const memberRow = createElement('div', { attrs: { style: 'display: flex; gap: var(--s2);' } });
    const memberInput = createElement('input', { className: 'input', attrs: { placeholder: 'e.g. Rahul' } });
    const addMemberBtn = createElement('button', { 
        className: 'btn btn-primary btn-sm', 
        text: 'Add Member', 
        events: { click: handleAddMember } 
    });
    
    memberRow.appendChild(memberInput);
    memberRow.appendChild(addMemberBtn);

    const chipsContainer = createElement('div', { attrs: { style: 'display: flex; flex-wrap: wrap; gap: var(--s2); margin-top: var(--s3); margin-bottom: var(--s5);' } });
    
    screenEl.appendChild(membersLabel);
    screenEl.appendChild(membersStatus);
    screenEl.appendChild(memberRow);
    screenEl.appendChild(chipsContainer);

    // e) UPI IDS
    const upiSection = createElement('div', { attrs: { style: 'display: none;' } });
    upiSection.appendChild(createElement('span', { className: 'form-label', text: 'UPI IDs' }));
    const upiList = createElement('div', { attrs: { style: 'display: flex; flex-direction: column; gap: var(--s2);' } });
    upiSection.appendChild(upiList);
    screenEl.appendChild(upiSection);

    function updateMembersUI() {
        membersStatus.textContent = `${members.length} added`;
        chipsContainer.innerHTML = '';
        members.forEach(m => {
            chipsContainer.appendChild(createChip(m.name, () => {
                members = members.filter(x => x.id !== m.id);
                updateMembersUI();
            }));
        });

        upiSection.style.display = members.length > 0 ? 'block' : 'none';
        upiList.innerHTML = '';
        members.forEach(m => {
            const row = createElement('div', { attrs: { style: 'display: flex; align-items: center; gap: var(--s2);' } });
            row.appendChild(createElement('span', { className: 'text-sm', text: m.name, attrs: { style: 'min-width: 80px;' } }));
            const uInput = createElement('input', { 
                className: 'input', 
                attrs: { placeholder: 'name@upi', style: 'min-height: 40px; padding: var(--s2) var(--s4);' } 
            });
            uInput.value = m.upiId;
            uInput.addEventListener('input', () => { m.upiId = uInput.value; });
            row.appendChild(uInput);
            upiList.appendChild(row);
        });
    }

    function handleAddMember() {
        const val = memberInput.value.trim();
        if (!val) { triggerShake(memberInput); return; }
        if (members.some(m => m.name.toLowerCase() === val.toLowerCase())) { triggerShake(memberInput); return; }
        
        members.push({ id: crypto.randomUUID(), name: val, upiId: '' });
        memberInput.value = '';
        updateMembersUI();
    }

    memberInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAddMember(); });

    function triggerShake(el) {
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
    }

    // Create Group Button
    const createBtn = createElement('button', {
        className: 'btn btn-primary',
        text: 'Create Group',
        attrs: { style: 'position: sticky; bottom: 0; margin-top: auto;' }
    });

    createBtn.addEventListener('click', async () => {
        const { isValid, errors } = validateForm([
            { value: nameInput.value, required: true, label: 'Group Name' },
            { value: members, min: 2, label: 'Members' }
        ]);

        if (!isValid) {
            if (errors['Group Name']) nameGroup.showError(errors['Group Name']);
            if (errors['Members']) showToast(errors['Members'], 'error');
            return;
        }

        createBtn.disabled = true;
        createBtn.textContent = 'Creating...';
        
        try {
            const group = createGroup({ name: nameInput.value, type: selectedType, members });
            showToast('Group created!', 'success');
            const { renderGroupDetail } = await import('./groupDetail.js');
            renderGroupDetail(group.id);
        } catch (e) {
            showToast('Failed to create group', 'error');
            createBtn.disabled = false;
            createBtn.textContent = 'Create Group';
        }
    });

    screenEl.appendChild(createBtn);
    appEl.appendChild(screenEl);
    animateScreenIn(screenEl);
}
