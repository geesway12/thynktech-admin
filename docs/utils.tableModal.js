// utils.tableModal.js
// Shared utilities for table rendering and modal creation

export function renderMobileTable(headers, rows, actions) {
  // headers: [{key, label, mobile}]
  // rows: array of objects
  // actions: function(row, i) => HTML string
  return `
    <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle mobile-table">
        <thead class="table-light">
          <tr>
            ${headers.map(h => `<th${h.mobile ? '' : ' class="d-none d-md-table-cell"'}>${h.label}</th>`).join('')}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, i) => `
            <tr>
              ${headers.map(h => `<td${h.mobile ? ` data-label='${h.label}'` : ' class="d-none d-md-table-cell"'}>${row[h.key]||''}</td>`).join('')}
              <td data-label="Actions">${actions(row, i)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <style>
    @media (max-width: 768px) {
      .mobile-table thead { display: none; }
      .mobile-table tr { display: block; margin-bottom: 1rem; border: 1px solid #dee2e6; border-radius: 8px; }
      .mobile-table td { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; border: none; border-bottom: 1px solid #eee; }
      .mobile-table td:last-child { border-bottom: none; }
      .mobile-table td:before {
        content: attr(data-label);
        font-weight: bold;
        flex: 0 0 40%;
        color: #555;
      }
      .mobile-table td { flex-direction: row; }
    }
    </style>
  `;
}
