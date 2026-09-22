const STORAGE_KEY = 'groceryList';
const CATEGORY_OPTIONS = [
  'Vegetables',
  'Fruits',
  'Dairy',
  'Groceries',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care',
  'Other'
];
const UNIT_OPTIONS = ['kg', 'g', 'L', 'ml', 'packet', 'box', 'piece', 'dozen', 'bottle', 'bundle'];

const defaultGroceries = [
  { id: createId(), name: 'Rice', quantity: 5, unit: 'kg', category: 'Groceries', purchased: false, createdAt: Date.now() },
  { id: createId(), name: 'Milk', quantity: 2, unit: 'L', category: 'Dairy', purchased: false, createdAt: Date.now() + 1000 },
  { id: createId(), name: 'Tomatoes', quantity: 1, unit: 'kg', category: 'Vegetables', purchased: false, createdAt: Date.now() + 2000 },
  { id: createId(), name: 'Eggs', quantity: 12, unit: 'piece', category: 'Dairy', purchased: true, createdAt: Date.now() + 3000 }
];

const state = {
  search: '',
  category: 'All Categories',
  sort: 'recent',
  pendingAction: null,
  editingId: null
};

let groceries = readGroceries();

const elements = {
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  sortSelect: document.getElementById('sortSelect'),
  groceryList: document.getElementById('groceryList'),
  emptyState: document.getElementById('emptyState'),
  itemsCount: document.getElementById('itemsCount'),
  purchasedCount: document.getElementById('purchasedCount'),
  addButton: document.getElementById('addButton'),
  emptyAddButton: document.getElementById('emptyAddButton'),
  pdfButton: document.getElementById('pdfButton'),
  clearPurchasedButton: document.getElementById('clearPurchasedButton'),
  exportButton: document.getElementById('exportButton'),
  importButton: document.getElementById('importButton'),
  importInput: document.getElementById('importInput'),
  clearAllButton: document.getElementById('clearAllButton'),
  itemDialog: document.getElementById('itemDialog'),
  dialogTitle: document.getElementById('dialogTitle'),
  groceryForm: document.getElementById('groceryForm'),
  itemName: document.getElementById('itemName'),
  itemQuantity: document.getElementById('itemQuantity'),
  itemUnit: document.getElementById('itemUnit'),
  customUnitWrap: document.getElementById('customUnitWrap'),
  customUnit: document.getElementById('customUnit'),
  itemCategory: document.getElementById('itemCategory'),
  closeDialogButton: document.getElementById('closeDialogButton'),
  cancelItemButton: document.getElementById('cancelItemButton'),
  confirmDialog: document.getElementById('confirmDialog'),
  confirmTitle: document.getElementById('confirmTitle'),
  confirmMessage: document.getElementById('confirmMessage'),
  cancelConfirmButton: document.getElementById('cancelConfirmButton'),
  confirmActionButton: document.getElementById('confirmActionButton')
};

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureDefaultGroceries() {
  if (!groceries.length) {
    groceries = defaultGroceries.map(item => ({ ...item }));
    saveGroceries();
  }
}

function readGroceries() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return defaultGroceries.map(item => ({ ...item }));
    }

    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) {
      return defaultGroceries.map(item => ({ ...item }));
    }

    return parsed.map(normalizeItem);
  } catch (error) {
    console.warn('Unable to read local data. Falling back to defaults.', error);
    return defaultGroceries.map(item => ({ ...item }));
  }
}

function normalizeItem(item) {
  const rawUnit = String(item.unit || 'piece').trim() || 'piece';

  return {
    id: item.id || createId(),
    name: String(item.name || '').trim(),
    quantity: Number(item.quantity) || 0,
    unit: UNIT_OPTIONS.includes(rawUnit) ? rawUnit : 'piece',
    category: String(item.category || 'Other').trim() || 'Other',
    purchased: Boolean(item.purchased),
    createdAt: Number(item.createdAt) || Date.now()
  };
}

