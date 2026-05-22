import React, { useState, useEffect } from "react";
import { MdEdit, MdDeleteOutline } from "react-icons/md";

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getStartOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(startDate) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export default function WorkingHoursBySite({ onFetch, data, loading, editable = false, onSave, userId, onDeleteSchedule }) {
  const [weekStart, setWeekStart] = useState(getStartOfWeek(new Date()));
  const [editIdx, setEditIdx] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (typeof onFetch === 'function') {
      const localDate = weekStart.getFullYear() + '-' + String(weekStart.getMonth() + 1).padStart(2, '0') + '-' + String(weekStart.getDate()).padStart(2, '0');
      onFetch({ weekStart: localDate });
    }
  }, [weekStart]);

  const weekDates = getWeekDates(weekStart);
  const timeOptions = Array.from({length: 24*4}, (_,i) => {
    const h = String(Math.floor(i/4)).padStart(2,'0');
    const m = String((i%4)*15).padStart(2,'0');
    return `${h}:${m}`;
  });
  // Removed breakOptions and tzOptions

  function formatLocalDateYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const handleEdit = (idx, date, schedule) => {
    setEditIdx(idx);
    setEditRow({
      StartTime: schedule?.StartTime || "09:00",
      EndTime: schedule?.EndTime || "17:00",
      Date: formatLocalDateYYYYMMDD(date),
      Id: schedule?.Id,
      DayOfWeek: date.getDay(),
      StatusId: schedule?.StatusId || 1,
      Type: schedule?.Id ? "update" : "create",
      UserId: userId
    });
  };
  const handleCancel = () => {
    if (saving) return;
    setEditIdx(null);
    setEditRow({});
  };
  const handleChange = (field, value) => {
    setEditRow(r => ({...r, [field]: value}));
  };
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (onSave) {
        await onSave(editRow);
      }
      setEditIdx(null);
      setEditRow({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 p-md-5 hc-surface hc-card-primary position-relative">
      <div
        className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-3 gap-2 gap-md-0"
        style={{ rowGap: '0.5rem' }}
      >
        <h5 className="fw-bold mb-0 hc-text-primary" style={{ minWidth: 160 }}>Working Hours</h5>
        <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 w-100 w-md-auto" style={{ minWidth: 250 }}>
          <div className="d-flex flex-row align-items-center gap-2 justify-content-md-end flex-grow-1">
            <button className="btn btn-light" onClick={() => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; })}>
              &lt;
            </button>
            <span className="fw-semibold">Week of {weekStart.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <button
              className="btn btn-light"
              onClick={() => setWeekStart(prev => {
                const d = new Date(prev);
                d.setDate(d.getDate() + 7);
                return d;
              })}
              disabled={(() => {
                const nextWeek = new Date(weekStart);
                nextWeek.setDate(nextWeek.getDate() + 7);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return nextWeek > today;
              })()}
            >
              &gt;
            </button>
          </div>
          <button className="btn btn-outline-secondary ms-0 ms-md-3 mt-2 mt-md-0 flex-shrink-0" style={{ minWidth: 110 }} onClick={() => setWeekStart(new Date())}>Today</button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table align-middle" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead style={{ background: '#fafbfc' }}>
            <tr>
              <th className="fw-bold" style={{ minWidth: 110 }}>Day</th>
              <th>Date</th>
              <th>Start Time</th>
              <th>End Time</th>
              {/* Removed Break Time and Timezone columns */}
              {editable && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 7 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={editable ? 5 : 4}>
                      <div className="skeleton" style={{ height: 38, width: '100%', borderRadius: 10 }} />
                    </td>
                  </tr>
                ))
              : weekDates.map((date, idx) => {
                  const dayName = daysOfWeek[date.getDay()];
                  const schedule = Array.isArray(data)
                    ? data.find(sch => {
                        const schDate = new Date(sch.Date);
                        return schDate.toDateString() === date.toDateString();
                      })
                    : undefined;
                  const isEditing = editable && editIdx === idx;
                  return (
                    <tr key={idx} className={isEditing ? 'table-active' : 'border-top'} style={{ verticalAlign: 'middle', background: idx % 2 === 0 ? '#fff' : '#fcfcfd' }}>
                      <td className="fw-bold" style={{ color: '#222', fontWeight: 600 }}>{dayName}</td>
                      <td style={{ color: '#555' }}>{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      {isEditing ? (
                        <>
                          <td>
                            <select className="form-control" value={editRow.StartTime} onChange={e => handleChange('StartTime', e.target.value)}>
                              {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="form-control" value={editRow.EndTime} onChange={e => handleChange('EndTime', e.target.value)}>
                              {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td>
                            <button
                              className="btn hc-bg-primary text-white me-2 d-inline-flex align-items-center justify-content-center"
                              onClick={handleSave}
                              disabled={saving}
                              style={{ minWidth: 70 }}
                            >
                              {saving && (
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{width: '1rem', height: '1rem'}}></span>
                              )}
                              Save
                            </button>
                            <button className="btn btn-outline-secondary" onClick={handleCancel} disabled={saving}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ color: schedule && schedule.StartTime ? '#222' : '#bbb' }}>{schedule && schedule.StartTime ? schedule.StartTime : '-'}</td>
                          <td style={{ color: schedule && schedule.EndTime ? '#222' : '#bbb' }}>{schedule && schedule.EndTime ? schedule.EndTime : '-'}</td>
                          {editable && (
                            <td>
                              <span className="d-inline-flex align-items-center gap-2">
                                <button className="btn btn-link p-0 text-primary" title="Edit" onClick={() => handleEdit(idx, date, schedule)}><MdEdit size={18} /></button>
                                {schedule && schedule.Id && (
                                  <button
                                    className="btn btn-link p-0 text-danger ms-2"
                                    title="Delete"
                                    onClick={() => onDeleteSchedule && onDeleteSchedule(schedule.Id)}
                                    style={{ backgroundColor: '#fee2e2', border: 'none', borderRadius: '6px', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <MdDeleteOutline size={18} />
                                  </button>
                                )}
                              </span>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
