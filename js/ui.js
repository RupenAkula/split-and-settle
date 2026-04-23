/**
 * js/ui.js
 * Redesigned UI utilities
 */

import { formatINR } from './state.js';

export function clearApp() {
    const appEl = document.getElementById('app');
    if (appEl) appEl.innerHTML = '';
}

export function showToast(message, type = 'default', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    if (container.children.length >= 3) {
        container.removeChild(container.firstChild);
    }

    const toast = createElement('div', {
        className: 'toast toast-enter',
        text: message
    });
    if (type === 'success') toast.classList.add('success');
    if (type === 'error') toast.classList.add('error');
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => {
            if (container.contains(toast)) container.removeChild(toast);
        }, 150);
    }, duration);
}

export function createElement(tag, { className, text, html, attrs, events } = {}) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    if (html !== undefined) el.innerHTML = html;
    
    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            el.setAttribute(key, value);
        }
    }
    
    if (events) {
        for (const [evtName, handler] of Object.entries(events)) {
            el.addEventListener(evtName, handler);
        }
    }
    
    return el;
}

export function createHeader({ title, showBack = false, onBack, rightContent = null }) {
    const header = createElement('div', { className: 'header' });
    
    if (showBack) {
        const backBtn = createElement('button', {
            className: 'back-btn',
            text: '←',
            events: { click: onBack }
        });
        header.appendChild(backBtn);
    }

    const titleEl = createElement('h1', {
        className: 'header-title',
        text: title
    });
    header.appendChild(titleEl);

    if (rightContent) {
        header.appendChild(rightContent);
    }

    return header;
}

export function createFormGroup({ label, inputEl, errorMessage = '' }) {
    const container = createElement('div', { className: 'form-group' });
    const labelEl = createElement('span', { className: 'form-label', text: label });
    const errorEl = createElement('div', { className: 'form-error', text: errorMessage });

    container.appendChild(labelEl);
    container.appendChild(inputEl);
    container.appendChild(errorEl);

    return {
        container,
        showError: (msg) => {
            errorEl.textContent = msg || errorMessage;
            errorEl.classList.add('visible');
            inputEl.classList.add('error');
        },
        hideError: () => {
            errorEl.classList.remove('visible');
            inputEl.classList.remove('error');
        }
    };
}

export function createEmptyState({ title, actionLabel, onAction }) {
    const container = createElement('div', { className: 'empty-state' });
    
    container.appendChild(createElement('div', { 
        className: 'text-secondary text-sm', 
        text: title 
    }));

    if (actionLabel && onAction) {
        const actionBtn = createElement('button', {
            className: 'btn btn-primary',
            text: actionLabel,
            events: { click: onAction },
            attrs: { style: 'margin-top: var(--s6);' }
        });
        container.appendChild(actionBtn);
    }

    return container;
}

export function createChip(text, onRemove = null) {
    const chip = createElement('span', { className: 'chip', text: text });
    
    if (onRemove) {
        const removeBtn = createElement('span', {
            className: 'chip-remove',
            text: '×',
            events: { click: (e) => { e.stopPropagation(); onRemove(); } }
        });
        chip.appendChild(removeBtn);
    }
    
    return chip;
}

export function createCard({ clickable = false, onClick = null } = {}) {
    const cls = clickable ? 'card card-pressable' : 'card';
    return createElement('div', { 
        className: cls, 
        events: onClick ? { click: onClick } : {} 
    });
}   

export function validateForm(rules) {
    let isValid = true;
    const errors = {};

    rules.forEach(rule => {
        const val = rule.value;
        const name = rule.label;
        let ruleError = null;

        if (rule.required && (!val || (typeof val === 'string' && val.trim() === ''))) {
            ruleError = `${name} is required`;
            isValid = false;
        } else if (rule.min !== undefined && (Array.isArray(val) || typeof val === 'string') && val.length < rule.min) {
            ruleError = `${name} requires at least ${rule.min} item(s)`;
            isValid = false;
        }

        if (ruleError) errors[name] = ruleError;
    });

    return { isValid, errors };
}

export function animateScreenIn(screenEl) {
    screenEl.classList.add('animate-fade-up');
}

export function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);
}
