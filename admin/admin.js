(function () {
  const API = window.location.origin;
  const TOKEN_KEY = 'theweb_crm_token';

  const STATUS_LABELS = {
    new: 'Nuevo', read: 'Leído', replied: 'Respondido', archived: 'Archivado',
    lead: 'Lead', proposal: 'Propuesta', in_progress: 'En progreso',
    review: 'Revisión', delivered: 'Entregado', on_hold: 'En pausa', cancelled: 'Cancelado',
    prospect: 'Prospecto', customer: 'Cliente', inactive: 'Inactivo',
    open: 'Abierta', pending: 'Pendiente', resolved: 'Resuelta',
  };

  const SERVICE_LABELS = { core: 'TheWeb Core', agents: 'TheWeb Agents', marketing: 'Marketing', other: 'Otro' };

  const ACTIVITY_LABELS = {
    call: 'Llamada', whatsapp: 'WhatsApp', email: 'Email', meeting: 'Reunión',
    note: 'Nota interna', follow_up: 'Seguimiento', proposal: 'Propuesta',
    demo: 'Demo', contract: 'Contrato', payment: 'Pago', delivery: 'Entrega', other: 'Otro',
  };

  const ACTIVITY_ICONS = {
    call: '📞', whatsapp: '💬', email: '✉️', meeting: '📅', note: '📝',
    follow_up: '🔔', proposal: '📄', demo: '🖥️', contract: '✍️', payment: '💰', delivery: '📦', other: '•',
  };

  const DIRECTION_LABELS = { inbound: 'Cliente → Nosotros', outbound: 'Nosotros → Cliente', internal: 'Interno' };

  const OUTCOME_LABELS = {
    positive: 'Positivo', neutral: 'Neutral', negative: 'No interesado',
    no_answer: 'Sin respuesta', follow_up_scheduled: 'Seguimiento agendado',
    completed: 'Completado', pending: 'Pendiente',
  };

  let state = { admin: null, view: 'dashboard', leadsFilter: 'new', contactsSearch: '', activityFilter: 'all', projectTab: 'activities' };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function token() { return localStorage.getItem(TOKEN_KEY); }

  function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const res = await fetch(`${API}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { logout(); throw new Error('Sesión expirada'); }
    if (!res.ok) throw new Error(data.error || 'Error de servidor');
    return data;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  }

  function badge(status) {
    return `<span class="badge badge-${status}">${STATUS_LABELS[status] || status}</span>`;
  }

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function showLogin() {
    $('#loginScreen').classList.remove('hidden');
    $('#app').classList.add('hidden');
  }

  function showApp() {
    $('#loginScreen').classList.add('hidden');
    $('#app').classList.remove('hidden');
  }

  function logout() {
    setToken(null);
    state.admin = null;
    showLogin();
  }

  async function checkAuth() {
    if (!token()) { showLogin(); return; }
    try {
      const { admin } = await api('/api/auth/me');
      state.admin = admin;
      $('#userName').textContent = admin.name;
      $('#userRole').textContent = admin.role;
      showApp();
      await refreshBadges();
      renderView();
    } catch {
      showLogin();
    }
  }

  async function refreshBadges() {
    try {
      const stats = await api('/api/dashboard/stats');
      const lb = $('#badgeLeads');
      const mb = $('#badgeMessages');
      if (stats.leads.new > 0) {
        lb.textContent = stats.leads.new;
        lb.classList.remove('hidden');
      } else lb.classList.add('hidden');
      if (stats.messages.unread > 0) {
        mb.textContent = stats.messages.unread;
        mb.classList.remove('hidden');
      } else mb.classList.add('hidden');
    } catch { /* ignore */ }
  }

  function setView(view) {
    state.view = view;
    $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    renderView();
  }

  async function renderView() {
    const main = $('#mainContent');
    main.innerHTML = '<p class="empty-state">Cargando…</p>';

    try {
      switch (state.view) {
        case 'dashboard': await renderDashboard(main); break;
        case 'leads': await renderLeads(main); break;
        case 'projects': await renderProjects(main); break;
        case 'contacts': await renderContacts(main); break;
        case 'inbox': await renderInbox(main); break;
      }
    } catch (err) {
      main.innerHTML = `<p class="empty-state">${esc(err.message)}</p>`;
    }
  }

  async function renderDashboard(main) {
    const [stats, activity] = await Promise.all([
      api('/api/dashboard/stats'),
      api('/api/dashboard/activity'),
    ]);

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-desc">Resumen de actividad y proyectos</p>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${stats.leads.new}</div><div class="stat-label">Leads nuevos</div></div>
        <div class="stat-card"><div class="stat-value">${stats.projects.active}</div><div class="stat-label">Proyectos activos</div></div>
        <div class="stat-card"><div class="stat-value">${stats.conversations.open}</div><div class="stat-label">Conversaciones abiertas</div></div>
        <div class="stat-card"><div class="stat-value">${stats.messages.unread}</div><div class="stat-label">Mensajes sin leer</div></div>
        <div class="stat-card"><div class="stat-value">${stats.contacts.total}</div><div class="stat-label">Contactos</div></div>
      </div>
      <div class="panel" style="margin-bottom:24px">
        <div class="panel-header"><span class="panel-title">Próximos seguimientos</span></div>
        ${stats.upcomingFollowUps?.length ? `
        <table class="data-table">
          <thead><tr><th>Proyecto</th><th>Cliente</th><th>Actividad</th><th>Fecha</th></tr></thead>
          <tbody>
            ${stats.upcomingFollowUps.map(f => `
              <tr class="clickable" data-follow-project="${f.project_id}">
                <td>${esc(f.project_title)}</td>
                <td>${esc(f.contact_name)}</td>
                <td>${esc(f.subject)}</td>
                <td class="cell-muted">${fmtDate(f.follow_up_at)}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="empty-state">No hay seguimientos programados</p>'}
      </div>
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Actividad reciente</span></div>
        <div class="activity-list">
          ${activity.activity.length ? activity.activity.map(a => activityRow(a)).join('') : '<p class="empty-state">Sin actividad reciente</p>'}
        </div>
      </div>`;

    $$('[data-follow-project]').forEach(row => {
      row.onclick = () => showProjectModal(row.dataset.followProject);
    });
  }

  function activityRow(a) {
    const date = a.created_at || a.updated_at;
    if (a.kind === 'lead') {
      return `<div class="activity-item"><div class="activity-icon">L</div><div class="activity-content"><div class="activity-title">Nuevo lead: ${esc(a.name)}</div><div class="activity-meta">${esc(a.message?.slice(0, 80))} · ${fmtDate(date)}</div></div></div>`;
    }
    if (a.kind === 'message') {
      const dir = a.direction === 'inbound' ? 'Entrante' : 'Saliente';
      return `<div class="activity-item"><div class="activity-icon">M</div><div class="activity-content"><div class="activity-title">${dir} — ${esc(a.contact_name)}</div><div class="activity-meta">${esc(a.body?.slice(0, 80))} · ${fmtDate(date)}</div></div></div>`;
    }
    if (a.kind === 'project_activity') {
      return `<div class="activity-item"><div class="activity-icon">${ACTIVITY_ICONS[a.activity_type] || 'P'}</div><div class="activity-content"><div class="activity-title">${esc(a.subject)}</div><div class="activity-meta">${esc(a.project_title)} · ${esc(a.contact_name)} · ${fmtDate(date)}</div></div></div>`;
    }
    return `<div class="activity-item"><div class="activity-icon">P</div><div class="activity-content"><div class="activity-title">${esc(a.title)}</div><div class="activity-meta">${esc(a.contact_name)} · ${badge(a.status)} · ${fmtDate(date)}</div></div></div>`;
  }

  async function renderLeads(main) {
    const { leads } = await api('/api/leads?limit=100');
    const filters = ['all', 'new', 'read', 'replied', 'archived'];
    const filtered = state.leadsFilter === 'all'
      ? leads
      : leads.filter(l => l.status === state.leadsFilter);

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Leads</h1>
        <p class="page-desc">Mensajes del formulario web</p>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div class="filter-tabs">
            ${filters.map(f => `<button class="filter-tab ${state.leadsFilter === f ? 'active' : ''}" data-lead-filter="${f}">${f === 'all' ? 'Todos' : STATUS_LABELS[f]}</button>`).join('')}
          </div>
        </div>
        ${filtered.length ? `
        <table class="data-table">
          <thead><tr><th>Contacto</th><th>Mensaje</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
          <tbody>
            ${filtered.map(l => `
              <tr>
                <td><strong>${esc(l.name)}</strong><br><span class="cell-muted">${esc(l.email || l.phone || '—')}</span>${l.company ? `<br><span class="cell-muted">${esc(l.company)}</span>` : ''}</td>
                <td class="cell-truncate">${esc(l.message)}</td>
                <td>${badge(l.status)}</td>
                <td class="cell-muted">${fmtDate(l.created_at)}</td>
                <td>
                  <button class="btn btn-yellow-outline btn-sm" data-lead-view="${l.id}">Ver</button>
                  ${l.status === 'new' ? `<button class="btn btn-ghost btn-sm" data-lead-read="${l.id}">Marcar leído</button>` : ''}
                  <button class="btn btn-ghost btn-sm" data-lead-project="${l.id}">→ Proyecto</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="empty-state">No hay leads en este filtro</p>'}
      </div>`;

    $$('[data-lead-filter]').forEach(btn => {
      btn.onclick = () => { state.leadsFilter = btn.dataset.leadFilter; renderLeads(main); };
    });
    $$('[data-lead-read]').forEach(btn => {
      btn.onclick = async () => {
        await api(`/api/leads/${btn.dataset.leadRead}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'read' }) });
        await refreshBadges();
        renderLeads(main);
      };
    });
    $$('[data-lead-project]').forEach(btn => {
      btn.onclick = () => convertLeadToProject(btn.dataset.leadProject);
    });
    $$('[data-lead-view]').forEach(btn => {
      btn.onclick = () => showLeadModal(btn.dataset.leadView, filtered);
    });
  }

  async function showLeadModal(id, leads) {
    const lead = leads.find(l => String(l.id) === String(id));
    if (!lead) return;
    openModal(`
      <div class="modal-header">
        <h2 class="modal-title">Lead — ${esc(lead.name)}</h2>
        <button class="modal-close" data-close-modal>&times;</button>
      </div>
      <div class="modal-body">
        <div class="detail-grid">
          <div class="detail-item"><label>Email</label><span>${esc(lead.email || '—')}</span></div>
          <div class="detail-item"><label>Teléfono</label><span>${esc(lead.phone || '—')}</span></div>
          <div class="detail-item"><label>Empresa</label><span>${esc(lead.company || '—')}</span></div>
          <div class="detail-item"><label>Estado</label><span>${badge(lead.status)}</span></div>
        </div>
        <div class="modal-section" style="margin-top:16px">
          <div class="modal-section-title">Mensaje</div>
          <p style="font-size:0.9rem;color:var(--gray-400)">${esc(lead.message)}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-yellow-outline btn-sm" data-modal-project="${lead.id}">Crear proyecto</button>
          <button class="btn btn-ghost btn-sm" data-modal-read="${lead.id}">Marcar leído</button>
        </div>
      </div>`, 'modal-lg');

    $('[data-modal-project]')?.addEventListener('click', () => { closeModal(); convertLeadToProject(lead.id); });
    $('[data-modal-read]')?.addEventListener('click', async () => {
      await api(`/api/leads/${lead.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'read' }) });
      closeModal(); await refreshBadges(); setView('leads');
    });
  }

  async function convertLeadToProject(leadId) {
    try {
      const { project } = await api(`/api/projects/from-lead/${leadId}`, { method: 'POST', body: '{}' });
      closeModal();
      await refreshBadges();
      showProjectModal(project.id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function renderProjects(main) {
    const { board, statuses } = await api('/api/projects/board');

    main.innerHTML = `
      <div class="page-header" style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px">
        <div>
          <h1 class="page-title">Proyectos</h1>
          <p class="page-desc">Seguimiento por etapa — arrastra mentalmente, cambia estado en detalle</p>
        </div>
        <button class="btn btn-yellow-outline btn-sm" id="newProjectBtn">+ Nuevo proyecto</button>
      </div>
      <div class="kanban">
        ${statuses.filter(s => !['delivered', 'cancelled'].includes(s)).map(status => `
          <div class="kanban-col">
            <div class="kanban-col-header">
              <span class="kanban-col-title">${STATUS_LABELS[status]}</span>
              <span class="kanban-col-count">${(board[status] || []).length}</span>
            </div>
            <div class="kanban-cards">
              ${(board[status] || []).map(p => `
                <div class="kanban-card" data-project-id="${p.id}">
                  <div class="kanban-card-title">${esc(p.title)}</div>
                  <div class="kanban-card-meta">${esc(p.contact_name)}${p.contact_company ? ' · ' + esc(p.contact_company) : ''}</div>
                  <div class="kanban-card-meta">${p.activity_count ? p.activity_count + ' actividad(es)' : 'Sin actividades'}${p.last_activity_at ? ' · ' + fmtDate(p.last_activity_at) : ''}</div>
                  <div class="kanban-card-priority priority-${p.priority}">${p.priority === 'urgent' ? '● Urgente' : p.priority === 'high' ? '● Alta' : ''}</div>
                </div>`).join('') || '<p class="cell-muted" style="padding:8px;font-size:0.75rem">Vacío</p>'}
            </div>
          </div>`).join('')}
      </div>`;

    $$('[data-project-id]').forEach(card => {
      card.onclick = () => showProjectModal(card.dataset.projectId);
    });
    $('#newProjectBtn').onclick = () => showNewProjectModal();
  }

  async function renderContacts(main) {
    const q = state.contactsSearch ? `?search=${encodeURIComponent(state.contactsSearch)}` : '';
    const { contacts } = await api(`/api/contacts${q}`);

    main.innerHTML = `
      <div class="page-header" style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px">
        <div>
          <h1 class="page-title">Contactos</h1>
          <p class="page-desc">Clientes y leads unificados</p>
        </div>
        <input type="search" class="search-input" id="contactSearch" placeholder="Buscar…" value="${esc(state.contactsSearch)}">
      </div>
      <div class="panel">
        ${contacts.length ? `
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Contacto</th><th>Empresa</th><th>Estado</th><th>Origen</th><th></th></tr></thead>
          <tbody>
            ${contacts.map(c => `
              <tr class="clickable" data-contact-id="${c.id}">
                <td><strong>${esc(c.name || '—')}</strong></td>
                <td class="cell-muted">${esc(c.email || c.phone || c.whatsapp_number || '—')}</td>
                <td>${esc(c.company || '—')}</td>
                <td>${badge(c.status)}</td>
                <td><span class="badge badge-${c.source === 'whatsapp' ? 'whatsapp' : 'web'}">${c.source}</span></td>
                <td><button class="btn btn-ghost btn-sm" data-contact-view="${c.id}">Ver</button></td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="empty-state">No hay contactos</p>'}
      </div>`;

    $('#contactSearch')?.addEventListener('input', debounce(e => {
      state.contactsSearch = e.target.value;
      renderContacts(main);
    }, 300));

    $$('[data-contact-view]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); showContactModal(btn.dataset.contactView); };
    });
  }

  async function renderInbox(main) {
    const [{ conversations }, { messages }] = await Promise.all([
      api('/api/messages/conversations?limit=50'),
      api('/api/messages?limit=30'),
    ]);

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Mensajes</h1>
        <p class="page-desc">Conversaciones web y WhatsApp</p>
      </div>
      <div class="panel" style="margin-bottom:24px">
        <div class="panel-header"><span class="panel-title">Conversaciones</span></div>
        ${conversations.length ? `
        <table class="data-table">
          <thead><tr><th>Contacto</th><th>Canal</th><th>Último mensaje</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            ${conversations.map(c => `
              <tr class="clickable" data-conv-id="${c.id}" data-contact-id="${c.contact_id}">
                <td><strong>${esc(c.contact_name || '—')}</strong></td>
                <td><span class="badge badge-${c.channel === 'whatsapp' ? 'whatsapp' : 'web'}">${c.channel}</span></td>
                <td class="cell-truncate cell-muted">${esc(c.last_message || '—')}</td>
                <td>${badge(c.status)}</td>
                <td class="cell-muted">${fmtDate(c.updated_at)}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="empty-state">Sin conversaciones</p>'}
      </div>
      <div class="panel">
        <div class="panel-header"><span class="panel-title">Últimos mensajes</span></div>
        ${messages.length ? `
        <table class="data-table">
          <thead><tr><th>De</th><th>Mensaje</th><th>Canal</th><th>Fecha</th></tr></thead>
          <tbody>
            ${messages.map(m => `
              <tr>
                <td>${esc(m.admin_name || (m.direction === 'inbound' ? 'Cliente' : 'Admin'))}</td>
                <td class="cell-truncate">${esc(m.body)}</td>
                <td><span class="badge badge-${m.channel === 'whatsapp' ? 'whatsapp' : 'web'}">${m.channel}</span></td>
                <td class="cell-muted">${fmtDate(m.created_at)}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="empty-state">Sin mensajes</p>'}
      </div>`;

    $$('[data-conv-id]').forEach(row => {
      row.onclick = () => showConversationModal(row.dataset.convId, row.dataset.contactId);
    });
  }

  async function showContactModal(contactId) {
    const { contact, conversations, interactions } = await api(`/api/contacts/${contactId}`);

    openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${esc(contact.name || 'Contacto')}</h2>
        <button class="modal-close" data-close-modal>&times;</button>
      </div>
      <div class="modal-body">
        <div class="detail-grid">
          <div class="detail-item"><label>Email</label><span>${esc(contact.email || '—')}</span></div>
          <div class="detail-item"><label>Teléfono</label><span>${esc(contact.phone || contact.whatsapp_number || '—')}</span></div>
          <div class="detail-item"><label>Empresa</label><span>${esc(contact.company || '—')}</span></div>
          <div class="detail-item"><label>Estado</label><span>${badge(contact.status)}</span></div>
        </div>
        ${contact.notes ? `<div class="modal-section"><div class="modal-section-title">Notas</div><p style="font-size:0.85rem;color:var(--gray-400)">${esc(contact.notes)}</p></div>` : ''}
        <div class="modal-section">
          <div class="modal-section-title">Interacciones (${interactions.length})</div>
          <div class="timeline">
            ${interactions.slice(0, 10).map(i => `
              <div class="timeline-item">
                <div class="timeline-item-title">${esc(i.title)}</div>
                <div class="timeline-item-meta">${fmtDate(i.created_at)} · ${i.channel}</div>
                ${i.description ? `<div class="timeline-item-body">${esc(i.description)}</div>` : ''}
              </div>`).join('') || '<p class="cell-muted">Sin interacciones</p>'}
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-yellow-outline btn-sm" data-new-proj-contact="${contact.id}">Nuevo proyecto</button>
        </div>
      </div>`, 'modal-lg');

    $('[data-new-proj-contact]')?.addEventListener('click', () => {
      closeModal();
      showNewProjectModal(contact.id, contact.name);
    });
  }

  async function showConversationModal(convId, contactId) {
    const { messages } = await api(`/api/messages?conversationId=${convId}&limit=50`);
    const contact = (await api(`/api/contacts/${contactId}`)).contact;

    openModal(`
      <div class="modal-header">
        <h2 class="modal-title">Conversación — ${esc(contact.name)}</h2>
        <button class="modal-close" data-close-modal>&times;</button>
      </div>
      <div class="modal-body">
        <div class="timeline" style="max-height:360px">
          ${messages.reverse().map(m => `
            <div class="timeline-item" style="border-left-color:${m.direction === 'inbound' ? 'var(--yellow)' : 'var(--gray-600)'}">
              <div class="timeline-item-title">${m.direction === 'inbound' ? 'Cliente' : esc(m.admin_name || 'Equipo')}</div>
              <div class="timeline-item-body">${esc(m.body)}</div>
              <div class="timeline-item-meta">${fmtDate(m.created_at)} · ${m.channel}</div>
            </div>`).join('')}
        </div>
        <div class="modal-section" style="margin-top:16px">
          <div class="modal-section-title">Responder</div>
          <div class="form-field"><textarea id="replyBody" rows="3" placeholder="Escribe tu respuesta…"></textarea></div>
          <button class="btn btn-yellow-outline btn-sm" id="sendReplyBtn">Enviar respuesta</button>
        </div>
      </div>`, 'modal-lg');

    $('#sendReplyBtn').onclick = async () => {
      const body = $('#replyBody').value.trim();
      if (!body) return;
      await api('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ conversationId: convId, contactId, body, channel: messages[0]?.channel || 'web' }),
      });
      closeModal();
      setView('inbox');
    };
  }

  async function showProjectModal(projectId) {
    const data = await api(`/api/projects/${projectId}`);
    const { project, activities, activityStats } = data;
    const statuses = ['lead', 'proposal', 'in_progress', 'review', 'delivered', 'on_hold', 'cancelled'];

    const filteredActivities = state.activityFilter === 'all'
      ? activities
      : activities.filter(a => a.activity_type === state.activityFilter);

    openModal(`
      <div class="modal-header project-modal-header">
        <div>
          <h2 class="modal-title">${esc(project.title)}</h2>
          <p class="project-modal-client">${esc(project.contact_name)}${project.contact_company ? ' · ' + esc(project.contact_company) : ''}</p>
        </div>
        <button class="modal-close" data-close-modal>&times;</button>
      </div>
      <div class="modal-body project-modal-body">
        <div class="project-layout">
          <aside class="project-sidebar">
            <div class="project-stat-cards">
              <div class="project-stat"><span class="project-stat-label">Último contacto</span><span class="project-stat-value">${activityStats.lastContactAt ? fmtDate(activityStats.lastContactAt) : '—'}</span></div>
              <div class="project-stat"><span class="project-stat-label">Próximo seguimiento</span><span class="project-stat-value ${activityStats.nextFollowUp ? 'highlight' : ''}">${activityStats.nextFollowUp ? fmtDate(activityStats.nextFollowUp.follow_up_at) : '—'}</span></div>
              <div class="project-stat"><span class="project-stat-label">Actividades</span><span class="project-stat-value">${activityStats.total}</span></div>
            </div>
            <div class="form-field">
              <label>Estado del proyecto</label>
              <select id="projectStatus">${statuses.map(s => `<option value="${s}" ${s === project.status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}</select>
            </div>
            <div class="detail-grid project-mini-details">
              <div class="detail-item"><label>Servicio</label><span>${SERVICE_LABELS[project.service_type] || project.service_type}</span></div>
              <div class="detail-item"><label>Prioridad</label><span class="priority-${project.priority}">${project.priority}</span></div>
              <div class="detail-item"><label>Presupuesto</label><span>${esc(project.budget || '—')}</span></div>
              <div class="detail-item"><label>Entrega</label><span>${project.deadline || '—'}</span></div>
            </div>
            ${project.description ? `<div class="project-desc-box"><label>Descripción</label><p>${esc(project.description)}</p></div>` : ''}
          </aside>

          <div class="project-main">
            <div class="activity-quick-bar">
              ${Object.entries(ACTIVITY_LABELS).slice(0, 6).map(([k, v]) =>
                `<button type="button" class="activity-quick-btn" data-quick-type="${k}">${ACTIVITY_ICONS[k]} ${v}</button>`
              ).join('')}
            </div>

            <div class="activity-form-panel" id="activityFormPanel">
              <div class="modal-section-title">Registrar actividad</div>
              <form id="activityForm" class="activity-form">
                <div class="activity-form-row">
                  <div class="form-field">
                    <label>Tipo *</label>
                    <select name="activityType" id="activityType">
                      ${Object.entries(ACTIVITY_LABELS).map(([k, v]) => `<option value="${k}">${ACTIVITY_ICONS[k]} ${v}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-field">
                    <label>Dirección</label>
                    <select name="direction">
                      ${Object.entries(DIRECTION_LABELS).map(([k, v]) => `<option value="${k}" ${k === 'outbound' ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-field">
                    <label>Resultado</label>
                    <select name="outcome">
                      <option value="">—</option>
                      ${Object.entries(OUTCOME_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
                    </select>
                  </div>
                </div>
                <div class="form-field">
                  <label>Asunto *</label>
                  <input name="subject" required placeholder="Ej. Llamada de seguimiento — cotización web">
                </div>
                <div class="form-field">
                  <label>Resumen de la actividad</label>
                  <textarea name="summary" rows="2" placeholder="Qué se trató en general…"></textarea>
                </div>
                <div class="activity-form-row activity-form-quotes">
                  <div class="form-field">
                    <label>Qué dijo el cliente</label>
                    <textarea name="clientSaid" rows="3" placeholder="Palabras o puntos clave del cliente…"></textarea>
                  </div>
                  <div class="form-field">
                    <label>Qué respondimos / próximos pasos</label>
                    <textarea name="weSaid" rows="3" placeholder="Tu respuesta, compromisos, acuerdos…"></textarea>
                  </div>
                </div>
                <div class="activity-form-row">
                  <div class="form-field">
                    <label>Duración (min)</label>
                    <input type="number" name="durationMinutes" min="0" placeholder="15">
                  </div>
                  <div class="form-field">
                    <label>Próximo seguimiento</label>
                    <input type="datetime-local" name="followUpAt">
                  </div>
                </div>
                <button type="submit" class="btn btn-yellow-outline btn-sm">Guardar actividad</button>
              </form>
            </div>

            <div class="activity-feed-header">
              <span class="modal-section-title">Historial de actividades</span>
              <div class="filter-tabs activity-filters">
                <button type="button" class="filter-tab ${state.activityFilter === 'all' ? 'active' : ''}" data-act-filter="all">Todas</button>
                ${['call', 'whatsapp', 'email', 'meeting', 'proposal'].map(t =>
                  `<button type="button" class="filter-tab ${state.activityFilter === t ? 'active' : ''}" data-act-filter="${t}">${ACTIVITY_ICONS[t]} ${ACTIVITY_LABELS[t]}</button>`
                ).join('')}
              </div>
            </div>

            <div class="activity-feed">
              ${filteredActivities.length ? filteredActivities.map(a => activityCard(a)).join('') : '<p class="empty-state" style="padding:24px">Sin actividades. Registra la primera llamada o mensaje.</p>'}
            </div>
          </div>
        </div>
      </div>`, 'modal-full');

    $('#projectStatus').onchange = async (e) => {
      await api(`/api/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) });
      showProjectModal(projectId);
    };

    $$('[data-quick-type]').forEach(btn => {
      btn.onclick = () => {
        $('#activityType').value = btn.dataset.quickType;
        $('#activityFormPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('[name="subject"]', '#activityForm')?.focus();
      };
    });

    $$('[data-act-filter]').forEach(btn => {
      btn.onclick = () => {
        state.activityFilter = btn.dataset.actFilter;
        showProjectModal(projectId);
      };
    });

    $('#activityForm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const followUpRaw = fd.get('followUpAt');
      await api(`/api/projects/${projectId}/activities`, {
        method: 'POST',
        body: JSON.stringify({
          activityType: fd.get('activityType'),
          direction: fd.get('direction'),
          outcome: fd.get('outcome') || undefined,
          subject: fd.get('subject'),
          summary: fd.get('summary') || undefined,
          clientSaid: fd.get('clientSaid') || undefined,
          weSaid: fd.get('weSaid') || undefined,
          durationMinutes: fd.get('durationMinutes') || undefined,
          followUpAt: followUpRaw ? new Date(followUpRaw).toISOString() : undefined,
        }),
      });
      state.activityFilter = 'all';
      showProjectModal(projectId);
    };
  }

  function activityCard(a) {
    const outcomeBadge = a.outcome
      ? `<span class="activity-outcome outcome-${a.outcome}">${OUTCOME_LABELS[a.outcome] || a.outcome}</span>`
      : '';
    return `
      <article class="activity-card" data-activity-id="${a.id}">
        <div class="activity-card-icon">${ACTIVITY_ICONS[a.activity_type] || '•'}</div>
        <div class="activity-card-body">
          <div class="activity-card-top">
            <strong class="activity-card-subject">${esc(a.subject)}</strong>
            ${outcomeBadge}
          </div>
          <div class="activity-card-meta">
            ${ACTIVITY_LABELS[a.activity_type] || a.activity_type}
            · ${DIRECTION_LABELS[a.direction] || a.direction}
            · ${esc(a.admin_name || 'Equipo')}
            · ${fmtDate(a.created_at)}
            ${a.duration_minutes ? ` · ${a.duration_minutes} min` : ''}
          </div>
          ${a.summary ? `<p class="activity-card-summary">${esc(a.summary)}</p>` : ''}
          ${a.client_said ? `<blockquote class="activity-quote activity-quote-client"><span>Cliente:</span> ${esc(a.client_said)}</blockquote>` : ''}
          ${a.we_said ? `<blockquote class="activity-quote activity-quote-we"><span>Nosotros:</span> ${esc(a.we_said)}</blockquote>` : ''}
          ${a.follow_up_at ? `<p class="activity-follow-up">🔔 Seguimiento: ${fmtDate(a.follow_up_at)}</p>` : ''}
        </div>
      </article>`;
  }

  async function showNewProjectModal(contactId = '', contactName = '') {
    let contacts = [];
    if (!contactId) {
      const res = await api('/api/contacts?limit=100');
      contacts = res.contacts;
    }

    openModal(`
      <div class="modal-header">
        <h2 class="modal-title">Nuevo proyecto</h2>
        <button class="modal-close" data-close-modal>&times;</button>
      </div>
      <div class="modal-body">
        <form id="newProjectForm">
          ${contactId ? `<input type="hidden" name="contactId" value="${contactId}">` : `
          <div class="form-field">
            <label>Cliente *</label>
            <select name="contactId" required>
              <option value="">Seleccionar…</option>
              ${contacts.map(c => `<option value="${c.id}">${esc(c.name || c.email || 'Contacto #' + c.id)}</option>`).join('')}
            </select>
          </div>`}
          <div class="form-field"><label>Título *</label><input name="title" required placeholder="Sitio web + agente IA" value="${contactName ? esc('Proyecto — ' + contactName) : ''}"></div>
          <div class="form-field"><label>Descripción</label><textarea name="description" rows="3"></textarea></div>
          <div class="form-field">
            <label>Servicio</label>
            <select name="serviceType">
              <option value="core">TheWeb Core</option>
              <option value="agents">TheWeb Agents</option>
              <option value="marketing">Marketing</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div class="form-field"><label>Entrega estimada</label><input type="date" name="deadline"></div>
          <div class="form-field"><label>Presupuesto</label><input name="budget" placeholder="$0 MXN"></div>
          <button type="submit" class="btn btn-primary" style="width:auto;margin-top:8px">Crear proyecto</button>
        </form>
      </div>`);

    $('#newProjectForm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        contactId: parseInt(fd.get('contactId'), 10),
        title: fd.get('title'),
        description: fd.get('description') || undefined,
        serviceType: fd.get('serviceType'),
        deadline: fd.get('deadline') || undefined,
        budget: fd.get('budget') || undefined,
      };
      const { project } = await api('/api/projects', { method: 'POST', body: JSON.stringify(payload) });
      closeModal();
      setView('projects');
      setTimeout(() => showProjectModal(project.id), 300);
    };
  }

  function openModal(html, cls = '') {
    const overlay = $('#modalOverlay');
    const modal = $('#modal');
    modal.className = 'modal' + (cls ? ' ' + cls : '');
    modal.innerHTML = html;
    overlay.classList.remove('hidden');
    $('[data-close-modal]')?.addEventListener('click', closeModal);
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  }

  function closeModal() {
    $('#modalOverlay').classList.add('hidden');
    $('#modal').innerHTML = '';
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginError').textContent = '';
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: $('#loginEmail').value.trim(),
          password: $('#loginPassword').value,
          gate: $('#loginGate') ? $('#loginGate').value.trim() : undefined,
        }),
      });
      setToken(data.token);
      state.admin = data.admin;
      $('#userName').textContent = data.admin.name;
      $('#userRole').textContent = data.admin.role;
      showApp();
      await refreshBadges();
      setView('dashboard');
    } catch (err) {
      $('#loginError').textContent = err.message || 'Error al ingresar';
    }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    logout();
  });

  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  checkAuth();
})();
