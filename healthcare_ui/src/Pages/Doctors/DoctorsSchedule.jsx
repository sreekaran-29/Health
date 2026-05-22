import { useNavigate } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";
import { MdEmail, MdPhone, MdBusiness } from "react-icons/md";
import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useParams } from "react-router-dom";
import {
    getDoctorById,
    getSchedules,
    getDaysOff,
    saveDoctorSchedule,
    saveDoctorDaysOff,
    deleteDoctorsDaysOff,
    deleteDoctorSchedule
} from "../../Services/DoctorService";
import WorkingHoursBySite from "../../Components/Doctors/WorkingHoursBySite";
import DaysOff from "../../Components/Doctors/DaysOff";
import { useAuth } from "../../Context/AuthContext";
import { toast } from "react-toastify";
import DeleteModel from "../../Components/Common/DeleteModel";

export default function DoctorsSchedule() {
    const { id } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [daysOff, setDaysOff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [schedulesLoading, setSchedulesLoading] = useState(false);
    const [daysOffLoading, setDaysOffLoading] = useState(false);
    const [showAddDayOff, setShowAddDayOff] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [deleteDayOffLoading, setDeleteDayOffLoading] = useState(false);
    const [deleteScheduleId, setDeleteScheduleId] = useState(null);
    const [deleteScheduleLoading, setDeleteScheduleLoading] = useState(false);
    const [showDeleteSchedule, setShowDeleteSchedule] = useState(false);

    useEffect(() => {
        if (!id || !token) return;
        setLoading(true);
        const fetchDoctor = async () => {
            try {
                const res = await getDoctorById(id, token);
                if (res?.is_success) {
                    setDoctor(res.data);
                } else if (res?.status_code === 500) {
                    toast.error("Internal Server Error. Please Contact Support Team.");
                } else {
                    toast.error(res?.message || "Failed to load doctor");
                }
                setLoading(false);
            } catch (error) {
                toast.error("Failed to load doctor");
                setLoading(false);
            }
        };
        fetchDoctor();
    }, [id, token]);

    const loadSchedules = async (weekStart) => {
        if (!doctor?.UserId) return;
        setSchedulesLoading(true);
        try {
            const res = await getSchedules(doctor.UserId, weekStart, token);
            if (res?.is_success) {
                setSchedules(res.data);
            } else if (res?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
                setSchedules([]);
            } else {
                setSchedules([]);
            }
        } catch (error) {
            toast.error("Failed to load schedules");
            setSchedules([]);
        } finally {
            setSchedulesLoading(false);
        }
    };

    const handleSaveSchedule = async (scheduleData) => {
        try {
            const res = await saveDoctorSchedule(scheduleData, token);
            if (res?.is_success) {
                toast.success(res.message || "Schedule saved!");
            } else if (res?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
            } else {
                toast.error(res?.message || "Failed to save schedule");
            }
            loadSchedules(scheduleData.Date);
        } catch (error) {
            toast.error("Failed to save schedule");
        }
    };

    const loadDaysOff = async () => {
        if (!doctor?.UserId) return;
        setDaysOffLoading(true);
        try {
            const res = await getDaysOff(doctor.UserId, token);
            if (res?.is_success) {
                setDaysOff(res.data);
            } else if (res?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
                setDaysOff([]);
            } else {
                toast.error(res?.message || "Failed to load days off");
                setDaysOff([]);
            }
        } catch (error) {
            toast.error("Failed to load days off");
            setDaysOff([]);
        } finally {
            setDaysOffLoading(false);
        }
    };

    const handleAddDayOff = async (values, { setSubmitting, resetForm }) => {
        try {
            const payload = {
                UserId: doctor.UserId,
                StartDate: values.StartDate,
                EndDate: values.EndDate,
                IsAllDay: values.IsAllDay,
                Reason: values.Reason,
                StartTime: values.IsAllDay ? null : values.StartTime,
                EndTime: values.IsAllDay ? null : values.EndTime,
                StatusId: 1,
            };
            const res = await saveDoctorDaysOff(payload, token);
            if (res?.is_success) {
                toast.success(res.message || "Day off added!");
                setShowAddDayOff(false);
                resetForm();
                loadDaysOff();
            } else if (res?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
            } else {
                toast.error(res?.message || "Failed to add day off");
            }
        } catch (error) {
            toast.error("Failed to add day off");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteDayOff = async (id) => {
        setDeleteId(id);
        setShowDelete(true);
    };

    const confirmDeleteDayOff = async () => {
        if (!deleteId) return;
        setDeleteDayOffLoading(true);
        try {
            const res = await deleteDoctorsDaysOff(deleteId, token);
            if (res?.is_success) {
                toast.success(res.message || "Day off deleted!");
                loadDaysOff();
            } else if (res?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
            } else {
                toast.error(res?.message || "Failed to delete day off");
            }
        } catch (error) {
            toast.error("Failed to delete day off");
        } finally {
            setDeleteDayOffLoading(false);
            setShowDelete(false);
            setDeleteId(null);
        }
    };

    const handleDeleteSchedule = (scheduleId) => {
            setDeleteScheduleId(scheduleId);
            setShowDeleteSchedule(true);
        };

        const confirmDeleteSchedule = async () => {
            if (!deleteScheduleId) return;
            setDeleteScheduleLoading(true);
            try {
                const res = await deleteDoctorSchedule(deleteScheduleId, token);
                if (res?.is_success) {
                    toast.success(res.message || "Schedule deleted!");
                    loadSchedules(new Date().toISOString().slice(0, 10));
                } else if (res?.status_code === 500) {
                    toast.error("Internal Server Error. Please Contact Support Team.");
                } else {
                    toast.error(res?.message || "Failed to delete schedule");
                }
            } catch (error) {
                toast.error("Failed to delete schedule");
            } finally {
                setDeleteScheduleLoading(false);
                setShowDeleteSchedule(false);
                setDeleteScheduleId(null);
            }
        };

    useEffect(() => {
        if (doctor?.UserId) {
            loadSchedules(new Date().toISOString().slice(0, 10));
            loadDaysOff();
        }
    }, [doctor?.UserId]);

    if (loading || !doctor) return (
        <div className="spinner">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );;

    const STATUS_STYLE = {
        Active: { backgroundColor: "#dcfce7", color: "#16a34a" },
        Inactive: { backgroundColor: "#f1f3f5", color: "#6b7280" },
    };
    const statusName = doctor?.User?.StatusName || "Unknown";

    return (
        <div className="container-fluid py-4">
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                <button
                    type="button"
                    className="btn btn-light fw-semibold border shadow-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill"
                    onClick={() => navigate(-1)}
                    style={{ minHeight: 40 }}
                >
                    <MdArrowBack size={18} />
                    <span>Back</span>
                </button>
            </div>

            <div className="p-4 p-lg-5 mb-4 overflow-hidden hc-hero-banner hc-hero-banner-primary">
                <div aria-hidden="true" className="hc-hero-circle-tr" />
                <div aria-hidden="true" className="hc-hero-circle-bl" />
                <div className="row g-4 align-items-center position-relative">
                    <div className="col-lg-8">
                        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                            <span
                                className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                                style={{ fontSize: "0.82rem", backgroundColor: STATUS_STYLE[statusName]?.backgroundColor || "#f3f4f6", color: STATUS_STYLE[statusName]?.color || "#4b5563" }}
                            >
                                {statusName}
                            </span>
                            {doctor.User?.AccountName ? (
                                <span
                                    className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                                    style={{ fontSize: "0.82rem", backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }}
                                >
                                    {doctor.User.AccountName}
                                </span>
                            ) : null}
                        </div>
                        <h2 className="fw-bold text-white mb-2" style={{ fontSize: "clamp(1.45rem, 2.2vw, 2rem)" }}>
                            {`${doctor.User?.FirstName || ""} ${doctor.User?.LastName || ""}`.trim()}
                        </h2>
                        <p className="mb-1 d-flex align-items-center gap-2" style={{ color: "rgba(255,255,255,0.78)", fontSize: "0.95rem" }}>
                            <MdEmail size={14} className="me-1" />{doctor.User?.EmailAddress || "-"}
                        </p>
                        <p className="mb-1 d-flex align-items-center gap-2" style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.88rem" }}>
                            <MdPhone size={14} className="me-1" />{doctor.User?.Phone || "-"}
                        </p>
                        <p className="mb-0 d-flex align-items-center gap-2" style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.88rem" }}>
                            <MdBusiness size={14} className="me-1" />{doctor.User?.AccountName || "Global User"}
                        </p>
                    </div>
                    <div className="col-lg-4">
                        <div className="p-3 py-4 rounded-4 d-flex flex-column align-items-center justify-content-center" style={{ backgroundColor: "rgba(255,255,255,0.10)" }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    background: '#e6f7fa',
                                    color: '#008080',
                                    borderRadius: '999px',
                                    padding: '10px 32px',
                                    fontWeight: 700,
                                    fontSize: '1.15rem',
                                    letterSpacing: 0.2,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                                    marginBottom: 10,
                                    width: '100%',
                                    textAlign: 'center'
                                }}>
                                Doctor
                            </span>
                            <div>
                                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', marginTop: 8 }}>User ID</div>
                                <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.98rem', wordBreak: 'break-all' }}>
                                    #{doctor.UserId || "-"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <WorkingHoursBySite
                    data={schedules}
                    loading={schedulesLoading}
                    onFetch={({ weekStart }) => loadSchedules(weekStart)}
                    editable={true}
                    onSave={handleSaveSchedule}
                    userId={doctor?.UserId}
                    onDeleteSchedule={handleDeleteSchedule}
                />
            </div>

            <DaysOff
                daysOff={daysOff}
                loading={daysOffLoading}
                onAdd={() => setShowAddDayOff(true)}
                onDelete={handleDeleteDayOff}
                addable={true}
                deletable={true}
            />

            {showAddDayOff && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.25)',
                        zIndex: 1050,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <div className="hc-modal-content" style={{
                        background: '#fff',
                        borderRadius: 16,
                        boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
                        maxWidth: 420,
                        width: '100%',
                        padding: 0,
                        margin: 0
                    }}>
                        <div className="hc-modal-header d-flex align-items-center justify-content-between px-4 pt-4 pb-2">
                            <h5 className="modal-title fw-bold">Add Day Off</h5>
                            <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowAddDayOff(false)}></button>
                        </div>
                        <Formik
                            initialValues={{
                                StartDate: '',
                                EndDate: '',
                                IsAllDay: true,
                                StartTime: '',
                                EndTime: '',
                                Reason: ''
                            }}
                            validationSchema={Yup.object({
                                StartDate: Yup.string().required('Start date is required'),
                                EndDate: Yup.string().required('End date is required')
                                    .test('end-after-start', 'End date must be after or same as start date', function (value) {
                                        const { StartDate } = this.parent;
                                        return !StartDate || !value || value >= StartDate;
                                    }),
                                IsAllDay: Yup.boolean(),
                                StartTime: Yup.string().when('IsAllDay', {
                                    is: false,
                                    then: schema => schema.required('Start time is required'),
                                    otherwise: schema => schema.notRequired()
                                }),
                                EndTime: Yup.string().when('IsAllDay', {
                                    is: false,
                                    then: schema => schema.required('End time is required')
                                        .test('end-after-start-time', 'End time must be after start time', function (value) {
                                            const { StartTime } = this.parent;
                                            return !StartTime || !value || value > StartTime;
                                        }),
                                    otherwise: schema => schema.notRequired()
                                }),
                                Reason: Yup.string().required('Reason is required'),
                            })}
                            onSubmit={handleAddDayOff}
                        >
                            {({ values, isSubmitting, setFieldValue }) => (
                                <Form>
                                    <div className="hc-modal-body px-4 pt-2 pb-0">
                                        <div className="mb-3">
                                            <label className="form-label">Start Date</label>
                                            <Field type="date" name="StartDate" className="form-control" placeholder="dd-mm-yyyy" />
                                            <div className="text-danger small"><ErrorMessage name="StartDate" /></div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">End Date</label>
                                            <Field type="date" name="EndDate" className="form-control" placeholder="dd-mm-yyyy" />
                                            <div className="text-danger small"><ErrorMessage name="EndDate" /></div>
                                        </div>
                                        <div className="mb-3 d-flex align-items-center">
                                            <label className="form-label mb-0 me-2">All Day</label>
                                            <Field
                                                type="checkbox"
                                                name="IsAllDay"
                                                className="form-check-input"
                                                checked={values.IsAllDay}
                                                onChange={e => setFieldValue('IsAllDay', e.target.checked)}
                                            />
                                        </div>
                                        {!values.IsAllDay && (
                                            <>
                                                <div className="mb-3">
                                                    <label className="form-label">Start Time</label>
                                                    <Field type="time" name="StartTime" className="form-control" placeholder="Start Time" />
                                                    <div className="text-danger small"><ErrorMessage name="StartTime" /></div>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">End Time</label>
                                                    <Field type="time" name="EndTime" className="form-control" placeholder="End Time" />
                                                    <div className="text-danger small"><ErrorMessage name="EndTime" /></div>
                                                </div>
                                            </>
                                        )}
                                        <div className="mb-3">
                                            <label className="form-label">Reason</label>
                                            <Field type="text" name="Reason" className="form-control" placeholder="Reason" />
                                            <div className="text-danger small"><ErrorMessage name="Reason" /></div>
                                        </div>
                                    </div>
                                    <div className="hc-modal-footer d-flex justify-content-end gap-2 px-4 pb-4 pt-2">
                                        <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setShowAddDayOff(false)} disabled={isSubmitting}>Cancel</button>
                                        <button type="submit" className="btn hc-bg-primary text-white px-4" disabled={isSubmitting}>
                                            {isSubmitting ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                                            Add
                                        </button>
                                    </div>
                                </Form>
                            )}
                        </Formik>
                    </div>
                </div>
            )}

            <DeleteModel
                isOpen={showDelete}
                title="Delete Day Off"
                description="Are you sure you want to delete this day off? This action cannot be undone."
                entityLabel="day off"
                onConfirm={confirmDeleteDayOff}
                onClose={() => setShowDelete(false)}
                isLoading={deleteDayOffLoading}
            />

            {/* Delete Working Hour Modal */}
            <DeleteModel
                isOpen={showDeleteSchedule}
                title="Delete Working Hour"
                description="Are you sure you want to delete this working hour? This action cannot be undone."
                entityLabel="working hour"
                onConfirm={confirmDeleteSchedule}
                onClose={() => setShowDeleteSchedule(false)}
                isLoading={deleteScheduleLoading}
            />
        </div>
    );
}

