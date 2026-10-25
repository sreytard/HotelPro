const COLORS = {
  pending: 'warning', confirmed: 'primary', 'checked-in': 'success', 'checked-out': 'secondary', cancelled: 'danger',
  paid: 'success', unpaid: 'warning', refunded: 'info',
  available: 'success', maintenance: 'secondary',
};

export default function StatusBadge({ value }) {
  return <span className={`badge text-bg-${COLORS[value] || 'secondary'}`}>{value}</span>;
}
