import Pagination from '@mui/material/Pagination';

// Pagination control (Material UI). Hidden when there is only one page.
export default function Pager({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="d-flex justify-content-center py-3">
      <Pagination count={pages} page={page} onChange={(e, p) => onChange(p)} color="primary" shape="rounded" />
    </div>
  );
}
