import './style.css';

// --- State Management ---
let state = {
  employees: [],
  selectedEmployeeId: null,
  minimumSalary: 3300, // Default minimum salary
  editEmployeeId: null, // ID of employee being edited (if any)
  formState: {
    name: '',
    basicSalary: 4000,
    bonuses: [], // Array of active bonuses
    form110: 0 // Invoice amount from Form 110
  }
};

// --- Load State from LocalStorage ---
function loadState() {
  const savedEmployees = localStorage.getItem('calcuconta_employees');
  const savedMinSalary = localStorage.getItem('calcuconta_min_salary');

  if (savedEmployees) {
    try {
      state.employees = JSON.parse(savedEmployees);
    } catch (e) {
      state.employees = [];
    }
  } else {
    state.employees = [];
  }

  // Set default minimum salary to 3300 if stored value is old one or empty
  if (savedMinSalary) {
    const parsedMin = parseFloat(savedMinSalary);
    state.minimumSalary = (parsedMin === 2624) ? 3300 : (parsedMin || 3300);
  } else {
    state.minimumSalary = 3300;
  }

  // Pre-select first employee if list is not empty
  if (state.employees.length > 0) {
    state.selectedEmployeeId = state.employees[0].id;
  }

  // Sync calculations
  recalculateAllEmployees();
}

// --- Save State to LocalStorage ---
function saveStateToStorage() {
  localStorage.setItem('calcuconta_employees', JSON.stringify(state.employees));
  localStorage.setItem('calcuconta_min_salary', state.minimumSalary.toString());
}

// --- Seniority Scale Logic ---
export function getSeniorityPercentage(years) {
  if (years < 2) return 0;
  if (years >= 2 && years < 5) return 5;
  if (years >= 5 && years < 8) return 11;
  if (years >= 8 && years < 11) return 18;
  if (years >= 11 && years < 15) return 26;
  if (years >= 15 && years < 20) return 34;
  if (years >= 20 && years < 25) return 42;
  return 50; // 25+ years
}

// --- Calculation Engine ---
function calculateEmployee(emp) {
  let totalBonuses = 0;
  
  const processedBonuses = (emp.bonuses || []).map(bonus => {
    let calculatedAmount = 0;
    if (bonus.type === 'seniority') {
      const percent = getSeniorityPercentage(bonus.years);
      calculatedAmount = (3 * state.minimumSalary * percent) / 100;
    } else {
      calculatedAmount = bonus.amount || 0;
    }
    totalBonuses += calculatedAmount;
    return {
      ...bonus,
      calculatedAmount: Math.round(calculatedAmount * 100) / 100
    };
  });

  // Total Earned (Haber Básico + Total Bonos)
  const totalEarned = emp.basicSalary + totalBonuses;

  // RC-IVA Calculations
  const aportesLaborales = totalEarned * 0.1271;
  const sueldoNeto = totalEarned - aportesLaborales;
  const dosSmn = state.minimumSalary * 2;
  const importeSalarial = Math.max(0, sueldoNeto - dosSmn);
  const rcIvaBase = importeSalarial * 0.13;
  const deduccionSmn = state.minimumSalary * 0.13; // 13% of 1 SMN
  const form110 = parseFloat(emp.form110) || 0;
  const form110_13 = form110 * 0.13;
  const rcIvaPagar = Math.max(0, rcIvaBase - deduccionSmn - form110_13);

  // Líquido Pagable (Total Ganado - Aportes Laborales - RC-IVA a Pagar)
  const liquidoPagable = totalEarned - aportesLaborales - rcIvaPagar;

  // Aporte Patronal (Total Ganado * 32.37%)
  const aportePatronal = totalEarned * 0.3237;

  return {
    ...emp,
    bonuses: processedBonuses,
    totalBonuses: Math.round(totalBonuses * 100) / 100,
    totalEarned: Math.round(totalEarned * 100) / 100,
    aportesLaborales: Math.round(aportesLaborales * 100) / 100,
    sueldoNeto: Math.round(sueldoNeto * 100) / 100,
    dosSmn: Math.round(dosSmn * 100) / 100,
    importeSalarial: Math.round(importeSalarial * 100) / 100,
    rcIvaBase: Math.round(rcIvaBase * 100) / 100,
    deduccionSmn: Math.round(deduccionSmn * 100) / 100,
    form110: Math.round(form110 * 100) / 100,
    form110_13: Math.round(form110_13 * 100) / 100,
    rcIvaPagar: Math.round(rcIvaPagar * 100) / 100,
    liquidoPagable: Math.round(liquidoPagable * 100) / 100,
    aportePatronal: Math.round(aportePatronal * 100) / 100
  };
}

