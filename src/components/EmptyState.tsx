interface EmptyStateProps {
  colSpan: number;
  message: string;
  icon?: string;
}

const EmptyState = ({
  colSpan,
  message,
  icon = "fa-box-open",
}: EmptyStateProps) => {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-state-cell">
        <div className="empty-state" role="status" aria-live="polite">
          <i className={`fa-solid ${icon}`}></i>
          <p>{message}</p>
        </div>
      </td>
    </tr>
  );
};

export default EmptyState;
