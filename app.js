const STORAGE_KEY = 'groceryList';
const RECENT_KEY = 'groceryRecentItems';
const USAGE_KEY = 'groceryUsageStats';
const MASTER_ITEMS_URL = './data/grocery-items.json';
const CATEGORY_OPTIONS = [
  'Pulses & Grains',
  'Flours & Starches',
  'Spices & Condiments',
  'Oils & Cooking Liquids',
  'Dairy & Fresh Produce',
  'Beverages & Sweeteners',
  'Dishwashing',
  'Laundry & Floor Cleaning',
  'Personal Care & Hygiene',
  'Paper & Disposable Goods',
  'Others'
];
const UNIT_OPTIONS = ['kg', 'g', 'L', 'ml', 'packet', 'box', 'piece', 'dozen', 'bottle', 'bundle'];

const defaultGroceries = [];

const state = {
  search: '',
  category: 'All Categories',
  sort: 'recent',
  pendingAction: null,
  editingId: null,
  shoppingMode: false,
  recentItems: readRecentItems(),
  masterItems: [],
  selectedQuickItem: null,
  quickSuggestionIndex: -1,
  pdfSelectedCategories: CATEGORY_OPTIONS.slice(),
  defaultSelectedCategories: CATEGORY_OPTIONS.slice()
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
  quickAddStatus: document.getElementById('quickAddStatus'),
  quickAddInput: document.getElementById('quickAddInput'),
  quickAddButton: document.getElementById('quickAddButton'),
  quickAddQuantity: document.getElementById('quickAddQuantity'),
  quickAddUnit: document.getElementById('quickAddUnit'),
  quickAddSuggestions: document.getElementById('quickAddSuggestions'),
  recentSuggestions: document.getElementById('recentSuggestions'),
  shoppingModeButton: document.getElementById('shoppingModeButton'),
  pdfButton: document.getElementById('pdfButton'),
  clearPurchasedButton: document.getElementById('clearPurchasedButton'),
  clearAllButton: document.getElementById('clearAllButton'),
  pdfCategoryDialog: document.getElementById('pdfCategoryDialog'),
  pdfCategoryList: document.getElementById('pdfCategoryList'),
  pdfCloseButton: document.getElementById('pdfCloseButton'),
  pdfSelectAllButton: document.getElementById('pdfSelectAllButton'),
  pdfCancelButton: document.getElementById('pdfCancelButton'),
  pdfGenerateButton: document.getElementById('pdfGenerateButton'),
  defaultCategoryDialog: document.getElementById('defaultCategoryDialog'),
  defaultCategoryList: document.getElementById('defaultCategoryList'),
  defaultCategoryCloseButton: document.getElementById('defaultCategoryCloseButton'),
  defaultCategorySelectAllButton: document.getElementById('defaultCategorySelectAllButton'),
  defaultCategoryCancelButton: document.getElementById('defaultCategoryCancelButton'),
  defaultCategoryAddButton: document.getElementById('defaultCategoryAddButton'),
  emptyAddDefaultButton: document.getElementById('emptyAddDefaultButton'),
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

function cleanupLegacyStorage() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const sanitized = parsed
      .filter(item => item && typeof item === 'object')
      .map(normalizeItem)
      .filter(item => item.name);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.warn('Unable to read local data. Clearing stale grocery list.', error);
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function readGroceries() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return [];
    }

    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    const sanitizedItems = parsed
      .filter(item => item && typeof item === 'object')
      .map(normalizeItem)
      .filter(item => item.name);

    if (sanitizedItems.length !== parsed.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedItems));
    }

    return sanitizedItems;
  } catch (error) {
    console.warn('Unable to read local data. Clearing stale grocery list.', error);
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function normalizeItem(item) {
  const rawUnit = String(item.unit || 'piece').trim();
  const normalizedUnit = rawUnit || 'piece';
  const category = String(item.category || 'Others').trim() || 'Others';

  return {
    id: item.id || createId(),
    name: String(item.name || '').trim(),
    quantity: Number(item.quantity) || 0,
    unit: UNIT_OPTIONS.includes(normalizedUnit) ? normalizedUnit : normalizedUnit,
    category,
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

function readRecentItems() {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(0, 10) : [];
  } catch {
    return [];
  }
}

function saveRecentItems() {
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(state.recentItems.slice(0, 10)));
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function readUsageStats() {
  try {
    const raw = window.localStorage.getItem(USAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveUsageStats(stats) {
  window.localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
}

function getUsagePriority(name) {
  const stats = readUsageStats();
  const key = normalizeName(name);
  return Number(stats[key]) || 0;
}

function recordUsage(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) {
    return;
  }

  const key = normalizeName(cleaned);
  const stats = readUsageStats();
  stats[key] = (Number(stats[key]) || 0) + 1;
  saveUsageStats(stats);
}

function getEmojiForCategory(category) {
  const categoryMap = {
    Dairy: '🥛',
    Vegetables: '🥬',
    Fruits: '🍎',
    Grains: '🌾',
    Bakery: '🥖',
    Groceries: '🛍️',
    Beverages: '🥤',
    Household: '🏠',
    'Personal Care': '🧴',
    Spices: '🌶️',
    Others: '🧺'
  };

  return categoryMap[category] || '🧺';
}

function buildUnitOptions(item) {
  const values = Array.isArray(item?.units) && item.units.length ? item.units : ['pcs', 'kg', 'L', 'g', 'ml'];
  const selected = item?.defaultUnit || values[0] || 'pcs';

  return {
    values,
    selected
  };
}

function setQuickEntryOptions(item) {
  const genericOptions = ['ml', 'L', 'g', 'kg', 'pcs', 'dozen', 'packet', 'pack', 'bottle', 'box', 'can', 'jar'];
  const units = item ? buildUnitOptions(item) : { values: genericOptions, selected: 'pcs' };

  elements.quickAddUnit.innerHTML = units.values
    .map(unit => `<option value="${unit}" ${unit === units.selected ? 'selected' : ''}>${unit}</option>`)
    .join('');

  elements.quickAddQuantity.value = '1';
  if (item) {
    elements.quickAddUnit.value = units.selected;
  } else {
    elements.quickAddUnit.value = units.selected;
  }
}

function findMasterItem(name) {
  const query = normalizeName(name);
  return state.masterItems.find(item => normalizeName(item.name) === query) || null;
}

function getAutocompleteMatches(term) {
  const query = normalizeName(term);
  if (!query) {
    return [];
  }

  return state.masterItems
    .map(item => {
      const name = String(item.name || '').trim();
      const normalizedName = normalizeName(name);
      let score = getUsagePriority(name) * 25;

      if (normalizedName === query) {
        score += 1000;
      }

      if (normalizedName.startsWith(query)) {
        score += 400;
      }

      if (normalizedName.includes(query)) {
        score += 200;
      }

      return { item, score, normalizedName };
    })
    .filter(entry => entry.normalizedName.includes(query) || entry.normalizedName.startsWith(query))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.normalizedName.localeCompare(b.normalizedName);
    })
    .slice(0, 8)
    .map(entry => entry.item);
}

function renderQuickSuggestions() {
  const value = elements.quickAddInput.value.trim();
  const matches = getAutocompleteMatches(value);

  if (!value || !matches.length) {
    elements.quickAddSuggestions.classList.add('hidden');
    elements.quickAddSuggestions.innerHTML = '';
    state.quickSuggestionIndex = -1;
    return;
  }

  elements.quickAddSuggestions.innerHTML = matches
    .map((item, index) => `
      <button type="button" class="quick-suggestion ${index === state.quickSuggestionIndex ? 'active' : ''}" data-index="${index}" data-name="${String(item.name).replace(/"/g, '&quot;')}" role="option" aria-selected="${index === state.quickSuggestionIndex}">
        <span>${getEmojiForCategory(item.category || 'Others')}</span>
        <span>${escapeHtml(item.name)}</span>
      </button>
    `)
    .join('');

  elements.quickAddSuggestions.classList.remove('hidden');
}

function selectQuickSuggestion(itemName) {
  const item = findMasterItem(itemName) || state.masterItems.find(entry => normalizeName(entry.name) === normalizeName(itemName));
  if (!item) {
    elements.quickAddInput.value = itemName;
    state.selectedQuickItem = null;
    setQuickEntryOptions(null);
    return;
  }

  state.selectedQuickItem = item;
  elements.quickAddInput.value = item.name;
  setQuickEntryOptions(item);
  elements.quickAddSuggestions.classList.add('hidden');
  state.quickSuggestionIndex = -1;
}

function hideQuickAddStatus() {
  elements.quickAddStatus.textContent = '';
  elements.quickAddStatus.classList.add('hidden');
  elements.quickAddStatus.classList.remove('success', 'error');
}

function showQuickAddStatus(message, tone = 'success') {
  if (!message) {
    hideQuickAddStatus();
    return;
  }

  elements.quickAddStatus.textContent = message;
  elements.quickAddStatus.classList.remove('hidden', 'success', 'error');
  elements.quickAddStatus.classList.add(tone);
}

function focusQuickAddInput() {
  elements.quickAddInput.focus();
  const end = elements.quickAddInput.value.length;
  elements.quickAddInput.setSelectionRange(end, end);
}

function clearQuickEntry() {
  elements.quickAddInput.value = '';
  elements.quickAddQuantity.value = '1';
  elements.quickAddUnit.value = 'pcs';
  state.selectedQuickItem = null;
  elements.quickAddSuggestions.classList.add('hidden');
  state.quickSuggestionIndex = -1;
}

function parseQuickAdd(input) {
  const text = String(input || '').trim();
  if (!text) {
    return null;
  }

  const match = text.match(/^(.+?)(?:\s+(-?\d+(?:\.\d+)?)\s*(kg|g|L|ml|packet|pack|box|piece|dozen|bottle|bundle|pcs|pcs\.?|can|jar|tube)?)?$/i);
  const nameRaw = (match ? match[1] : text).trim();
  const quantityRaw = match ? match[2] : '';
  const unitRaw = match ? (match[3] || '').toLowerCase() : '';

  const quantity = quantityRaw ? Number(quantityRaw) : 1;
  const unit = unitRaw ? unitRaw.replace(/\.$/, '') : 'piece';

  return {
    name: nameRaw,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit: unit || 'piece',
    category: 'Others'
  };
}

function resolveQuickEntry() {
  const text = elements.quickAddInput.value.trim();
  if (!text) {
    return null;
  }

  const matches = getAutocompleteMatches(text);
  const selectedSuggestion = [...elements.quickAddSuggestions.querySelectorAll('.quick-suggestion')].find(button => button.classList.contains('active'));
  const activeName = selectedSuggestion ? selectedSuggestion.getAttribute('data-name') : null;
  const preferredItem = findMasterItem(activeName || text) || state.selectedQuickItem || matches.find(item => normalizeName(item.name) === normalizeName(text)) || matches[0] || null;

  const quantityValue = Number(elements.quickAddQuantity.value);
  const selectedUnit = elements.quickAddUnit.value || (preferredItem ? preferredItem.defaultUnit : 'pcs');
  const quantity = Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1;

  if (preferredItem) {
    const safeUnit = Array.isArray(preferredItem.units) && preferredItem.units.includes(selectedUnit)
      ? selectedUnit
      : preferredItem.defaultUnit || selectedUnit;

    return {
      name: preferredItem.name,
      quantity,
      unit: safeUnit,
      category: preferredItem.category || 'Others'
    };
  }

  return {
    name: text,
    quantity,
    unit: selectedUnit,
    category: 'Others'
  };
}

function findMatchingItem(name) {
  const normalizedName = normalizeName(name);
  return groceries.find(item => normalizeName(item.name) === normalizedName);
}

function addRecentItem(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) {
    return;
  }

  recordUsage(cleaned);
  state.recentItems = [cleaned, ...state.recentItems.filter(item => item.toLowerCase() !== cleaned.toLowerCase())].slice(0, 10);
  saveRecentItems();
  renderRecentSuggestions();
}

function renderRecentSuggestions() {
  if (!state.recentItems.length) {
    elements.recentSuggestions.innerHTML = '';
    return;
  }

  elements.recentSuggestions.innerHTML = state.recentItems
    .map(item => `<button type="button" class="recent-chip" data-recent="${escapeHtml(item)}">${escapeHtml(item)}</button>`)
    .join('');
}

async function loadMasterItems() {
  try {
    const response = await fetch(MASTER_ITEMS_URL);
    if (!response.ok) {
      throw new Error('Unable to load grocery catalog');
    }

    const items = await response.json();
    state.masterItems = Array.isArray(items) ? items.map(item => ({
      name: String(item.name || '').trim(),
      category: String(item.category || 'Others').trim() || 'Others',
      defaultUnit: String(item.defaultUnit || item.units?.[0] || 'pcs').trim() || 'pcs',
      units: Array.isArray(item.units) && item.units.length ? item.units.map(unit => String(unit).trim()).filter(Boolean) : ['pcs']
    })).filter(item => item.name) : [];
  } catch (error) {
    console.warn('Using built-in fallback grocery catalog.', error);
    state.masterItems = [
      { name: 'Milk', category: 'Dairy', defaultUnit: 'L', units: ['ml', 'L'] },
      { name: 'Rice', category: 'Grains', defaultUnit: 'kg', units: ['g', 'kg'] },
      { name: 'Tomato', category: 'Vegetables', defaultUnit: 'kg', units: ['g', 'kg'] },
      { name: 'Eggs', category: 'Dairy', defaultUnit: 'pcs', units: ['pcs', 'dozen'] },
      { name: 'Onion', category: 'Vegetables', defaultUnit: 'kg', units: ['g', 'kg', 'pcs'] }
    ];
  }

  if (!state.selectedQuickItem && elements.quickAddInput.value.trim()) {
    renderQuickSuggestions();
  }

  setQuickEntryOptions(state.selectedQuickItem || null);
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
    if (state.shoppingMode) {
      if (Number(a.purchased) !== Number(b.purchased)) {
        return Number(a.purchased) - Number(b.purchased);
      }
    }

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

  elements.groceryList.innerHTML = `
    <div class="grocery-table">
      ${filteredItems
        .map(item => {
          const displayName = item.purchased ? `✓ ${escapeHtml(item.name)}` : escapeHtml(item.name);
          const category = item.category ? escapeHtml(item.category) : 'Others';

          return `
            <div class="grocery-row ${item.purchased ? 'is-purchased' : ''}" data-id="${item.id}">
              <label class="purchase-toggle" aria-label="Mark ${escapeHtml(item.name)} as purchased">
                <input type="checkbox" data-action="toggle-purchase" data-id="${item.id}" ${item.purchased ? 'checked' : ''} />
                <span aria-hidden="true"></span>
              </label>

              <div class="grocery-name">${displayName}</div>
              <div class="grocery-qty">
                <div class="qty-stepper" data-qty-id="${item.id}">
                  <button type="button" data-action="decrease-qty" data-id="${item.id}" aria-label="Decrease quantity">−</button>
                  <span>${Number(item.quantity)}${escapeHtml(item.unit)}</span>
                  <button type="button" data-action="increase-qty" data-id="${item.id}" aria-label="Increase quantity">+</button>
                </div>
              </div>
              <div class="grocery-category">${category}</div>

              <div class="grocery-actions compact-actions">
                <button type="button" class="small-button" data-action="edit" data-id="${item.id}" aria-label="Edit ${escapeHtml(item.name)}">✏</button>
                <button type="button" class="small-button danger" data-action="delete" data-id="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">🗑</button>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function applyRowLayout() {
  const isMobile = window.innerWidth <= 520;

  document.querySelectorAll('.grocery-row').forEach(row => {
    if (isMobile) {
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '22px minmax(0, 1fr) auto';
      row.style.gridTemplateAreas = "'check name actions' 'check qty actions' 'check category actions'";
      row.style.columnGap = '8px';
      row.style.rowGap = '6px';
      row.style.width = '100%';
      row.style.minWidth = '0';
      row.style.padding = '10px 8px';

      const name = row.querySelector('.grocery-name');
      const qty = row.querySelector('.grocery-qty');
      const category = row.querySelector('.grocery-category');
      const actions = row.querySelector('.compact-actions');
      const check = row.querySelector('.purchase-toggle');

      if (name) {
        name.style.gridArea = 'name';
        name.style.fontSize = '0.82rem';
        name.style.lineHeight = '1.35';
      }
      if (qty) {
        qty.style.gridArea = 'qty';
        qty.style.fontSize = '0.75rem';
      }
      if (category) {
        category.style.gridArea = 'category';
        category.style.fontSize = '0.7rem';
      }
      if (actions) {
        actions.style.gridArea = 'actions';
        actions.style.display = 'flex';
        actions.style.flexDirection = 'column';
        actions.style.justifySelf = 'end';
        actions.style.alignSelf = 'start';
        actions.style.gap = '4px';
        actions.style.width = 'auto';
        actions.style.minWidth = '34px';
      }
      if (check) {
        check.style.gridArea = 'check';
        check.style.alignSelf = 'center';
        check.style.justifySelf = 'center';
      }
    } else {
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '26px minmax(0, 1.6fr) minmax(86px, 120px) minmax(0, 1fr) auto';
      row.style.gridTemplateAreas = "'check name qty category actions'";
      row.style.columnGap = '8px';
      row.style.rowGap = '0';
      row.style.width = 'auto';
      row.style.minWidth = '0';
      row.style.padding = '10px 8px';

      const name = row.querySelector('.grocery-name');
      const qty = row.querySelector('.grocery-qty');
      const category = row.querySelector('.grocery-category');
      const actions = row.querySelector('.compact-actions');
      const check = row.querySelector('.purchase-toggle');

      if (name) {
        name.style.gridArea = 'name';
        name.style.fontSize = '';
      }
      if (qty) {
        qty.style.gridArea = 'qty';
        qty.style.fontSize = '';
      }
      if (category) {
        category.style.gridArea = 'category';
        category.style.fontSize = '';
      }
      if (actions) {
        actions.style.gridArea = 'actions';
        actions.style.display = '';
        actions.style.flexDirection = '';
        actions.style.justifySelf = '';
        actions.style.alignSelf = '';
        actions.style.gap = '';
        actions.style.width = '';
        actions.style.minWidth = '';
      }
      if (check) {
        check.style.gridArea = 'check';
        check.style.alignSelf = '';
        check.style.justifySelf = '';
      }
    }
  });
}

function render() {
  renderList();
  updateSummary();
  applyRowLayout();
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
  const category = elements.itemCategory.value || 'Others';

  if (!name || !quantity || quantity <= 0) {
    window.alert('Please provide a valid item name and quantity.');
    return;
  }

  if (rawUnit === 'custom' && !customUnit) {
    window.alert('Please enter a custom unit or choose another unit.');
    return;
  }

  const existingItem = state.editingId ? groceries.find(item => item.id === state.editingId) : null;
  const duplicate = !state.editingId ? findMatchingItem(name) : null;

  if (duplicate) {
    const suggested = duplicate.quantity + quantity;
    groceries = groceries.map(item =>
      item.id === duplicate.id ? { ...item, quantity: suggested, unit: item.unit || unit, category: item.category || category } : item
    );
    saveGroceries();
    closeItemDialog();
    render();
    return;
  }

  const itemData = {
    id: state.editingId || createId(),
    name,
    quantity,
    unit,
    category,
    purchased: existingItem ? existingItem.purchased : false,
    createdAt: existingItem ? existingItem.createdAt : Date.now()
  };

  if (state.editingId) {
    groceries = groceries.map(item => (item.id === state.editingId ? { ...item, ...itemData } : item));
  } else {
    groceries.unshift(itemData);
  }

  addRecentItem(name);
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

function adjustQuantity(itemId, delta) {
  groceries = groceries.map(item => {
    if (item.id !== itemId) {
      return item;
    }

    const nextQuantity = Math.max(0, Number(item.quantity) + delta);
    return { ...item, quantity: nextQuantity };
  }).filter(item => !(item.id === itemId && item.quantity === 0));

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

function clearAllGroceries() {
  const totalItems = groceries.length;

  if (!totalItems) {
    return;
  }

  openConfirmDialog(
    'Clear your entire grocery list?',
    'This will remove all items from the UI and delete the saved local grocery list.',
    'Clear All',
    () => {
      groceries = [];
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Unable to clear the saved grocery list.', error);
      }
      render();
      closeConfirmDialog();
    }
  );
}

function getSelectedPdfCategories() {
  const selected = Array.from(elements.pdfCategoryList?.querySelectorAll('input[type="checkbox"]:checked') || [])
    .map(checkbox => checkbox.value)
    .filter(Boolean);

  return selected.length ? selected : [];
}

function renderPdfCategoryOptions() {
  if (!elements.pdfCategoryList) {
    return;
  }

  elements.pdfCategoryList.innerHTML = CATEGORY_OPTIONS.map(category => `
    <label class="pdf-category-option">
      <input type="checkbox" value="${escapeHtml(category)}" ${state.pdfSelectedCategories.includes(category) ? 'checked' : ''} />
      <span>${escapeHtml(category)}</span>
    </label>
  `).join('');
}

function renderDefaultCategoryOptions() {
  if (!elements.defaultCategoryList) {
    return;
  }

  elements.defaultCategoryList.innerHTML = CATEGORY_OPTIONS.map(category => `
    <label class="pdf-category-option">
      <input type="checkbox" value="${escapeHtml(category)}" ${state.defaultSelectedCategories.includes(category) ? 'checked' : ''} />
      <span>${escapeHtml(category)}</span>
    </label>
  `).join('');
}

function openPdfCategoryDialog() {
  state.pdfSelectedCategories = state.pdfSelectedCategories.length ? state.pdfSelectedCategories : CATEGORY_OPTIONS.slice();
  renderPdfCategoryOptions();
  elements.pdfCategoryDialog?.classList.remove('hidden');
  elements.pdfCategoryDialog?.setAttribute('aria-hidden', 'false');
}

function openDefaultCategoryDialog() {
  state.defaultSelectedCategories = state.defaultSelectedCategories.length ? state.defaultSelectedCategories : CATEGORY_OPTIONS.slice();
  renderDefaultCategoryOptions();
  elements.defaultCategoryDialog?.classList.remove('hidden');
  elements.defaultCategoryDialog?.setAttribute('aria-hidden', 'false');
}

function closePdfCategoryDialog() {
  elements.pdfCategoryDialog?.classList.add('hidden');
  elements.pdfCategoryDialog?.setAttribute('aria-hidden', 'true');
}

function closeDefaultCategoryDialog() {
  elements.defaultCategoryDialog?.classList.add('hidden');
  elements.defaultCategoryDialog?.setAttribute('aria-hidden', 'true');
}

function addDefaultGroceriesByCategory() {
  const selected = Array.from(elements.defaultCategoryList?.querySelectorAll('input[type="checkbox"]:checked') || [])
    .map(checkbox => checkbox.value)
    .filter(Boolean);

  const categories = selected.length ? selected : [];

  if (!categories.length) {
    return;
  }

  const additions = state.masterItems
    .filter(item => categories.includes(item.category))
    .map(item => ({
      id: createId(),
      name: item.name,
      quantity: 1,
      unit: item.defaultUnit || 'pcs',
      category: item.category,
      purchased: false,
      createdAt: Date.now() + Math.random()
    }));

  groceries = [...groceries, ...additions];
  saveGroceries();
  render();
  closeDefaultCategoryDialog();
}

function renderPrintArea(selectedCategories = null) {
  const categoriesToRender = selectedCategories && selectedCategories.length ? selectedCategories : [];
  const selectedSet = new Set(categoriesToRender);
  const filteredItems = getFilteredGroceries();

  const groups = CATEGORY_OPTIONS.filter(category => selectedSet.has(category)).map(category => ({
    category,
    items: filteredItems.filter(item => item.category === category)
  })).filter(group => group.items.length > 0);

  const otherItems = filteredItems.filter(item => !item.category || !CATEGORY_OPTIONS.includes(item.category));
  if (selectedSet.has('Others') && otherItems.length) {
    groups.push({ category: 'Others', items: otherItems });
  }

  const totalItems = filteredItems.length;
  const purchasedItems = filteredItems.filter(item => item.purchased).length;
  const remainingItems = totalItems - purchasedItems;

  const printHtml = `
    <div class="print-sheet">
      <h1>GROCERY LIST</h1>
      <div class="print-divider"></div>
      <div class="print-summary">
        <div>Total Items: ${totalItems}</div>
        <div>Purchased: ${purchasedItems}</div>
        <div>Remaining: ${remainingItems}</div>
      </div>
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
      `).join('') : '<p>No groceries match the selected categories.</p>'}
    </div>
  `;

  document.getElementById('printArea').innerHTML = printHtml;
}

function generatePdf() {
  const selectedCategories = getSelectedPdfCategories();
  state.pdfSelectedCategories = selectedCategories.length ? selectedCategories : CATEGORY_OPTIONS.slice();
  const originalTitle = document.title;
  document.title = ' ';
  renderPrintArea(state.pdfSelectedCategories);
  window.print();
  setTimeout(() => {
    document.title = originalTitle;
  }, 50);
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

  if (action === 'decrease-qty') {
    adjustQuantity(itemId, -1);
    return;
  }

  if (action === 'increase-qty') {
    adjustQuantity(itemId, 1);
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
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const isLocalHost = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

  const register = () => {
    navigator.serviceWorker.register('./service-worker.js').catch(error => {
      console.warn('Service worker registration failed:', error);
    });
  };

  if (isLocalHost) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      return Promise.all(registrations.map(registration => registration.unregister()));
    }).then(() => {
      window.addEventListener('load', register);
    }).catch(() => {
      window.addEventListener('load', register);
    });
    return;
  }

  window.addEventListener('load', register);
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

  elements.quickAddInput.addEventListener('input', () => {
    hideQuickAddStatus();
    const value = elements.quickAddInput.value.trim();
    const exact = findMasterItem(value);
    if (exact) {
      state.selectedQuickItem = exact;
      setQuickEntryOptions(exact);
      elements.quickAddSuggestions.classList.add('hidden');
      state.quickSuggestionIndex = -1;
      return;
    }

    state.selectedQuickItem = null;
    if (!value) {
      elements.quickAddSuggestions.classList.add('hidden');
      return;
    }

    renderQuickSuggestions();
  });

  elements.quickAddInput.addEventListener('keydown', event => {
    const suggestions = elements.quickAddSuggestions.querySelectorAll('.quick-suggestion');

    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      state.quickSuggestionIndex = Math.min(state.quickSuggestionIndex < 0 ? 0 : state.quickSuggestionIndex + 1, suggestions.length - 1);
      suggestions.forEach((button, index) => button.classList.toggle('active', index === state.quickSuggestionIndex));
      return;
    }

    if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      const nextIndex = state.quickSuggestionIndex < 0 ? suggestions.length - 1 : state.quickSuggestionIndex - 1;
      state.quickSuggestionIndex = Math.max(nextIndex, 0);
      suggestions.forEach((button, index) => button.classList.toggle('active', index === state.quickSuggestionIndex));
      return;
    }

    if (event.key === 'Escape') {
      elements.quickAddSuggestions.classList.add('hidden');
      state.quickSuggestionIndex = -1;
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (suggestions.length && state.quickSuggestionIndex >= 0) {
        const selected = suggestions[state.quickSuggestionIndex];
        const name = selected?.dataset?.name || elements.quickAddInput.value.trim();
        selectQuickSuggestion(name);
        return;
      }

      const result = resolveQuickEntry() || parseQuickAdd(elements.quickAddInput.value);
      if (!result) {
        return;
      }

      const existing = findMatchingItem(result.name);
      const name = result.name;

      if (existing) {
        groceries = groceries.map(item => item.id === existing.id ? { ...item, quantity: Number(item.quantity) + Number(result.quantity), unit: item.unit || result.unit } : item);
        addRecentItem(name);
        saveGroceries();
        render();
        clearQuickEntry();
        showQuickAddStatus(`✓ ${name} added`);
        focusQuickAddInput();
        return;
      }

      groceries.unshift({
        id: createId(),
        name,
        quantity: result.quantity,
        unit: result.unit,
        category: result.category,
        purchased: false,
        createdAt: Date.now()
      });

      addRecentItem(name);
      saveGroceries();
      render();
      clearQuickEntry();
      showQuickAddStatus(`✓ ${name} added`);
      focusQuickAddInput();
    }
  });

  elements.quickAddButton.addEventListener('click', () => {
    const result = resolveQuickEntry() || parseQuickAdd(elements.quickAddInput.value);
    if (!result) {
      return;
    }

    const existing = findMatchingItem(result.name);
    const name = result.name;

    if (existing) {
      groceries = groceries.map(item => item.id === existing.id ? { ...item, quantity: Number(item.quantity) + Number(result.quantity), unit: item.unit || result.unit } : item);
      addRecentItem(name);
      saveGroceries();
      render();
      clearQuickEntry();
      showQuickAddStatus(`✓ ${name} added`);
      focusQuickAddInput();
      return;
    }

    groceries.unshift({
      id: createId(),
      name,
      quantity: result.quantity,
      unit: result.unit,
      category: result.category,
      purchased: false,
      createdAt: Date.now()
    });

    addRecentItem(name);
    saveGroceries();
    render();
    clearQuickEntry();
    showQuickAddStatus(`✓ ${name} added`);
    focusQuickAddInput();
  });

  elements.quickAddSuggestions.addEventListener('click', event => {
    const suggestion = event.target.closest('.quick-suggestion');
    if (!suggestion) {
      return;
    }

    const targetName = suggestion.getAttribute('data-name');
    selectQuickSuggestion(targetName);
  });

  elements.recentSuggestions.addEventListener('click', event => {
    const chip = event.target.closest('[data-recent]');
    if (!chip) {
      return;
    }

    const itemName = chip.dataset.recent;
    const knownItem = findMasterItem(itemName);
    elements.quickAddInput.value = itemName;
    elements.quickAddInput.focus();
    if (knownItem) {
      state.selectedQuickItem = knownItem;
      setQuickEntryOptions(knownItem);
    } else {
      state.selectedQuickItem = null;
      setQuickEntryOptions(null);
    }
    elements.quickAddSuggestions.classList.add('hidden');
  });

  elements.shoppingModeButton.addEventListener('click', () => {
    state.shoppingMode = !state.shoppingMode;
    elements.shoppingModeButton.classList.toggle('active', state.shoppingMode);
    render();
  });

  elements.emptyAddDefaultButton.addEventListener('click', () => openDefaultCategoryDialog());
  elements.defaultCategoryCloseButton.addEventListener('click', closeDefaultCategoryDialog);
  elements.defaultCategoryCancelButton.addEventListener('click', closeDefaultCategoryDialog);
  elements.defaultCategorySelectAllButton.addEventListener('click', () => {
    state.defaultSelectedCategories = CATEGORY_OPTIONS.slice();
    renderDefaultCategoryOptions();
  });
  elements.defaultCategoryAddButton.addEventListener('click', addDefaultGroceriesByCategory);
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

  elements.pdfButton.addEventListener('click', () => {
    openPdfCategoryDialog();
  });

  elements.pdfCloseButton.addEventListener('click', closePdfCategoryDialog);
  elements.pdfCancelButton.addEventListener('click', closePdfCategoryDialog);
  elements.pdfSelectAllButton.addEventListener('click', () => {
    state.pdfSelectedCategories = CATEGORY_OPTIONS.slice();
    renderPdfCategoryOptions();
  });
  elements.pdfGenerateButton.addEventListener('click', () => {
    const selected = getSelectedPdfCategories();
    state.pdfSelectedCategories = selected.length ? selected : CATEGORY_OPTIONS.slice();
    closePdfCategoryDialog();
    generatePdf();
  });

  elements.clearPurchasedButton.addEventListener('click', clearPurchasedItems);
  elements.clearAllButton.addEventListener('click', clearAllGroceries);

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

cleanupLegacyStorage();
renderRecentSuggestions();
loadMasterItems();
initializeControls();
render();
registerServiceWorker();