function recalculateAllEmployees() {
  state.employees = state.employees.map(emp => calculateEmployee(emp));
}

// --- Toast Notification Handler ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  
  // Icon
  const icon = type === 'success' 
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- Get Unique Bonus Columns ---
function getUniqueBonusColumns() {
  const columns = new Set();
  let hasSeniority = false;

  state.employees.forEach(emp => {
    (emp.bonuses || []).forEach(b => {
      if (b.type === 'seniority') {
        hasSeniority = true;
      } else if (b.name) {
        columns.add(b.name.trim());
      }
    });
  });

  const cols = Array.from(columns);
  if (hasSeniority) {
    cols.unshift('Bono de Antigüedad');
  }
  return cols;
}

// --- DOM Rendering Engine ---
function renderApp() {
  const app = document.querySelector('#app');
  
  // Calculate totals for primary table
  const totalBasic = state.employees.reduce((sum, e) => sum + e.basicSalary, 0);
  const totalEarned = state.employees.reduce((sum, e) => sum + e.totalEarned, 0);

  // Calculate totals for RC-IVA table
  const totalAportes = state.employees.reduce((sum, e) => sum + e.aportesLaborales, 0);
  const totalSueldoNeto = state.employees.reduce((sum, e) => sum + e.sueldoNeto, 0);
  const totalDosSmn = state.employees.reduce((sum, e) => sum + e.dosSmn, 0);
  const totalImporteSalarial = state.employees.reduce((sum, e) => sum + e.importeSalarial, 0);
  const totalRcIvaBase = state.employees.reduce((sum, e) => sum + e.rcIvaBase, 0);
  const totalDeduccionSmn = state.employees.reduce((sum, e) => sum + e.deduccionSmn, 0);
  const totalForm110_13 = state.employees.reduce((sum, e) => sum + e.form110_13, 0);
  const totalRcIvaPagar = state.employees.reduce((sum, e) => sum + e.rcIvaPagar, 0);

  // Calculate totals for Líquido Pagable table
  const totalLiquido = state.employees.reduce((sum, e) => sum + e.liquidoPagable, 0);

  // Calculate totals for Aporte Patronal table
  const totalPatronal = state.employees.reduce((sum, e) => sum + e.aportePatronal, 0);

  // Dynamic bonus columns
  const bonusCols = getUniqueBonusColumns();

  // Sum for each dynamic bonus column across all employees
  const bonusSums = bonusCols.map(col => {
    return state.employees.reduce((sum, emp) => {
      const b = (emp.bonuses || []).find(x => {
        if (x.type === 'seniority' && col === 'Bono de Antigüedad') return true;
        return x.type === 'custom' && x.name.trim() === col;
      });
      return sum + (b ? b.calculatedAmount : 0);
    }, 0);
  });

  // Calculate Accounting Entry (Asiento Contable) Cuentas
  const journalRows = [];
  
  if (state.employees.length > 0) {
    // --- DEBE ---
    // 1. Sueldos y Salarios (Haber Básico)
    if (totalBasic > 0) {
      journalRows.push({ account: 'Sueldos y Salarios', debe: totalBasic, haber: 0, indent: false });
    }
    // 2. Bonos (seniority and customs)
    bonusCols.forEach((col, idx) => {
      const sum = bonusSums[idx];
      if (sum > 0) {
        journalRows.push({ account: col, debe: sum, haber: 0, indent: false });
      }
    });
    // 3. Aportes Patronales (Employer contribution cost)
    if (totalPatronal > 0) {
      journalRows.push({ account: 'Aportes Patronales', debe: totalPatronal, haber: 0, indent: false });
    }

    // --- HABER ---
    // 4. Aportes Laborales por Pagar
    if (totalAportes > 0) {
      journalRows.push({ account: 'Aportes Laborales por Pagar', debe: 0, haber: totalAportes, indent: true });
    }
    // 5. RC-IVA Dependientes por Pagar
    if (totalRcIvaPagar > 0) {
      journalRows.push({ account: 'RC-IVA Dependientes por Pagar', debe: 0, haber: totalRcIvaPagar, indent: true });
    }
    // 6. Sueldos y Salarios por Pagar (Líquido Pagable liability)
    if (totalLiquido > 0) {
      journalRows.push({ account: 'Sueldos y Salarios por Pagar', debe: 0, haber: totalLiquido, indent: true });
    }
    // 7. Aportes Patronales por Pagar (Employer liability)
    if (totalPatronal > 0) {
      journalRows.push({ account: 'Aportes Patronales por Pagar', debe: 0, haber: totalPatronal, indent: true });
    }
  }

  const totalJournalDebe = journalRows.reduce((sum, r) => sum + r.debe, 0);
  const totalJournalHaber = journalRows.reduce((sum, r) => sum + r.haber, 0);
  const journalBalances = Math.abs(totalJournalDebe - totalJournalHaber) < 0.05;

  app.innerHTML = `
    <!-- Top Header -->
    <header>
      <div class="brand">
        <div class="brand-icon">C</div>
        <div class="brand-text">
          <h1>CalcuConta</h1>
          <p>Planilla digital de sueldos, salarios y tributos (RC-IVA)</p>
        </div>
      </div>
    </header>

    <!-- Settings Bar -->
    <div class="settings-bar">
      <div class="settings-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Parámetros Generales
      </div>
      <div class="settings-inputs">
        <div class="setting-field">
          <label for="input-min-salary">S. Mínimo Nacional (Bs.):</label>
          <input type="number" id="input-min-salary" value="${state.minimumSalary}" min="1" step="any" />
        </div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="dashboard-grid">
      
      <!-- Left Panel: Calculator Form -->
      <div class="left-panel">
        <div class="card">
          <h2 class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            ${state.editEmployeeId ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h2>
          <form id="employee-form" autocomplete="off">
            <div class="form-group">
              <label for="emp-name">Nombre del Empleado *</label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input type="text" id="emp-name" class="form-control" placeholder="Ej. Juan Pérez" value="${state.formState.name}" required />
              </div>
            </div>

            <div class="form-group">
              <label for="emp-salary">Haber Básico (Sueldo Base) *</label>
              <div class="input-wrapper">
                <span class="input-icon">Bs.</span>
                <input type="number" id="emp-salary" class="form-control" placeholder="0.00" min="0" step="any" value="${state.formState.basicSalary || ''}" required />
              </div>
            </div>

            <!-- Dynamic Bonuses List -->
            <div class="form-group" style="margin-bottom: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <label style="margin-bottom: 0; font-weight: 600; color: var(--text-main); font-size: 0.9rem;">Bonos y Adicionales</label>
                <button type="button" class="btn btn-secondary" id="btn-add-bonus-item" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.75rem; border-radius: 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 2px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Agregar Bono
                </button>
              </div>

              <div id="bonus-items-container" style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${state.formState.bonuses.length === 0 ? `
                  <div style="text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.75rem; border: 1px dashed var(--border-color); border-radius: var(--radius-sm); background: rgba(255,255,255,0.01);">
                    No hay bonos activos para este empleado.
                  </div>
                ` : state.formState.bonuses.map(bonus => `
                  <div class="bonus-item-card" data-id="${bonus.id}" style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem; position: relative;">
                    <!-- Dropdown and Delete Button -->
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                      <select class="form-control bonus-type-select" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; width: auto; height: auto; outline: none; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-main);">
                        <option value="custom" ${bonus.type === 'custom' ? 'selected' : ''}>Monto Fijo</option>
                        <option value="seniority" ${bonus.type === 'seniority' ? 'selected' : ''}>Antigüedad</option>
                      </select>
                      
                      <button type="button" class="btn-delete-bonus-item" style="background: transparent; border: none; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0.25rem;" title="Eliminar Bono">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>

                    <!-- Fields based on type -->
                    ${bonus.type === 'seniority' ? `
                      <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500;">Bono de Antigüedad (3 Mínimos Nacionales)</div>
                        <div class="input-wrapper" style="margin-top: 0.25rem;">
                          <span class="input-icon" style="font-size: 0.8rem; left: 0.5rem; color: var(--text-muted);">Años:</span>
                          <input type="number" class="form-control bonus-years-input" style="padding-left: 3rem; padding-top: 0.35rem; padding-bottom: 0.35rem; font-size: 0.8rem; height: auto;" placeholder="Años" min="0" max="80" value="${bonus.years}" />
                        </div>
                        <div style="font-size: 0.7rem; color: var(--primary); margin-top: 0.15rem; font-weight: 600;">
                          Calculado: Bs. ${((3 * state.minimumSalary * getSeniorityPercentage(bonus.years)) / 100).toFixed(2)} (${getSeniorityPercentage(bonus.years)}%)
                        </div>
                      </div>
                    ` : `
                      <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 0.5rem;">
                        <input type="text" class="form-control bonus-name-input" style="padding: 0.35rem 0.5rem; font-size: 0.8rem; height: auto; border-radius: 4px;" placeholder="Nombre (Ej. Bono Pasaje)" value="${bonus.name}" />
                        <div class="input-wrapper">
                          <span class="input-icon" style="font-size: 0.8rem; left: 0.5rem; color: var(--text-muted);">Bs.</span>
                          <input type="number" class="form-control bonus-amount-input" style="padding-left: 2rem; padding-top: 0.35rem; padding-bottom: 0.35rem; font-size: 0.8rem; height: auto; border-radius: 4px;" placeholder="Monto" min="0" step="any" value="${bonus.amount || ''}" />
                        </div>
                      </div>
                    `}
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Form 110 Input (used only for RC-IVA table) -->
            <div class="form-group" style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
              <label for="emp-form-110">Monto Formulario 110 (Bs.)</label>
              <div class="input-wrapper">
                <span class="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </span>
                <input type="number" id="emp-form-110" class="form-control" placeholder="0.00" min="0" step="any" value="${state.formState.form110 || ''}" />
              </div>
            </div>

            <!-- Live Receipt Preview inside the form -->
            <div style="background: rgba(255,255,255,0.02); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px dashed var(--border-color); margin-bottom: 1.25rem; font-size: 0.85rem;">
              <div style="font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; font-size: 0.75rem;">Simulación Rápida</div>
              <div style="display: flex; justify-content: space-between; padding-top: 0.4rem; border-top: 1px dashed var(--border-color); font-weight: 700; color: var(--primary); font-size: 0.95rem;">
                <span>Total Ganado:</span>
                <span id="quick-total-earned">Bs. 0.00</span>
              </div>
            </div>

            <div class="btn-group">
              <button type="submit" class="btn btn-primary" id="btn-submit-employee">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-right:4px; vertical-align:-3px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                ${state.editEmployeeId ? 'Guardar Cambios' : 'Agregar a la Planilla'}
              </button>
              ${state.editEmployeeId ? `
                <button type="button" class="btn btn-secondary" id="btn-cancel-edit">Cancelar</button>
              ` : ''}
            </div>
          </form>
        </div>
      </div>

      <!-- Right Panel: Tables -->
      <div class="right-panel">
        
        <!-- Payroll Table Card -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            <h2 class="card-title" style="margin-bottom: 0; border: none; padding: 0;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Planilla de Sueldos y Salarios
            </h2>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-outline-danger" id="btn-clear-all">Limpiar Planilla</button>
            </div>
          </div>

          <div class="payroll-container">
            ${state.employees.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <h3>Planilla Vacía</h3>
                <p>Agregue empleados en el panel de la izquierda para comenzar los cálculos.</p>
              </div>
            ` : `
              <table class="payroll-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th class="text-right">Haber Básico</th>
                    
                    <!-- Dynamic Bonus Columns -->
                    ${bonusCols.map(col => `
                      <th class="text-right">${col}</th>
                    `).join('')}

                    <th class="text-right" style="color: var(--primary)">Total Ganado</th>
                    <th class="actions-cell" style="width: 100px;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.employees.map(emp => {
                    return `
                      <tr data-emp-id="${emp.id}">
                        <td>
                          <div class="emp-info">
                            <div class="emp-avatar">${emp.name.charAt(0).toUpperCase()}</div>
                            <div class="emp-details">
                              <span class="emp-name">${emp.name}</span>
                              <span class="emp-role">Empleado</span>
                            </div>
                          </div>
                        </td>
                        <td class="text-right">Bs. ${emp.basicSalary.toFixed(2)}</td>
                        
                        <!-- Dynamic Bonus Cell Values -->
                        ${bonusCols.map(col => {
                          const b = (emp.bonuses || []).find(x => {
                            if (x.type === 'seniority' && col === 'Bono de Antigüedad') return true;
                            return x.type === 'custom' && x.name.trim() === col;
                          });
                          const val = b ? b.calculatedAmount : 0;
                          return `
                            <td class="text-right" style="color: ${val > 0 ? 'var(--primary)' : 'var(--text-muted)'}">
                              Bs. ${val.toFixed(2)}
                            </td>
                          `;
                        }).join('')}

                        <td class="text-right" style="font-weight: 700; color: var(--primary)">Bs. ${emp.totalEarned.toFixed(2)}</td>
                        <td class="actions-cell">
                          <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
                            <button class="btn btn-secondary btn-edit-emp" data-id="${emp.id}" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="Editar">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <button class="btn btn-danger btn-delete-emp" data-id="${emp.id}" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="Eliminar">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="m19 6-2 14H7L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total General</th>
                    <td class="text-right">Bs. ${totalBasic.toFixed(2)}</td>
                    
                    <!-- Dynamic Bonus Sums in footer -->
                    ${bonusSums.map(sum => `
                      <td class="text-right">Bs. ${sum.toFixed(2)}</td>
                    `).join('')}

                    <td class="text-right" style="color: var(--primary); font-weight: 800;">Bs. ${totalEarned.toFixed(2)}</td>
                    <td class="actions-cell"></td>
                  </tr>
                </tfoot>
              </table>
            `}
          </div>
        </div>

        <!-- Planilla Tributaria (RC-IVA) Card -->
        ${state.employees.length > 0 ? `
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
              <h2 class="card-title" style="margin-bottom: 0; border: none; padding: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Planilla Tributaria (RC-IVA)
              </h2>
            </div>

            <div class="payroll-container">
              <table class="payroll-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th class="text-right">Total Ganado</th>
                    <th class="text-right">Aportes Lab. (12.71%)</th>
                    <th class="text-right">Sueldo Neto</th>
                    <th class="text-right">Menos 2 Salarios Mínimos</th>
                    <th class="text-right">Importe Salarial</th>
                    <th class="text-right">RC-IVA (13%)</th>
                    <th class="text-right">Menos 13% SMN</th>
                    <th class="text-right">Form 110 (13%)</th>
                    <th class="text-right" style="color: var(--primary)">RC-IVA a Pagar</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.employees.map(emp => {
                    return `
                      <tr>
                        <td>
                          <span style="font-weight: 500;">${emp.name}</span>
                        </td>
                        <td class="text-right">Bs. ${emp.totalEarned.toFixed(2)}</td>
                        <td class="text-right" style="color: var(--danger)">Bs. ${emp.aportesLaborales.toFixed(2)}</td>
                        <td class="text-right" style="font-weight: 500;">Bs. ${emp.sueldoNeto.toFixed(2)}</td>
                        <td class="text-right" style="color: var(--text-muted)">Bs. ${emp.dosSmn.toFixed(2)}</td>
                        <td class="text-right">Bs. ${emp.importeSalarial.toFixed(2)}</td>
                        <td class="text-right" style="color: var(--danger)">Bs. ${emp.rcIvaBase.toFixed(2)}</td>
                        <td class="text-right" style="color: var(--primary)">Bs. ${emp.deduccionSmn.toFixed(2)}</td>
                        <td class="text-right" style="color: var(--primary)">Bs. ${emp.form110_13.toFixed(2)}</td>
                        <td class="text-right" style="font-weight: 700; color: ${emp.rcIvaPagar > 0 ? 'var(--danger)' : 'var(--text-muted)'}">
                          Bs. ${emp.rcIvaPagar.toFixed(2)}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total General</th>
                    <td class="text-right">Bs. ${totalEarned.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--danger)">Bs. ${totalAportes.toFixed(2)}</td>
                    <td class="text-right">Bs. ${totalSueldoNeto.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--text-muted)">Bs. ${totalDosSmn.toFixed(2)}</td>
                    <td class="text-right">Bs. ${totalImporteSalarial.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--danger)">Bs. ${totalRcIvaBase.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--primary)">Bs. ${totalDeduccionSmn.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--primary)">Bs. ${totalForm110_13.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--danger); font-weight: 800;">Bs. ${totalRcIvaPagar.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- Planilla de Líquido Pagable Card -->
        ${state.employees.length > 0 ? `
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
              <h2 class="card-title" style="margin-bottom: 0; border: none; padding: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Planilla de Líquido Pagable
              </h2>
            </div>

            <div class="payroll-container">
              <table class="payroll-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th class="text-right">Total Ganado</th>
                    <th class="text-right" style="color: var(--danger)">Aportes Laborales (12.71%)</th>
                    <th class="text-right" style="color: var(--danger)">RC-IVA a Pagar</th>
                    <th class="text-right" style="color: var(--primary)">Líquido Pagable</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.employees.map(emp => {
                    return `
                      <tr>
                        <td>
                          <span style="font-weight: 500;">${emp.name}</span>
                        </td>
                        <td class="text-right">Bs. ${emp.totalEarned.toFixed(2)}</td>
                        <td class="text-right" style="color: var(--danger)">Bs. ${emp.aportesLaborales.toFixed(2)}</td>
                        <td class="text-right" style="color: var(--danger)">Bs. ${emp.rcIvaPagar.toFixed(2)}</td>
                        <td class="text-right" style="font-weight: 700; color: var(--primary)">
                          Bs. ${emp.liquidoPagable.toFixed(2)}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total General</th>
                    <td class="text-right">Bs. ${totalEarned.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--danger)">Bs. ${totalAportes.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--danger)">Bs. ${totalRcIvaPagar.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--primary); font-weight: 800;">Bs. ${totalLiquido.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- Planilla de Aportes Patronales Card -->
        ${state.employees.length > 0 ? `
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
              <h2 class="card-title" style="margin-bottom: 0; border: none; padding: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Planilla de Aportes Patronales
              </h2>
            </div>

            <div class="payroll-container">
              <table class="payroll-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th class="text-right">Total Ganado</th>
                    <th class="text-right" style="color: var(--primary)">Aporte Patronal (32.37%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.employees.map(emp => {
                    return `
                      <tr>
                        <td>
                          <span style="font-weight: 500;">${emp.name}</span>
                        </td>
                        <td class="text-right">Bs. ${emp.totalEarned.toFixed(2)}</td>
                        <td class="text-right" style="font-weight: 700; color: var(--primary)">
                          Bs. ${emp.aportePatronal.toFixed(2)}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total General</th>
                    <td class="text-right">Bs. ${totalEarned.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--primary); font-weight: 800;">Bs. ${totalPatronal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- Registro Contable (Asiento de Diario) Card -->
        ${state.employees.length > 0 ? `
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
              <h2 class="card-title" style="margin-bottom: 0; border: none; padding: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
                Asiento Contable de Planilla
              </h2>
              ${journalBalances ? `
                <span style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; gap: 0.25rem;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  Balanceado / Cuadrado
                </span>
              ` : `
                <span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 20px; border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; gap: 0.25rem;">
                  Error de Cuadre
                </span>
              `}
            </div>

            <div class="payroll-container">
              <table class="payroll-table" style="font-family: var(--font-sans);">
                <thead>
                  <tr>
                    <th>Detalle / Cuentas</th>
                    <th class="text-right" style="width: 180px;">Debe (Bs.)</th>
                    <th class="text-right" style="width: 180px;">Haber (Bs.)</th>
                  </tr>
                </thead>
                <tbody>
                  ${journalRows.map(row => `
                    <tr>
                      <td style="${row.indent ? 'padding-left: 3rem; color: var(--text-muted); font-style: italic;' : 'font-weight: 500;'}">
                        ${row.indent ? `a ${row.account}` : row.account}
                      </td>
                      <td class="text-right" style="font-family: monospace; font-size: 0.95rem;">
                        ${row.debe > 0 ? `Bs. ${row.debe.toFixed(2)}` : ''}
                      </td>
                      <td class="text-right" style="font-family: monospace; font-size: 0.95rem;">
                        ${row.haber > 0 ? `Bs. ${row.haber.toFixed(2)}` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="border-top: 2px double var(--border-color);">
                    <th>Total General</th>
                    <td class="text-right" style="font-weight: 800; font-family: monospace; font-size: 1rem; border-top: 1px solid var(--border-color); border-bottom: 4px double var(--primary);">
                      Bs. ${totalJournalDebe.toFixed(2)}
                    </td>
                    <td class="text-right" style="font-weight: 800; font-family: monospace; font-size: 1rem; border-top: 1px solid var(--border-color); border-bottom: 4px double var(--primary);">
                      Bs. ${totalJournalHaber.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Notification Toast Container -->
    <div id="toast-container" class="toast-container"></div>

    <!-- Beautiful Page Footer -->
    <footer>
      <p>CalcuConta © ${new Date().getFullYear()} - Herramienta de Contabilidad Rápida. Creado para despliegue instantáneo en Vercel.</p>
    </footer>
  `;

  // Attach all event listeners
  attachEventListeners();
  // Update live preview calculations in the form
  updateLiveFormCalculations();
}

// --- Live Form Calculations updates ---
function updateLiveFormCalculations() {
  const salaryInput = document.getElementById('emp-salary');
  if (!salaryInput) return;

  const basicSalary = parseFloat(salaryInput.value) || 0;
  
  let totalBonuses = 0;
  state.formState.bonuses.forEach(bonus => {
    if (bonus.type === 'seniority') {
      const percent = getSeniorityPercentage(bonus.years);
      totalBonuses += (3 * state.minimumSalary * percent) / 100;
    } else {
      totalBonuses += bonus.amount || 0;
    }
  });

  const totalEarned = basicSalary + totalBonuses;

  // Update DOM quick previews
  const quickTotal = document.getElementById('quick-total-earned');
  if (quickTotal) quickTotal.textContent = `Bs. ${totalEarned.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// --- Attach Event Listeners ---
function attachEventListeners() {
  // General inputs: Min Salary
  const minSalaryInput = document.getElementById('input-min-salary');
  if (minSalaryInput) {
    minSalaryInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        state.minimumSalary = val;
        recalculateAllEmployees();
        saveStateToStorage();
        updateLiveFormCalculations();
        renderApp();
      }
    });
  }

  // Form Basic Inputs
  const nameInput = document.getElementById('emp-name');
  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      state.formState.name = e.target.value;
    });
  }

  const salaryInput = document.getElementById('emp-salary');
  if (salaryInput) {
    salaryInput.addEventListener('input', (e) => {
      state.formState.basicSalary = parseFloat(e.target.value) || 0;
      updateLiveFormCalculations();
    });
  }

  // Form 110 Input
  const form110Input = document.getElementById('emp-form-110');
  if (form110Input) {
    form110Input.addEventListener('input', (e) => {
      state.formState.form110 = parseFloat(e.target.value) || 0;
    });
  }

  // Add Bonus Item Button
  const addBonusBtn = document.getElementById('btn-add-bonus-item');
  if (addBonusBtn) {
    addBonusBtn.addEventListener('click', () => {
      state.formState.bonuses.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        type: 'custom',
        name: 'Bono de Producción',
        years: 0,
        amount: 0
      });
      renderApp();
    });
  }

  // Bonus list delegation (change, input, delete click)
  const bonusItemsContainer = document.getElementById('bonus-items-container');
  if (bonusItemsContainer) {
    bonusItemsContainer.addEventListener('change', (e) => {
      const select = e.target.closest('.bonus-type-select');
      if (!select) return;
      
      const card = select.closest('.bonus-item-card');
      const id = card.getAttribute('data-id');
      const bonus = state.formState.bonuses.find(b => b.id === id);
      if (!bonus) return;

      bonus.type = select.value;
      if (bonus.type === 'seniority') {
        bonus.name = 'Bono de Antigüedad';
        bonus.years = 0;
        bonus.amount = 0;
      } else {
        bonus.name = 'Bono de Producción';
        bonus.years = 0;
        bonus.amount = 0;
      }
      renderApp();
    });

    bonusItemsContainer.addEventListener('input', (e) => {
      const card = e.target.closest('.bonus-item-card');
      if (!card) return;
      const id = card.getAttribute('data-id');
      const bonus = state.formState.bonuses.find(b => b.id === id);
      if (!bonus) return;

      if (e.target.classList.contains('bonus-name-input')) {
        bonus.name = e.target.value;
      } else if (e.target.classList.contains('bonus-amount-input')) {
        bonus.amount = parseFloat(e.target.value) || 0;
      } else if (e.target.classList.contains('bonus-years-input')) {
        bonus.years = parseInt(e.target.value) || 0;
        // Dynamically update the years preview row text directly to prevent focus loss
        const calculatedText = card.querySelector('div[style*="var(--primary)"]');
        if (calculatedText) {
          const percent = getSeniorityPercentage(bonus.years);
          const computed = (3 * state.minimumSalary * percent) / 100;
          calculatedText.textContent = `Calculado: Bs. ${computed.toFixed(2)} (${percent}%)`;
        }
      }
      updateLiveFormCalculations();
    });

    // Delete delegation
    bonusItemsContainer.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.btn-delete-bonus-item');
      if (!deleteBtn) return;
      
      const card = deleteBtn.closest('.btn-delete-bonus-item').closest('.bonus-item-card');
      const id = card.getAttribute('data-id');
      
      state.formState.bonuses = state.formState.bonuses.filter(b => b.id !== id);
      renderApp();
    });
  }

  // Form Submit Handler
  const form = document.getElementById('employee-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!state.formState.name.trim()) {
        showToast('El nombre del empleado es obligatorio.', 'error');
        return;
      }
      if (state.formState.basicSalary <= 0) {
        showToast('El sueldo base debe ser un monto mayor a cero.', 'error');
        return;
      }

      let employeeData = {
        name: state.formState.name.trim(),
        basicSalary: state.formState.basicSalary,
        form110: state.formState.form110,
        bonuses: JSON.parse(JSON.stringify(state.formState.bonuses))
      };

      if (state.editEmployeeId) {
        // Edit existing employee
        state.employees = state.employees.map(emp => {
          if (emp.id === state.editEmployeeId) {
            return {
              ...emp,
              ...employeeData
            };
          }
          return emp;
        });
        showToast(`Datos del empleado "${employeeData.name}" actualizados.`);
        state.editEmployeeId = null;
      } else {
        // Create new employee
        const newEmp = {
          id: Date.now().toString(),
          ...employeeData
        };
        state.employees.push(newEmp);
        state.selectedEmployeeId = newEmp.id;
        showToast(`Empleado "${employeeData.name}" agregado a la planilla.`);
      }

      // Reset Form State
      state.formState = {
        name: '',
        basicSalary: 4000,
        bonuses: [],
        form110: 0
      };

      recalculateAllEmployees();
      saveStateToStorage();
      renderApp();
    });
  }

  // Cancel edit handler
  const cancelEditBtn = document.getElementById('btn-cancel-edit');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      state.editEmployeeId = null;
      state.formState = {
        name: '',
        basicSalary: 4000,
        bonuses: [],
        form110: 0
      };
      renderApp();
    });
  }

  // Edit employee action click
  const editButtons = document.querySelectorAll('.btn-edit-emp');
  editButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const empId = btn.getAttribute('data-id');
      const emp = state.employees.find(e => e.id === empId);
      
      if (emp) {
        state.editEmployeeId = empId;
        state.formState = {
          name: emp.name,
          basicSalary: emp.basicSalary,
          bonuses: JSON.parse(JSON.stringify(emp.bonuses || [])),
          form110: emp.form110 || 0
        };
        renderApp();
        document.getElementById('employee-form')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Delete employee action click
  const deleteButtons = document.querySelectorAll('.btn-delete-emp');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const empId = btn.getAttribute('data-id');
      const emp = state.employees.find(e => e.id === empId);

      if (emp) {
        if (confirm(`¿Está seguro que desea eliminar a "${emp.name}" de la planilla?`)) {
          state.employees = state.employees.filter(e => e.id !== empId);
          if (state.selectedEmployeeId === empId) {
            state.selectedEmployeeId = state.employees.length > 0 ? state.employees[0].id : null;
          }
          if (state.editEmployeeId === empId) {
            state.editEmployeeId = null;
            state.formState = {
              name: '',
              basicSalary: 4000,
              bonuses: [],
              form110: 0
            };
          }
          showToast(`Empleado "${emp.name}" eliminado.`);
          recalculateAllEmployees();
          saveStateToStorage();
          renderApp();
        }
      }
    });
  });

  // Clear payroll button
  const clearBtn = document.getElementById('btn-clear-all');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (state.employees.length === 0) return;
      
      if (confirm('¿Está seguro de eliminar TODOS los empleados de la planilla?')) {
        state.employees = [];
        state.selectedEmployeeId = null;
        state.editEmployeeId = null;
        state.formState = {
          name: '',
          basicSalary: 4000,
          bonuses: [],
          form110: 0
        };
        showToast('Planilla vaciada por completo.');
        saveStateToStorage();
        renderApp();
      }
    });
  }
}

// --- Initialize App ---
loadState();
renderApp();
console.log('CalcuConta initialized successfully!');
