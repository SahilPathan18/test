/**
 * CloudPulse Demo - Client Application Logic
 * Supports dual-mode persistence: LocalStorage and Supabase (PostgreSQL)
 */

(function () {
  'use strict';

  // State
  let storageMode = localStorage.getItem('cloudpulse_db_mode') || 'local';
  let supabaseUrl = localStorage.getItem('cloudpulse_supabase_url') || '';
  let supabaseKey = localStorage.getItem('cloudpulse_supabase_key') || '';
  let supabaseClient = null;
  let items = [];
  let currentFilter = 'all';

  // Sample seed data for initial view
  const SAMPLE_ITEMS = [
    {
      id: 1,
      author: 'Alex (Lead Dev)',
      category: '🚀 Deployment',
      content: 'Netlify deployment configured! Continuous deployment from GitHub triggers automatically on every push.',
      likes: 12,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 2,
      author: 'Sarah (DB Architect)',
      category: '🗄️ Database',
      content: 'Connected to Supabase PostgreSQL table. Real-time updates and Row Level Security (RLS) active.',
      likes: 8,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 3,
      author: 'Jordan (Frontend)',
      category: '💡 Idea',
      content: 'Netlify serverless functions handle secret tokens smoothly without exposing them in client-side code.',
      likes: 5,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ];

  // DOM Elements
  const itemsFeed = document.getElementById('itemsFeed');
  const addItemForm = document.getElementById('addItemForm');
  const itemAuthor = document.getElementById('itemAuthor');
  const itemCategory = document.getElementById('itemCategory');
  const itemContent = document.getElementById('itemContent');
  const filterChips = document.getElementById('filterChips');
  const countAll = document.getElementById('countAll');
  const clearAllItemsBtn = document.getElementById('clearAllItemsBtn');
  const resetSampleDataBtn = document.getElementById('resetSampleDataBtn');

  // Status Indicators
  const navDbText = document.getElementById('navDbText');
  const navDbDot = document.getElementById('navDbDot');
  const boardDbLabel = document.getElementById('boardDbLabel');
  const boardDbIndicator = document.getElementById('boardDbIndicator');
  const switchDbBtn = document.getElementById('switchDbBtn');

  // Modal Elements
  const dbModal = document.getElementById('dbModal');
  const openDbModalBtn = document.getElementById('openDbModalBtn');
  const heroDbSettingsBtn = document.getElementById('heroDbSettingsBtn');
  const closeDbModalBtn = document.getElementById('closeDbModalBtn');
  const cancelDbModalBtn = document.getElementById('cancelDbModalBtn');
  const saveDbConfigBtn = document.getElementById('saveDbConfigBtn');
  const useLocalBtn = document.getElementById('useLocalBtn');
  const useSupabaseBtn = document.getElementById('useSupabaseBtn');
  const supabaseConfigFields = document.getElementById('supabaseConfigFields');
  const localConfigFields = document.getElementById('localConfigFields');
  const supabaseUrlInput = document.getElementById('supabaseUrlInput');
  const supabaseKeyInput = document.getElementById('supabaseKeyInput');
  const copySqlBtn = document.getElementById('copySqlBtn');

  // Serverless Test
  const testFunctionBtn = document.getElementById('testFunctionBtn');
  const functionResponseOutput = document.getElementById('functionResponseOutput');
  const toast = document.getElementById('toast');

  // Helper: Toast
  function showToast(message, duration = 3000) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // Initialize Supabase if configured
  function initSupabase() {
    if (storageMode === 'supabase' && supabaseUrl && supabaseKey && window.supabase) {
      try {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        updateStatusDisplay(true, 'Supabase (Live)');
        return true;
      } catch (err) {
        console.error('Supabase init error:', err);
        updateStatusDisplay(false, 'Supabase (Error)');
        return false;
      }
    } else {
      supabaseClient = null;
      updateStatusDisplay(false, 'Local Storage');
      return false;
    }
  }

  // Update UI indicators
  function updateStatusDisplay(isLive, labelText) {
    if (navDbText) navDbText.textContent = `DB: ${labelText}`;
    if (boardDbLabel) boardDbLabel.innerHTML = `Mode: <strong>${labelText}</strong>`;

    if (isLive) {
      if (navDbDot) navDbDot.classList.add('active');
      if (boardDbIndicator) boardDbIndicator.classList.add('connected');
    } else {
      if (navDbDot) navDbDot.classList.remove('active');
      if (boardDbIndicator) boardDbIndicator.classList.remove('connected');
    }
  }

  // Fetch Items
  async function fetchItems() {
    if (storageMode === 'supabase' && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('messages')
          .select('*')
          .order('id', { ascending: false });

        if (error) throw error;
        items = data || [];
        renderItems();
        return;
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local storage:', err.message);
        showToast('⚠️ Supabase error: ' + err.message + ' (using LocalStorage)');
      }
    }

    // LocalStorage fallback
    const saved = localStorage.getItem('cloudpulse_items');
    if (saved) {
      try {
        items = JSON.parse(saved);
      } catch {
        items = [...SAMPLE_ITEMS];
      }
    } else {
      items = [...SAMPLE_ITEMS];
      localStorage.setItem('cloudpulse_items', JSON.stringify(items));
    }
    renderItems();
  }

  // Save Item
  async function createItem(author, category, content) {
    const newItem = {
      author,
      category,
      content,
      likes: 0,
      created_at: new Date().toISOString()
    };

    if (storageMode === 'supabase' && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('messages')
          .insert([newItem])
          .select();

        if (error) throw error;
        showToast('✅ Saved to Supabase PostgreSQL database!');
        fetchItems();
        return;
      } catch (err) {
        showToast('❌ Supabase error: ' + err.message);
      }
    }

    // LocalStorage
    newItem.id = Date.now();
    items.unshift(newItem);
    localStorage.setItem('cloudpulse_items', JSON.stringify(items));
    showToast('💾 Saved to Local Storage!');
    renderItems();
  }

  // Delete Item
  async function deleteItem(id) {
    if (storageMode === 'supabase' && supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('messages')
          .delete()
          .eq('id', id);

        if (error) throw error;
        showToast('🗑️ Entry deleted from Supabase');
        fetchItems();
        return;
      } catch (err) {
        showToast('❌ Error deleting from Supabase: ' + err.message);
      }
    }

    // Local
    items = items.filter(item => item.id !== id);
    localStorage.setItem('cloudpulse_items', JSON.stringify(items));
    showToast('🗑️ Entry removed');
    renderItems();
  }

  // Like Item
  async function likeItem(id) {
    const item = items.find(it => it.id === id);
    if (!item) return;

    if (storageMode === 'supabase' && supabaseClient) {
      try {
        const newLikes = (item.likes || 0) + 1;
        const { error } = await supabaseClient
          .from('messages')
          .update({ likes: newLikes })
          .eq('id', id);

        if (error) throw error;
        fetchItems();
        return;
      } catch (err) {
        console.warn('Like failed on cloud:', err);
      }
    }

    item.likes = (item.likes || 0) + 1;
    localStorage.setItem('cloudpulse_items', JSON.stringify(items));
    renderItems();
  }

  // Render cards to DOM
  function renderItems() {
    if (!itemsFeed) return;

    const filtered = currentFilter === 'all'
      ? items
      : items.filter(it => it.category === currentFilter);

    if (countAll) countAll.textContent = items.length;

    if (filtered.length === 0) {
      itemsFeed.innerHTML = `
        <div class="empty-state">
          <p>📭 No messages or tasks found for this filter.</p>
          <p><small>Submit a new item above to get started!</small></p>
        </div>
      `;
      return;
    }

    itemsFeed.innerHTML = filtered.map(item => {
      const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="item-card" data-id="${item.id}">
          <div>
            <div class="item-card-top">
              <span class="item-category-tag">${escapeHtml(item.category)}</span>
              <span class="item-date">${dateStr}</span>
            </div>
            <p class="item-content">${escapeHtml(item.content)}</p>
          </div>
          <div class="item-footer">
            <span class="item-author">👤 ${escapeHtml(item.author)}</span>
            <div class="item-actions">
              <button class="action-btn like-btn" data-id="${item.id}" title="Upvote">
                ❤️ <span>${item.likes || 0}</span>
              </button>
              <button class="action-btn delete delete-btn" data-id="${item.id}" title="Delete">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    itemsFeed.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'), 10);
        likeItem(id);
      });
    });

    itemsFeed.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'), 10);
        if (confirm('Delete this entry?')) {
          deleteItem(id);
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Event Listeners
  if (addItemForm) {
    addItemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const author = itemAuthor.value.trim();
      const category = itemCategory.value;
      const content = itemContent.value.trim();

      if (!author || !content) return;

      createItem(author, category, content);
      itemContent.value = '';
    });
  }

  if (clearAllItemsBtn) {
    clearAllItemsBtn.addEventListener('click', () => {
      if (confirm('Clear all entries from local display?')) {
        items = [];
        localStorage.removeItem('cloudpulse_items');
        renderItems();
        showToast('Board cleared');
      }
    });
  }

  if (resetSampleDataBtn) {
    resetSampleDataBtn.addEventListener('click', () => {
      items = [...SAMPLE_ITEMS];
      localStorage.setItem('cloudpulse_items', JSON.stringify(items));
      renderItems();
      showToast('Sample demo data reloaded');
    });
  }

  // Filter chips
  if (filterChips) {
    filterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;

      filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.getAttribute('data-filter');
      renderItems();
    });
  }

  // Modal Controls
  function openModal() {
    supabaseUrlInput.value = supabaseUrl;
    supabaseKeyInput.value = supabaseKey;
    if (storageMode === 'supabase') {
      useSupabaseBtn.click();
    } else {
      useLocalBtn.click();
    }
    dbModal.classList.add('open');
  }

  function closeModal() {
    dbModal.classList.remove('open');
  }

  if (openDbModalBtn) openDbModalBtn.addEventListener('click', openModal);
  if (heroDbSettingsBtn) heroDbSettingsBtn.addEventListener('click', openModal);
  if (switchDbBtn) switchDbBtn.addEventListener('click', openModal);
  if (closeDbModalBtn) closeDbModalBtn.addEventListener('click', closeModal);
  if (cancelDbModalBtn) cancelDbModalBtn.addEventListener('click', closeModal);

  if (useLocalBtn && useSupabaseBtn) {
    useLocalBtn.addEventListener('click', () => {
      useLocalBtn.classList.add('active');
      useSupabaseBtn.classList.remove('active');
      localConfigFields.classList.remove('hidden');
      supabaseConfigFields.classList.add('hidden');
    });

    useSupabaseBtn.addEventListener('click', () => {
      useSupabaseBtn.classList.add('active');
      useLocalBtn.classList.remove('active');
      localConfigFields.classList.add('hidden');
      supabaseConfigFields.classList.remove('hidden');
    });
  }

  if (saveDbConfigBtn) {
    saveDbConfigBtn.addEventListener('click', () => {
      const isSupabase = useSupabaseBtn.classList.contains('active');
      if (isSupabase) {
        const url = supabaseUrlInput.value.trim();
        const key = supabaseKeyInput.value.trim();
        if (!url || !key) {
          alert('Please enter both your Supabase URL and Anon Key.');
          return;
        }
        storageMode = 'supabase';
        supabaseUrl = url;
        supabaseKey = key;
        localStorage.setItem('cloudpulse_db_mode', 'supabase');
        localStorage.setItem('cloudpulse_supabase_url', url);
        localStorage.setItem('cloudpulse_supabase_key', key);
        initSupabase();
        fetchItems();
        showToast('Supabase configuration saved!');
      } else {
        storageMode = 'local';
        localStorage.setItem('cloudpulse_db_mode', 'local');
        initSupabase();
        fetchItems();
        showToast('Switched to LocalStorage mode');
      }
      closeModal();
    });
  }

  // Copy SQL Schema
  if (copySqlBtn) {
    copySqlBtn.addEventListener('click', () => {
      const sql = document.getElementById('sqlCode').innerText;
      navigator.clipboard.writeText(sql).then(() => {
        showToast('📋 SQL schema copied to clipboard!');
      }).catch(() => {
        showToast('Highlight and copy the SQL box text');
      });
    });
  }

  // Serverless Function Ping Test
  if (testFunctionBtn && functionResponseOutput) {
    testFunctionBtn.addEventListener('click', async () => {
      functionResponseOutput.textContent = 'Pinging /.netlify/functions/api ...';
      try {
        const res = await fetch('/.netlify/functions/api');
        if (res.ok) {
          const json = await res.json();
          functionResponseOutput.textContent = JSON.stringify(json, null, 2);
          showToast('⚡ Serverless Function response received!');
        } else {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
      } catch (err) {
        // Fallback for local testing outside of netlify dev
        const simulated = {
          status: 'simulated_local_mode',
          note: 'Local browser environment detected. When deployed to Netlify or run with "ntl dev", this executes live in AWS Lambda / Netlify Edge.',
          endpoint: '/.netlify/functions/api',
          timestamp: new Date().toISOString(),
          serverless_ready: true,
          error_detail: err.message
        };
        functionResponseOutput.textContent = JSON.stringify(simulated, null, 2);
        showToast('Simulated serverless response (Deploy to Netlify for live Lambda execution)');
      }
    });
  }

  // Boot
  initSupabase();
  fetchItems();
})();
