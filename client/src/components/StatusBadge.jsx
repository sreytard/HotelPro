const COLORS = {
  pending: 'warning', confirmed: 'primary', 'checked-in': 'success', 'checked-out': 'secondary', cancelled: 'danger',
  paid: 'success', unpaid: 'warning', refunded: 'info',
  available: 'success', maintenance: 'secondary',
  open: 'warning', 'in-progress': 'primary', resolved: 'success',
  clean: 'success', dirty: 'danger', cleaning: 'warning',
  success: 'success', failed: 'danger',
  info: 'secondary', warn: 'warning', error: 'danger',
};

export default function StatusBadge({ value }) {
  return <span className={`badge text-bg-${COLORS[value] || 'secondary'}`}>{value}</span>;
}