function saveGroceries() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groceries));
  } catch (error) {
    console.error('Unable to save groceries.', error);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getFilteredGroceries() {
  const query = state.search.trim().toLowerCase();

  const filtered = groceries.filter(item => {
    const matchesName = item.name.toLowerCase().includes(query);
    const matchesCategory = item.category.toLowerCase().includes(query);
    const matchesText = !query || matchesName || matchesCategory;
    const matchesCategoryFilter = state.category === 'All Categories' || item.category === state.category;
    return matchesText && matchesCategoryFilter;
  });

  filtered.sort((a, b) => {
    switch (state.sort) {
      case 'name':
        return a.name.localeCompare(b.name) || Number(a.createdAt) - Number(b.createdAt);
      case 'category':
        return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      case 'purchased':
        return Number(b.purchased) - Number(a.purchased) || Number(b.createdAt) - Number(a.createdAt);
      case 'recent':
      default:
        return Number(b.createdAt) - Number(a.createdAt);
    }
  });

  return filtered;
}

function updateSummary() {
  elements.itemsCount.textContent = String(groceries.length);
  elements.purchasedCount.textContent = String(groceries.filter(item => item.purchased).length);
}

function renderList() {
  const filteredItems = getFilteredGroceries();

  if (!filteredItems.length) {
    elements.groceryList.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    return;
  }

  elements.emptyState.classList.add('hidden');

  elements.groceryList.innerHTML = filteredItems
    .map(item => {
      const displayName = item.purchased ? `✓ ${escapeHtml(item.name)}` : escapeHtml(item.name);
      const category = item.category ? `<span class="category-pill">${escapeHtml(item.category)}</span>` : '';

      return `
        <article class="grocery-item ${item.purchased ? 'is-purchased' : ''}" data-id="${item.id}">
          <div class="item-main">
            <label class="purchase-toggle" aria-label="Mark ${escapeHtml(item.name)} as purchased">
              <input type="checkbox" data-action="toggle-purchase" data-id="${item.id}" ${item.purchased ? 'checked' : ''} />
              <span aria-hidden="true"></span>
            </label>

            <div class="item-content">
              <h3>${displayName}</h3>
              <p>${Number(item.quantity)} ${escapeHtml(item.unit)}</p>
              ${category}
            </div>
          </div>

          <div class="grocery-actions">
            <button type="button" class="small-button" data-action="edit" data-id="${item.id}">✏ Edit</button>
            <button type="button" class="small-button danger" data-action="delete" data-id="${item.id}">🗑 Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function render() {
  renderList();
  updateSummary();
}

function openItemDialog(itemId = null) {
  const existingItem = groceries.find(item => item.id === itemId);

  elements.groceryForm.reset();
  elements.customUnitWrap.classList.add('hidden');
  elements.customUnit.value = '';
  elements.itemUnit.value = 'kg';
  elements.itemCategory.value = '';

  if (existingItem) {
    state.editingId = existingItem.id;
    elements.dialogTitle.textContent = 'Edit Grocery';
    elements.itemName.value = existingItem.name;
    elements.itemQuantity.value = existingItem.quantity;

    if (UNIT_OPTIONS.includes(existingItem.unit)) {
      elements.itemUnit.value = existingItem.unit;
    } else {
      elements.itemUnit.value = 'custom';
      elements.customUnitWrap.classList.remove('hidden');
      elements.customUnit.value = existingItem.unit;
    }

    elements.itemCategory.value = existingItem.category || '';
  } else {
    state.editingId = null;
    elements.dialogTitle.textContent = 'Add Grocery';
    elements.itemName.value = '';
    elements.itemQuantity.value = '';
    elements.itemUnit.value = 'kg';
    elements.itemCategory.value = 'Groceries';
  }

  elements.itemDialog.classList.remove('hidden');
  elements.itemDialog.setAttribute('aria-hidden', 'false');
}

function closeItemDialog() {
  elements.itemDialog.classList.add('hidden');
  elements.itemDialog.setAttribute('aria-hidden', 'true');
  elements.groceryForm.reset();
  state.editingId = null;
}

function openConfirmDialog(title, message, confirmText, confirmAction) {
  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
  elements.confirmActionButton.textContent = confirmText;
  state.pendingAction = confirmAction;
  elements.confirmDialog.classList.remove('hidden');
  elements.confirmDialog.setAttribute('aria-hidden', 'false');
}

function closeConfirmDialog() {
  elements.confirmDialog.classList.add('hidden');
  elements.confirmDialog.setAttribute('aria-hidden', 'true');
  state.pendingAction = null;
}

function handleSaveItem(event) {
  event.preventDefault();

  const name = elements.itemName.value.trim();
  const quantity = Number(elements.itemQuantity.value);
  const rawUnit = elements.itemUnit.value;
  const customUnit = elements.customUnit.value.trim();
  const unit = rawUnit === 'custom' ? customUnit || 'piece' : rawUnit;
  const category = elements.itemCategory.value || 'Other';

  if (!name || !quantity || quantity <= 0) {
    window.alert('Please provide a valid item name and quantity.');
    return;
  }

  if (rawUnit === 'custom' && !customUnit) {
    window.alert('Please enter a custom unit or choose another unit.');
    return;
  }

  const itemData = {
    id: state.editingId || createId(),
    name,
    quantity,
    unit,
    category,
    purchased: state.editingId ? groceries.find(item => item.id === state.editingId)?.purchased || false : false,
    createdAt: state.editingId ? groceries.find(item => item.id === state.editingId)?.createdAt || Date.now() : Date.now()
  };

  if (state.editingId) {
    groceries = groceries.map(item => (item.id === state.editingId ? { ...item, ...itemData } : item));
  } else {
    groceries.unshift(itemData);
  }

  saveGroceries();
  closeItemDialog();
  render();
}

function togglePurchased(itemId) {
  groceries = groceries.map(item => {
    if (item.id === itemId) {
      return { ...item, purchased: !item.purchased };
    }
    return item;
  });

  saveGroceries();
  render();
}

function deleteItem(itemId) {
  const item = groceries.find(entry => entry.id === itemId);
  if (!item) {
    return;
  }

  openConfirmDialog(
    'Delete "' + item.name + '"?',
    'This item will be removed from your list.',
    'Delete',
    () => {
      groceries = groceries.filter(entry => entry.id !== itemId);
      saveGroceries();
      render();
      closeConfirmDialog();
    }
  );
}

function clearPurchasedItems() {
  const purchasedCount = groceries.filter(item => item.purchased).length;

  if (!purchasedCount) {
    return;
  }

  openConfirmDialog(
    'Remove all purchased items?',
    'This will clear ' + purchasedCount + ' purchased item(s) from your list.',
    'Clear',
    () => {
      groceries = groceries.filter(item => !item.purchased);
      saveGroceries();
      render();
      closeConfirmDialog();
    }
  );
}

function exportGroceries() {
  const blob = new Blob([JSON.stringify(groceries, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `grocery-list-${dateStamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importGroceries(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = event => {
    try {
      const parsed = JSON.parse(String(event.target.result));
      if (!Array.isArray(parsed)) {
        throw new Error('Imported file is not a JSON array.');
      }

      const sanitized = parsed.map(normalizeItem).filter(item => item.name && item.quantity > 0);
      if (!sanitized.length) {
        throw new Error('No valid grocery items found in the import file.');
      }

      groceries = sanitized;
      saveGroceries();
      render();
    } catch (error) {
      window.alert('Unable to import groceries. Please choose a valid grocery list export file.');
      console.error(error);
    }
  };

  reader.readAsText(file);
}

function clearAllData() {
  openConfirmDialog(
    'Clear all data?',
    'This will permanently remove every grocery item stored on this device.',
    'Clear All',
    () => {
      groceries = [];
      saveGroceries();
      render();
      closeConfirmDialog();
    }
  );
}

function renderPrintArea() {
  const filteredItems = getFilteredGroceries();
  const groups = CATEGORY_OPTIONS.map(category => ({
    category,
    items: filteredItems.filter(item => item.category === category)
  })).filter(group => group.items.length > 0);

  const allCategories = filteredItems.filter(item => !item.category || !CATEGORY_OPTIONS.includes(item.category));
  if (allCategories.length) {
    groups.push({ category: 'Other', items: allCategories });
  }

  const printHtml = `
    <div class="print-sheet">
      <h1>GROCERY LIST</h1>
      <div class="print-meta">Date: ${new Date().toLocaleDateString('en-GB')}</div>
      <div class="print-divider"></div>
      ${groups.length ? groups.map(group => `
        <section class="print-section">
          <h2>${escapeHtml(group.category)}</h2>
          ${group.items.map(item => `
            <div class="print-item">
              <div class="print-item-name">
                <span>${item.purchased ? '☑' : '☐'}</span>
                <span>${escapeHtml(item.name)}</span>
              </div>
              <span>${Number(item.quantity)} ${escapeHtml(item.unit)}</span>
            </div>
          `).join('')}
        </section>
      `).join('') : '<p>No groceries match the current filters.</p>'}
      <div class="print-divider"></div>
      <div class="print-summary">
        <p><strong>Total Items:</strong> ${groceries.length}</p>
        <p><strong>Purchased:</strong> ${groceries.filter(item => item.purchased).length}</p>
        <p><strong>Remaining:</strong> ${groceries.filter(item => !item.purchased).length}</p>
      </div>
    </div>
  `;

  document.getElementById('printArea').innerHTML = printHtml;
}

function generatePdf() {
  renderPrintArea();
  window.print();
}

function handleListClick(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) {
    return;
  }

  const itemId = actionTarget.getAttribute('data-id');
  const action = actionTarget.getAttribute('data-action');

  if (action === 'toggle-purchase') {
    togglePurchased(itemId);
    return;
  }

  if (action === 'edit') {
    openItemDialog(itemId);
    return;
  }

  if (action === 'delete') {
    deleteItem(itemId);
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(error => {
        console.warn('Service worker registration failed:', error);
      });
    });
  }
}

function initializeControls() {
  elements.searchInput.addEventListener('input', event => {
    state.search = event.target.value;
    render();
  });

  elements.categoryFilter.addEventListener('change', event => {
    state.category = event.target.value;
    render();
  });

  elements.sortSelect.addEventListener('change', event => {
    state.sort = event.target.value;
    render();
  });

  elements.addButton.addEventListener('click', () => openItemDialog());
  elements.emptyAddButton.addEventListener('click', () => openItemDialog());
  elements.closeDialogButton.addEventListener('click', closeItemDialog);
  elements.cancelItemButton.addEventListener('click', closeItemDialog);
  elements.groceryForm.addEventListener('submit', handleSaveItem);
  elements.groceryList.addEventListener('click', handleListClick);
  elements.groceryList.addEventListener('change', event => {
    const checkbox = event.target.closest('[data-action="toggle-purchase"]');
    if (checkbox) {
      togglePurchased(checkbox.getAttribute('data-id'));
    }
  });

  elements.itemUnit.addEventListener('change', () => {
    const isCustom = elements.itemUnit.value === 'custom';
    elements.customUnitWrap.classList.toggle('hidden', !isCustom);
    if (isCustom) {
      elements.customUnit.focus();
    }
  });

  elements.pdfButton.addEventListener('click', generatePdf);
  elements.clearPurchasedButton.addEventListener('click', clearPurchasedItems);
  elements.exportButton.addEventListener('click', exportGroceries);
  elements.importButton.addEventListener('click', () => elements.importInput.click());
  elements.importInput.addEventListener('change', event => {
    const [file] = event.target.files;
    importGroceries(file);
    event.target.value = '';
  });
  elements.clearAllButton.addEventListener('click', clearAllData);

  elements.cancelConfirmButton.addEventListener('click', closeConfirmDialog);
  elements.confirmActionButton.addEventListener('click', () => {
    if (typeof state.pendingAction === 'function') {
      state.pendingAction();
    }
  });

  elements.itemDialog.addEventListener('click', event => {
    if (event.target === elements.itemDialog) {
      closeItemDialog();
    }
  });

  elements.confirmDialog.addEventListener('click', event => {
    if (event.target === elements.confirmDialog) {
      closeConfirmDialog();
    }
  });
}

ensureDefaultGroceries();
initializeControls();
render();
registerServiceWorker();
