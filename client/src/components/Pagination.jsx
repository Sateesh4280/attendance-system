import Icon from './Icon.jsx';

export default function Pagination({ page, pages, total, onPageChange }) {
  if (!total) return null;

  return (
    <div className="pagination">
      <span>
        Page <strong>{page}</strong> of <strong>{pages}</strong> · {total} total
      </span>
      <div className="pagination-actions">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" size={16} />
          Prev
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          Next
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}
