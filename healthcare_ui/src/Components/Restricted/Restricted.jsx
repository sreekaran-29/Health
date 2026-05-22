import React from "react";
import restrictedImg from "../../Assets/Images/Restricted2.png";
import { useNavigate } from "react-router-dom";
import { APPRoutes } from "../../Utils/Route";

const Restricted = () => {
    const navigate = useNavigate();
    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center hc-auth-page-bg" style={{background: "radial-gradient(circle at 70% 20%, #dbeafe 0%, #fff 100%)"}}>
            <div className="container px-md-5">
                <div className="row align-items-center" style={{minHeight: "80vh"}}>
                    {/* LEFT */}
                    <div className="col-12 col-lg-6 p-md-5 px-5  order-2 order-lg-1">
                        <h1 className="fw-bold display-2 mb-2 hc-text-primary d-none d-lg-block">403</h1>
                        <h2 className="fw-semibold fs-2 mb-3 d-none d-lg-block" style={{ color: "#17233d" }}>Access Forbidden</h2>
                        <p className="mb-4 fs-5" style={{ color: "#6c7f9b" }}>
                            You don’t have permission to access this page. Please go back to home or contact your administrator.
                        </p>
                        <div className="d-flex flex-column flex-md-row gap-3">
                            <button
                                className="btn w-100 fw-semibold text-light px-4 py-2 rounded-4 border-0 hc-btn-primary-gradient"
                                style={{ fontSize: "1.1rem" }}
                                onClick={() => navigate(-1)}
                            >
                                Go Back
                            </button>
                            <button
                                className="btn btn-outline-primary px-4 py-2 w-100 rounded-4 fw-semibold"
                                style={{ fontSize: "1.1rem", borderWidth: 2 }}
                                onClick={() => navigate(APPRoutes.LOGIN)}
                            >
                                Home
                            </button>
                        </div>
                    </div>
                    {/* RIGHT */}
                    <div className="col-12 col-lg-6 order-1 order-lg-2 d-flex justify-content-center align-items-center py-5">
                            <img src={restrictedImg} alt="403 Forbidden" style={{ maxWidth: 980, width: "100%" }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Restricted;