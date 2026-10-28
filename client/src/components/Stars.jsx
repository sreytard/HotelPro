import Rating from '@mui/material/Rating';

// Read-only star rating (Material UI)
export default function Stars({ value = 0, count, size = 'small' }) {
  return (
    <span className="d-inline-flex align-items-center gap-1">
      <Rating value={Number(value) || 0} precision={0.5} readOnly size={size} />
      {count !== undefined && <small className="text-muted">({count})</small>}
    </span>
  );
}
