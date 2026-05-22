import React from "react";
import { MdEventBusy, MdDelete, MdAdd } from "react-icons/md";

function formatDateRange(start, end) {
  if (!start) return "-";
  const format = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };
  if (!end || start === end) return format(start);
  return `${format(start)} - ${format(end)}`;
}


export default function DaysOff({ daysOff, onAdd, onDelete, loading, addable = false, deletable = false }) {
  return (
    <div className="p-3 p-md-5 hc-surface hc-card-primary rounded-4 mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="fw-bold mb-0 d-flex align-items-center gap-2 hc-text-primary">
          <MdEventBusy size={22} /> Days Off
        </h5>
        {addable && (
          <button
            className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
            onClick={onAdd}
          >
            <MdAdd size={20} /> Add Day Off
          </button>
        )}
      </div>
      <div className="table-responsive">
        <table className="table align-middle bg-white rounded-3 shadow-sm">
          <thead style={{ background: "#fafbfc" }}>
            <tr>
              <th>Date(s)</th>
              <th>All Day</th>
              <th>Reason</th>
              <th>Status</th>
              {deletable && <th className="text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {daysOff && daysOff.length > 0 ? (
              daysOff.map((day) => (
                <tr key={day.Id} className="align-middle">
                  <td className="fw-semibold">{formatDateRange(day.StartDate, day.EndDate)}</td>
                  <td>{day.IsAllDay ? "Yes" : "No"}</td>
                  <td>{day.Reason || "—"}</td>
                  <td>
                    <span className="badge rounded-pill px-3 py-2 fw-bolder text-center" style={{
                      minWidth: '96px',
                      fontWeight: 1000,
                      backgroundColor: '#f1f3f5',
                      color: '#6b7280',
                    }}>
                      {day.StatusName || day.StatusId || "-"}
                    </span>
                  </td>
                  {deletable && (
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-sm p-1 lh-1 text-danger"
                        style={{ backgroundColor: '#fee2e2', border: 'none', borderRadius: '6px' }}
                        title="Delete"
                        onClick={() => onDelete(day.Id)}
                      >
                        <MdDelete size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={deletable ? 5 : 4} className="text-center text-muted py-4">No days off found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
