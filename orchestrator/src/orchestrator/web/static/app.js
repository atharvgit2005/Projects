// Antigravity Orchestrator Frontend Client
let currentStatus = null;
let tasks = [];
let runs = [];
let selectedTaskId = null;
let selectedRunId = null;
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  fetchStatus();
  fetchTasks();
  fetchRuns();
  fetchLogs();

  // Polling loop
  setInterval(() => {
    fetchStatus();
    fetchTasks();
    fetchRuns();
  }, 2000);

  setInterval(() => {
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, 3000);
});

function initEventListeners() {
  // Global buttons
  document.getElementById('btn-run-loop')?.addEventListener('click', runAutonomousLoop);
  document.getElementById('btn-stop-loop')?.addEventListener('click', stopLoop);
  document.getElementById('btn-verify-now')?.addEventListener('click', runVerifyNow);
  document.getElementById('btn-new-task')?.addEventListener('click', openTaskModal);
  document.getElementById('btn-modal-close')?.addEventListener('click', closeTaskModal);
  document.getElementById('btn-modal-cancel')?.addEventListener('click', closeTaskModal);
  document.getElementById('form-create-task')?.addEventListener('submit', handleCreateTask);

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderTasks();
    });
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      
      const tabTarget = e.currentTarget.dataset.tab;
      e.currentTarget.classList.add('active');
      document.getElementById(`tab-${tabTarget}`)?.classList.add('active');

      if (tabTarget === 'logs') {
        fetchLogs();
      }
    });
  });
}

// Fetchers
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    currentStatus = data;
    updateStatusUI(data);
  } catch (err) {
    console.error('Failed to fetch status:', err);
  }
}

async function fetchTasks() {
  try {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    tasks = data.tasks || [];
    renderTasks();
    updateTaskCounts();
  } catch (err) {
    console.error('Failed to fetch tasks:', err);
  }
}

async function fetchRuns() {
  try {
    const res = await fetch('/api/runs');
    const data = await res.json();
    runs = data.runs || [];
    renderRuns();
    
    // Auto-select latest run if none selected
    if (!selectedRunId && runs.length > 0) {
      inspectRun(runs[0].run_id);
    }
  } catch (err) {
    console.error('Failed to fetch runs:', err);
  }
}

async function fetchLogs() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    const container = document.getElementById('terminal-logs');
    if (!container) return;

    if (!data.lines || data.lines.length === 0) {
      container.innerHTML = '<div class="terminal-line" style="color: #64748B;">No execution logs found.</div>';
      return;
    }

    container.innerHTML = data.lines.map(line => {
      let cls = 'info';
      if (line.includes('[PASSED]') || line.includes('[REVIEW_PASS]') || line.includes('[COMPLETED]')) cls = 'success';
      if (line.includes('[REVIEW_FAIL]') || line.includes('[RETRY]')) cls = 'warn';
      if (line.includes('[BLOCKED]') || line.includes('[ERROR]') || line.includes('[AGENT_FAILED]')) cls = 'error';
      return `<div class="terminal-line ${cls}">${escapeHtml(line)}</div>`;
    }).join('');

    container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error('Failed to fetch logs:', err);
  }
}

// UI Updates
function updateStatusUI(data) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const runBtn = document.getElementById('btn-run-loop');
  const stopBtn = document.getElementById('btn-stop-loop');
  const projPath = document.getElementById('project-path-text');

  if (projPath && data.project_dir) {
    projPath.textContent = data.project_dir.split('/').slice(-2).join('/');
    projPath.title = data.project_dir;
  }

  // Update pipeline visualizer active stage
  const curStatus = data.state?.current_status || 'IDLE';
  updatePipelineStages(curStatus, data.is_running);

  if (data.is_running) {
    dot.className = 'status-dot running';
    text.textContent = `RUNNING (${data.running_task_id || 'Active'})`;
    runBtn.disabled = true;
    stopBtn.style.display = 'inline-flex';
  } else {
    stopBtn.style.display = 'none';
    runBtn.disabled = false;
    if (curStatus === 'BLOCKED') {
      dot.className = 'status-dot blocked';
      text.textContent = 'BLOCKED (Intervention Required)';
    } else {
      dot.className = 'status-dot idle';
      text.textContent = 'READY';
    }
  }
}

