interface TableSkeletonProps {
  rowCount: number;
  columnCount: number;
}

const TableSkeleton = ({ rowCount, columnCount }: TableSkeletonProps) => {
  return (
    <>
      {[...Array(rowCount)].map((_, rowIndex) => (
        <tr key={rowIndex}>
          {[...Array(columnCount)].map((_, colIndex) => (
            <td key={colIndex}>
              <div className="skeleton"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default TableSkeleton;
