/**
 * js/screens/home.js
 * Redesigned Home Screen
 */

import { getGroups, deleteGroup, getGroupSummary, GROUP_TYPES, formatINR } from '../state.js';
import { clearApp, createHeader, createEmptyState, showToast, createElement, createCard, animateScreenIn } from '../ui.js';
import { renderCreateGroup } from './createGroup.js';

export function renderHome() {
    clearApp();

    const appEl = document.getElementById('app');
    const groups = getGroups();

    // 1. Header
    const newGroupBtn = createElement('button', {
        className: 'btn-ghost btn-sm',
        text: '+ New Group',
        events: { click: renderCreateGroup }
    });

    const header = createHeader({
        title: 'Split & Settle',
        rightContent: newGroupBtn
    });
    appEl.appendChild(header);

    const screenEl = createElement('div', { className: 'screen' });

    if (groups.length === 0) {
        // 3. Empty state
        const emptyState = createEmptyState({
            title: 'No groups yet',
            actionLabel: '+ New Group',
            onAction: renderCreateGroup
        });
        screenEl.appendChild(emptyState);
    } else {
        // 2. Group List
        const listContainer = createElement('div', {
            attrs: { style: 'display: flex; flex-direction: column; gap: var(--s3);' }
        });

        groups.forEach(group => {
            const summary = getGroupSummary(group);
            const groupType = GROUP_TYPES[group.type]?.label || 'Other';
            
            const card = createCard({
                clickable: true,
                onClick: async () => {
                    const { renderGroupDetail } = await import('./groupDetail.js');
                    renderGroupDetail(group.id);
                }
            });

            // Deletion logic (kept working)
            let pressTimer;
            card.addEventListener('touchstart', () => { pressTimer = setTimeout(() => { if (confirm(`Delete ${group.name}?`)) { deleteGroup(group.id); renderHome(); } }, 500); }, { passive: true });
            card.addEventListener('touchend', () => clearTimeout(pressTimer));

            // Line 1: Name + Type
            const line1 = createElement('div', {
                attrs: { style: 'display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--s1);' }
            });
            line1.appendChild(createElement('span', { className: 'text-sm font-bold', text: group.name }));
            line1.appendChild(createElement('span', { className: 'text-xs text-secondary', text: groupType }));

            // Line 2: Members + Amount
            const line2 = createElement('div', {
                attrs: { style: 'display: flex; justify-content: space-between; align-items: baseline;' }
            });
            line2.appendChild(createElement('span', { className: 'text-xs text-muted', text: `${group.members.length} members` }));
            
            if (summary.totalExpenses > 0) {
                const amountEl = createElement('span', {
                    className: 'text-xs font-bold tabular-nums',
                    text: summary.isFullySettled ? 'Settled' : formatINR(summary.totalExpenses),
                    attrs: { style: summary.isFullySettled ? 'color: var(--text-muted)' : 'color: var(--accent)' }
                });
                line2.appendChild(amountEl);
            }

            card.appendChild(line1);
            card.appendChild(line2);
            listContainer.appendChild(card);
        });

        screenEl.appendChild(listContainer);

        // 4. Large fixed button at bottom
        const bottomBtn = createElement('button', {
            className: 'btn btn-primary',
            text: '+ New Group',
            events: { click: renderCreateGroup },
            attrs: { style: 'position: sticky; bottom: 0; margin-top: var(--s6);' }
        });
        screenEl.appendChild(bottomBtn);
    }

    appEl.appendChild(screenEl);
    animateScreenIn(screenEl);
}
