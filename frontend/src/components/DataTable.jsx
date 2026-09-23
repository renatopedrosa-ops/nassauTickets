/**
 * Tabela genérica: `columns` = [{ key, header, render? }].
 * Reutilizada nos relatórios e nos cadastros.
 */
export function DataTable({ columns, rows, rowKey = 'id', caption, emptyMessage = 'Nenhum registro.' }) {
  return (
    <div className="table-wrap">
      <table className="table">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key} scope="col">{column.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="muted">{emptyMessage}</td></tr>
          ) : (
            rows.map((row, index) => (
              <tr key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? index}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
