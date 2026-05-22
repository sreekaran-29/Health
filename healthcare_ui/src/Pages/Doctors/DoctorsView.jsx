import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
	MdArrowBack,
	MdEdit,
	MdPerson,
	MdBusiness,
	MdMedicalServices,
	MdSettingsSuggest,
	MdCalendarMonth,
	MdPauseCircle,
	MdCheckCircle,
	MdEventAvailable,
	MdEventBusy,
	MdSchedule,
	MdEmail,
	MdPhone
} from "react-icons/md";
import { useAuth } from "../../Context/AuthContext";
import { getDoctorById, getSchedules, getDaysOff } from "../../Services/DoctorService";
import { APPRoutes } from "../../Utils/Route";
import { formatUtcToLocalDateTime } from "../../Utils/DateTime";
import { toast } from "react-toastify";
import WorkingHoursBySite from "../../Components/Doctors/WorkingHoursBySite";
import DaysOff from "../../Components/Doctors/DaysOff";

const STATUS_STYLE = {
	Active: { backgroundColor: "#dcfce7", color: "#16a34a" },
	Inactive: { backgroundColor: "#f1f3f5", color: "#6b7280" },
};

export default function DoctorsView() {
	
	const navigate = useNavigate();
	const { id } = useParams();
	const location = useLocation();
	const { token } = useAuth();

	const [doctor, setDoctor] = React.useState(location.state?.doctor || null);
	const [loading, setLoading] = React.useState(!location.state?.doctor);
	const [schedules, setSchedules] = React.useState([]);
	const [daysOff, setDaysOff] = React.useState([]);
	const [schedulesLoading, setSchedulesLoading] = React.useState(false);
	const [daysOffLoading, setDaysOffLoading] = React.useState(false);

	const loadDoctor = async () => {
		if (!id || !token) return;
		setLoading(true);
		try {
			const res = await getDoctorById(id, token);
			if (res?.is_success) {
				setDoctor(res.data);
			} else if (res?.status_code === 500) {
				setDoctor(null);
				toast.error("Internal Server Error. Please Contact Support Team.");
			} else {
				setDoctor(null);
				toast.error("Doctor not found.");
			}
		} catch (err) {
			setDoctor(null);
			toast.error("Failed to load doctor details.");
		} finally {
			setLoading(false);
		}
	};

	const searchParams = new URLSearchParams(location.search);
	const locale = searchParams.get('locale') || navigator.language || 'en-US';

	const loadSchedules = async (date) => {
		if (!doctor?.UserId) return;
		try {
			setSchedulesLoading(true);
			const res = await getSchedules(doctor.UserId, date, token);
			if (res?.is_success) {
				setSchedules(res.data);
			} else if (res?.status_code === 500) {
				toast.error("Internal Server Error. Please Contact Support Team.");
				setSchedules([]);
			} else {
				toast.error(res?.message || "Failed to load schedules");
				setSchedules([]);
			}
		} catch (err) {
			toast.error("Failed to load schedules");
			setSchedules([]);
		} finally {
			setSchedulesLoading(false);
		}
	};

	const loadDaysOff = async () => {
		if (!doctor?.UserId) return;
		try {
			setDaysOffLoading(true);
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
		} catch (err) {
			toast.error("Failed to load days off");
			setDaysOff([]);
		} finally {
			setDaysOffLoading(false);
		}
	};


	React.useEffect(() => {
		if (!token || !id) return;
		if (!location.state?.doctor) {
			loadDoctor();
		}
	}, [token, id]);

	React.useEffect(() => {
		if (doctor?.UserId) {
			loadDaysOff();
		}
	}, [doctor?.UserId]);

	const statusName = doctor?.User?.StatusName || "Unknown";
	const createdOnLocal = React.useMemo(
		() => formatUtcToLocalDateTime(doctor?.CreatedOn),
		[doctor?.CreatedOn]
	);
	const modifiedOnLocal = React.useMemo(
		() => formatUtcToLocalDateTime(doctor?.ModifiedOn),
		[doctor?.ModifiedOn]
	);

	if (loading) {
		return (
			<div className="container-fluid py-4">
				<div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
					<div className="skeleton" style={{ height: 40, width: 110, borderRadius: 999 }} />
					<div className="skeleton" style={{ height: 40, width: 120, borderRadius: 10 }} />
				</div>
				<div className="p-3 p-lg-4 mb-4 hc-surface overflow-hidden">
					<div className="row g-4 g-xl-5 align-items-stretch">
						<div className="col-xl-9">
							<div className="d-flex flex-column flex-md-row align-items-center align-items-md-start gap-4 h-100">
								<div className="skeleton" style={{ width: 124, height: 124, borderRadius: 28 }} />
								<div className="flex-grow-1 w-100">
									<div className="d-flex gap-2 mb-3">
										<div className="skeleton" style={{ height: 28, width: 86, borderRadius: 8 }} />
										<div className="skeleton" style={{ height: 28, width: 64, borderRadius: 8 }} />
									</div>
									<div className="skeleton mb-2" style={{ height: 38, width: "72%", borderRadius: 10 }} />
									<div className="skeleton mb-1" style={{ height: 16, width: "86%", borderRadius: 8 }} />
									<div className="skeleton mb-3" style={{ height: 16, width: "58%", borderRadius: 8 }} />
									<div className="skeleton mb-2" style={{ height: 20, width: 110, borderRadius: 8 }} />
									<div className="row g-3">
										<div className="col-12 col-md-6">
											<div className="skeleton" style={{ height: 86, width: "100%", borderRadius: 16 }} />
										</div>
										<div className="col-12 col-md-6">
											<div className="skeleton" style={{ height: 86, width: "100%", borderRadius: 16 }} />
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className="col-xl-3">
							<div className="skeleton h-100" style={{ borderRadius: 16, minHeight: 220 }} />
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!doctor) {
		return (
			<div className="container-fluid py-4">
				<div className="p-4 hc-surface">
					<h5 className="mb-2">Doctor not found</h5>
					<p className="text-muted mb-3">The requested doctor details could not be loaded.</p>
					<button
						type="button"
						className="btn btn-outline-primary"
						onClick={() => navigate(APPRoutes.DOCTORS)}
					>
						Back to Doctors
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="container-fluid py-4">
			<div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
				<button
					type="button"
					className="btn btn-light fw-semibold border shadow-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill"
					onClick={() => navigate(APPRoutes.DOCTORS)}
					style={{ minHeight: 40 }}
				>
					<MdArrowBack size={18} />
					<span>Back</span>
				</button>
				<div className="d-flex gap-2">
					<button
						type="button"
						className="btn hc-bg-primary text-white d-inline-flex align-items-center gap-2"
						onClick={() => navigate(APPRoutes.USERS_EDIT.replace(":id", doctor.UserId))}
					>
						<MdEdit size={18} /> Edit Doctor
					</button>
					<button
						type="button"
						className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
						onClick={() => navigate(APPRoutes.DOCTORS_SCHEDULE.replace(":id", doctor.Id))}
					>
						<MdSchedule size={18} /> Schedule
					</button>
				</div>
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
									width : '100%',
									textAlign: 'center'
								}}
							>
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

			<div className="row g-4 mb-4">
				<div className="col-12">
					<div className="p-4 p-lg-5 hc-surface hc-card-primary">
						<h5 className="fw-bold mb-3 d-flex align-items-center gap-2 hc-text-primary">
							<MdMedicalServices size={22} className="hc-text-primary" /> Doctor Details
						</h5>
						<div className="row g-3">
							<div className="col-12 col-md-6 col-lg-3">
								<div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
									<span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
										<MdPerson size={18} className="hc-text-primary" />
									</span>
									<div className="text-start">
										<div className="small text-muted">Title</div>
										<div className="fw-medium text-dark">{doctor.Title || "-"}</div>
									</div>
								</div>
							</div>
							<div className="col-12 col-md-6 col-lg-3">
								<div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
									<span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
										<MdSettingsSuggest size={18} className="hc-text-primary" />
									</span>
									<div className="text-start">
										<div className="small text-muted">Clinical Role</div>
										<div className="fw-medium text-dark">{doctor.ClinicalRole || "-"}</div>
									</div>
								</div>
							</div>
							<div className="col-12 col-md-6 col-lg-3">
								<div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
									<span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
										<MdSettingsSuggest size={18} className="hc-text-primary" />
									</span>
									<div className="text-start">
										<div className="small text-muted">Specialty</div>
										<div className="fw-medium text-dark">{doctor.Specialty || "-"}</div>
									</div>
								</div>
							</div>
							<div className="col-12 col-md-6 col-lg-3">
								<div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
									<span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
										<MdSettingsSuggest size={18} className="hc-text-primary" />
									</span>
									<div className="text-start">
										<div className="small text-muted">Credential</div>
										<div className="fw-medium text-dark">{doctor.Credential || "-"}</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="row g-4 mb-4">
				<div className="col-12">
					<WorkingHoursBySite
						data={schedules}
						loading={schedulesLoading}
						onFetch={({ weekStart }) => {
							loadSchedules(weekStart);
						}}
						editable={false}
					/>
				</div>
			</div>

			{/* Schedules Section (removed, now handled by WorkingHoursBySite) */}

			{/* Days Off Section */}
			<div className="row g-4 mb-4">
				<div className="col-12">
					<DaysOff
						daysOff={daysOff}
						loading={daysOffLoading}
						addable={false}
						deletable={false}
					/>
				</div>
			</div>

			<div className="row g-4 mb-4">
				<div className="col-12">
					<div className="p-4 p-lg-5 hc-surface hc-card-primary">
						<h5 className="fw-bold mb-3 d-flex align-items-center gap-2 hc-text-primary">
							<MdPerson size={22} className="hc-text-primary" /> Audit Info
						</h5>
						<div className="row g-3">
							<div className="col-12 col-md-6">
								<div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
									<span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
										<MdPerson size={18} className="hc-text-primary" />
									</span>
									<div className="text-start">
										<div className="small text-muted">Created By</div>
										<div className="fw-medium text-dark">{doctor.CreatedBy || "-"}</div>
									</div>
								</div>
							</div>
							<div className="col-12 col-md-6">
								<div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
									<span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
										<MdCalendarMonth size={18} className="hc-text-primary" />
									</span>
									<div className="text-start">
										<div className="small text-muted">Created On</div>
										<div className="fw-medium text-dark">{createdOnLocal}</div>
									</div>
								</div>
							</div>
							<div className="col-12 col-md-6">
								<div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
									<span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
										<MdPerson size={18} className="hc-text-primary" />
									</span>
									<div className="text-start">
										<div className="small text-muted">Modified By</div>
										<div className="fw-medium text-dark">{doctor.ModifiedBy || "-"}</div>
									</div>
								</div>
							</div>
							<div className="col-12 col-md-6">
								<div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
									<span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
										<MdCalendarMonth size={18} className="hc-text-primary" />
									</span>
									<div className="text-start">
										<div className="small text-muted">Modified On</div>
										<div className="fw-medium text-dark">{modifiedOnLocal}</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