function updatePipelineStages(status, isRunning) {
  const stages = {
    'step-spec': ['READY', 'PLANNING', 'PENDING'],
    'step-agent': ['IMPLEMENTING'],
    'step-verif': ['VERIFYING'],
    'step-review': ['REVIEWING', 'PASSED', 'COMPLETED', 'BLOCKED']
  };

  for (const [id, activeStatuses] of Object.entries(stages)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (isRunning && activeStatuses.includes(status)) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }
}

function updateTaskCounts() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'COMPLETED').length;
  const blocked = tasks.filter(t => t.status === 'BLOCKED').length;
  const pending = tasks.filter(t => ['READY', 'PLANNING', 'PENDING'].includes(t.status)).length;

  document.getElementById('task-total-badge').textContent = `${completed}/${total}`;
}

function renderTasks() {
  const container = document.getElementById('task-list');
  if (!container) return;

  const filtered = tasks.filter(t => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'in_progress') return ['IMPLEMENTING', 'VERIFYING', 'REVIEWING'].includes(t.status);
    if (currentFilter === 'blocked') return t.status === 'BLOCKED';
    if (currentFilter === 'completed') return t.status === 'COMPLETED';
    if (currentFilter === 'pending') return ['READY', 'PLANNING', 'PENDING'].includes(t.status);
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding: 2rem; color: #64748B; font-size: 0.85rem;">No tasks match the filter.</div>';
    return;
  }

  container.innerHTML = filtered.map(t => {
    const isSel = t.id === selectedTaskId;
    const badgeCls = `badge-${t.status.toLowerCase()}`;
    return `
      <div class="task-card ${isSel ? 'selected' : ''}" onclick="selectTask('${t.id}')">
        <div class="task-card-top">
          <span class="task-id">${escapeHtml(t.id)}</span>
          <span class="status-badge ${badgeCls}">${t.status}</span>
        </div>
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-card-footer">
          <span>Attempt: ${t.attempt}/${t.max_attempts}</span>
          ${t.status === 'BLOCKED' ? `<button class="btn btn-sm btn-danger" onclick="approveTask(event, '${t.id}')">Approve</button>` : ''}
          ${['READY', 'PLANNING', 'PENDING', 'BLOCKED'].includes(t.status) ? `<button class="btn btn-sm btn-secondary" onclick="runSingleTask(event, '${t.id}')">Run</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function selectTask(taskId) {
  selectedTaskId = taskId;
  renderTasks();
  
  // Find latest run for this task
  const run = runs.find(r => r.task_id === taskId);
  if (run) {
    inspectRun(run.run_id);
  } else {
    // Show task spec in overview
    const task = tasks.find(t => t.id === taskId);
    if (task) renderTaskSpecOverview(task);
  }
}

function renderTaskSpecOverview(task) {
  document.getElementById('inspector-title').textContent = `Task: ${task.id} (${task.status})`;
  const pane = document.getElementById('tab-overview');
  pane.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.5); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
      <h3 style="margin-bottom: 0.5rem;">${escapeHtml(task.title)}</h3>
      <p style="color: #94A3B8; margin-bottom: 1rem;">${escapeHtml(task.objective)}</p>
      
      <div style="margin-bottom: 1rem;">
        <strong style="color: #38BDF8; font-size: 0.8rem; text-transform: uppercase;">Requirements:</strong>
        <ul style="margin-top: 0.25rem; padding-left: 1.25rem; color: #CBD5E1; font-size: 0.85rem;">
          ${(task.requirements || []).map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-bottom: 1rem;">
        <strong style="color: #38BDF8; font-size: 0.8rem; text-transform: uppercase;">Acceptance Criteria:</strong>
        <ul style="margin-top: 0.25rem; padding-left: 1.25rem; color: #CBD5E1; font-size: 0.85rem;">
          ${(task.acceptance_criteria || []).map(a => `<li>${escapeHtml(a)}</li>`).join('')}
        </ul>
      </div>

      <button class="btn btn-primary" onclick="runSingleTask(event, '${task.id}')">▶ Run This Task</button>
    </div>
  `;
}

function renderRuns() {
  const container = document.getElementById('history-list');
  if (!container) return;

  if (runs.length === 0) {
    container.innerHTML = '<div style="color: #64748B; font-size: 0.85rem;">No execution runs recorded yet.</div>';
    return;
  }

  container.innerHTML = runs.slice(0, 10).map(r => {
    const isSel = r.run_id === selectedRunId;
    const isPass = r.status === 'PASS';
    const isFail = r.status === 'FAIL';
    const color = isPass ? 'var(--status-pass)' : (isFail ? 'var(--status-fail)' : 'var(--accent-cyan)');

    return `
      <div class="history-card ${isSel ? 'selected' : ''}" onclick="inspectRun('${r.run_id}')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-family:'JetBrains Mono'; font-size:0.75rem; color:${color}; font-weight:700;">${r.run_id}</span>
          <span class="status-badge ${isPass ? 'badge-completed' : 'badge-blocked'}">${r.status || 'RUN'}</span>
        </div>
        <div style="font-size:0.8rem; font-weight:600;">Task: ${escapeHtml(r.task_id || 'N/A')}</div>
        <div style="font-size:0.7rem; color: var(--text-dim);">${(r.created_at || '').substring(0, 19)}</div>
      </div>
    `;
  }).join('');
}

async function inspectRun(runId) {
  selectedRunId = runId;
  document.querySelectorAll('.history-card').forEach(c => c.classList.remove('selected'));
  renderRuns();

  try {
    const res = await fetch(`/api/runs/${runId}`);
    if (!res.ok) return;
    const data = await res.json();
    renderRunDetails(data);
  } catch (err) {
    console.error('Failed to load run details:', err);
  }
}

function renderRunDetails(data) {
  document.getElementById('inspector-title').textContent = `Run: ${data.run_id} (${data.summary?.status || 'Active'})`;

  // Overview Tab
  const overviewPane = document.getElementById('tab-overview');
  overviewPane.innerHTML = `
    <div class="verif-card">
      <div class="verif-header">
        <h4 style="font-size: 0.95rem;">Run Summary</h4>
        <span class="status-badge ${data.summary?.status === 'PASS' ? 'badge-completed' : 'badge-blocked'}">${data.summary?.status || 'N/A'}</span>
      </div>
      <div class="test-metric-grid">
        <div class="metric-pill">
          <div class="metric-pill-val" style="color: #38BDF8;">${data.summary?.task_id || 'N/A'}</div>
          <div class="metric-pill-label">Task ID</div>
        </div>
        <div class="metric-pill">
          <div class="metric-pill-val">${data.summary?.attempt || 1}</div>
          <div class="metric-pill-label">Attempt</div>
        </div>
        <div class="metric-pill">
          <div class="metric-pill-val" style="color: ${data.verification?.status === 'PASSED' ? 'var(--status-pass)' : 'var(--status-fail)'};">${data.verification?.status || 'N/A'}</div>
          <div class="metric-pill-label">Verification</div>
        </div>
        <div class="metric-pill">
          <div class="metric-pill-val" style="color: ${data.review?.decision === 'PASS' ? 'var(--status-pass)' : 'var(--status-fail)'};">${data.review?.decision || 'N/A'}</div>
          <div class="metric-pill-label">Senior Review</div>
        </div>
      </div>
      <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;">${escapeHtml(data.review?.summary || data.summary?.review_result?.summary || 'No reviewer summary available.')}</p>
    </div>
  `;

  // Diff Tab
  const diffPane = document.getElementById('tab-diff');
  if (data.git_diff && data.git_diff.trim()) {
    diffPane.innerHTML = `
      <div class="diff-container">
        ${data.git_diff.split('\n').map(line => {
          let cls = '';
          if (line.startsWith('+') && !line.startsWith('+++')) cls = 'addition';
          else if (line.startsWith('-') && !line.startsWith('---')) cls = 'deletion';
          else if (line.startsWith('@@') || line.startsWith('diff --git')) cls = 'header';
          return `<span class="diff-line ${cls}">${escapeHtml(line)}</span>`;
        }).join('')}
      </div>
    `;
  } else {
    diffPane.innerHTML = '<div style="color: #64748B; padding: 2rem; text-align: center;">No unified diff generated for this run.</div>';
  }

  // Verification Tab
  const verifPane = document.getElementById('tab-verification');
  if (data.verification) {
    const v = data.verification;
    verifPane.innerHTML = `
      <div class="verif-card">
        <div class="verif-header">
          <h4 style="font-size: 0.95rem;">Objective Evidence Suite</h4>
          <span class="status-badge ${v.status === 'PASSED' ? 'badge-completed' : 'badge-blocked'}">${v.status} (${v.duration_ms}ms)</span>
        </div>
        <div class="test-metric-grid">
          <div class="metric-pill"><div class="metric-pill-val" style="color: var(--status-pass);">${v.tests?.passed || 0}</div><div class="metric-pill-label">Passed</div></div>
          <div class="metric-pill"><div class="metric-pill-val" style="color: var(--status-fail);">${v.tests?.failed || 0}</div><div class="metric-pill-label">Failed</div></div>
          <div class="metric-pill"><div class="metric-pill-val">${v.tests?.errors || 0}</div><div class="metric-pill-label">Errors</div></div>
          <div class="metric-pill"><div class="metric-pill-val">${v.tests?.skipped || 0}</div><div class="metric-pill-label">Skipped</div></div>
        </div>
        <div class="checks-list">
          ${(v.checks || []).map(c => `
            <div class="check-item ${c.status === 'PASSED' ? 'passed' : 'failed'}">
              <span><strong>${escapeHtml(c.name)}</strong>: ${escapeHtml(c.command)}</span>
              <span>Exit ${c.exit_code} (${c.duration_ms}ms)</span>
            </div>
            ${c.stderr ? `<pre style="background: #0B0F19; padding: 0.5rem; border-radius: 4px; font-size: 0.72rem; color: #FDA4AF; overflow-x: auto;">${escapeHtml(c.stderr)}</pre>` : ''}
            ${c.stdout ? `<pre style="background: #0B0F19; padding: 0.5rem; border-radius: 4px; font-size: 0.72rem; color: #CBD5E1; overflow-x: auto;">${escapeHtml(c.stdout)}</pre>` : ''}
          `).join('')}
        </div>
      </div>
    `;
  } else {
    verifPane.innerHTML = '<div style="color: #64748B; padding: 2rem; text-align: center;">No verification results recorded.</div>';
  }

  // Review Tab
  const reviewPane = document.getElementById('tab-reviewer');
  const reviewData = data.review;
  reviewPane.innerHTML = `
    <div class="reviewer-card">
      ${reviewData ? `
        <div class="reviewer-decision-row">
          <div class="decision-large" style="color: ${reviewData.decision === 'PASS' ? 'var(--status-pass)' : 'var(--status-fail)'};">
            <span>${reviewData.decision === 'PASS' ? '✓' : '✗'}</span> ${reviewData.decision}
          </div>
          <span style="font-family: 'JetBrains Mono'; font-size: 0.8rem; color: var(--text-dim);">Confidence: ${(reviewData.confidence * 100).toFixed(0)}%</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 1rem;">${escapeHtml(reviewData.summary)}</p>

        ${(reviewData.issues && reviewData.issues.length > 0) ? `
          <h5 style="color: #FDA4AF; font-size: 0.85rem; margin-top: 1rem;">Issues Found (${reviewData.issues.length})</h5>
          ${reviewData.issues.map(i => `
            <div class="issue-card">
              <span class="issue-badge">[${i.severity.toUpperCase()}] ${escapeHtml(i.category || 'Issue')}</span>
              <div style="font-size: 0.85rem; font-weight: 600;">${escapeHtml(i.description)}</div>
              ${i.required_fix ? `<div class="issue-fix">Required Fix: ${escapeHtml(i.required_fix)}</div>` : ''}
            </div>
          `).join('')}
        ` : '<div style="color: var(--status-pass); font-size: 0.85rem;">✓ No blocking issues found. Code accepted.</div>'}
      ` : '<div style="color: var(--text-dim); margin-bottom: 1rem;">No automated review recorded yet. You can review via your open browser tab below:</div>'}

      <!-- Browser Session Review Bridge -->
      <div style="margin-top: 1.5rem; padding: 1.25rem; background: rgba(0, 0, 0, 0.4); border-radius: 10px; border: 1px solid var(--border-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
          <div style="font-weight: 700; font-size: 0.85rem; color: #38BDF8; display: flex; align-items: center; gap: 0.4rem;">
            <span>🌐</span> Browser Session Review Bridge (Claude.ai / ChatGPT)
          </div>
          <button class="btn btn-sm btn-primary" onclick="copyReviewPromptForBrowser('${data.run_id}')">📋 Copy Review Prompt for Browser</button>
        </div>
        <p style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 0.75rem; line-height: 1.4;">
          1. Click <strong>Copy Review Prompt</strong> above.<br>
          2. Paste it into your open Claude.ai or ChatGPT browser tab.<br>
          3. Paste Claude / ChatGPT's response below and submit:
        </p>
        <textarea id="browser-review-input" class="form-textarea" style="width: 100%; min-height: 80px; font-size: 0.75rem; font-family: 'JetBrains Mono';" placeholder="Paste Claude / ChatGPT's JSON or response text here..."></textarea>
        <div style="display: flex; justify-content: flex-end; margin-top: 0.75rem;">
          <button class="btn btn-sm btn-success" onclick="submitBrowserReview('${data.run_id}')">✓ Submit Review Decision</button>
        </div>
      </div>
    </div>
  `;
}

// Action Handlers
async function runAutonomousLoop() {
  showToast('Starting autonomous orchestration loop...', 'info');
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start run');
    showToast('Autonomous loop running', 'success');
    fetchStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function runSingleTask(e, taskId) {
  e.stopPropagation();
  showToast(`Running task ${taskId}...`, 'info');
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start task');
    showToast(`Task ${taskId} is executing`, 'success');
    fetchStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function stopLoop() {
  try {
    const res = await fetch('/api/stop', { method: 'POST' });
    const data = await res.json();
    showToast(data.message || 'Loop halted', 'info');
    fetchStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function approveTask(e, taskId) {
  e.stopPropagation();
  try {
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(`Task ${taskId} marked COMPLETED`, 'success');
    fetchStatus();
    fetchTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function runVerifyNow() {
  showToast('Running project verification suite...', 'info');
  try {
    const res = await fetch('/api/verify', { method: 'POST' });
    const data = await res.json();
    const isPass = data.status === 'PASSED';
    showToast(`Verification: ${data.status} (${data.duration_ms}ms)`, isPass ? 'success' : 'error');
    
    // Switch to verification tab and show result
    document.querySelector('.tab-btn[data-tab="verification"]')?.click();
    renderRunDetails({ verification: data, summary: { status: data.status } });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openTaskModal() {
  document.getElementById('task-modal').classList.add('open');
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.remove('open');
}

async function handleCreateTask(e) {
  e.preventDefault();
  const taskId = document.getElementById('input-task-id').value.trim();
  const title = document.getElementById('input-task-title').value.trim();
  const objective = document.getElementById('input-task-objective').value.trim();
  const reqs = document.getElementById('input-task-reqs').value.split('\n').filter(s => s.trim());
  const criteria = document.getElementById('input-task-criteria').value.split('\n').filter(s => s.trim());
  const maxAttempts = parseInt(document.getElementById('input-task-attempts').value, 10) || 3;

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: taskId,
        title,
        objective,
        requirements: reqs,
        acceptance_criteria: criteria,
        max_attempts: maxAttempts
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`Task ${taskId} created successfully`, 'success');
    closeTaskModal();
    document.getElementById('form-create-task').reset();
    fetchTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function copyReviewPromptForBrowser(runId) {
  try {
    const url = runId ? `/api/review-prompt?run_id=${encodeURIComponent(runId)}` : '/api/review-prompt';
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    await navigator.clipboard.writeText(data.prompt);
    showToast('✓ Review Prompt copied! Paste into Claude or ChatGPT browser tab.', 'success');
  } catch (err) {
    showToast(`Failed to copy prompt: ${err.message}`, 'error');
  }
}

async function submitBrowserReview(runId) {
  const input = document.getElementById('browser-review-input');
  if (!input || !input.value.trim()) {
    showToast('Please paste Claude or ChatGPT response text first.', 'error');
    return;
  }

  showToast('Evaluating review response...', 'info');
  try {
    const res = await fetch('/api/submit-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        run_id: runId,
        raw_text: input.value.trim()
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const dec = data.decision?.decision || 'FAIL';
    showToast(`Decision recorded: ${dec} - ${data.decision?.summary}`, dec === 'PASS' ? 'success' : 'error');
    fetchStatus();
    fetchTasks();
    fetchRuns();
    inspectRun(runId);
  } catch (err) {
    showToast(`Error submitting review: ${err.message}`, 'error');
  }
}
