import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { MdMenu } from "react-icons/md";
import SideBar from "./SideBar/SideBar";
import { APPRoutes } from "../Utils/Route";
import { useAuth } from "../Context/AuthContext";

export default function Layout() {
    const organizationName = "HealthCare Organization Name";
    const organizationShortName = organizationName.trim().split(/\s+/)[0] || organizationName;
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { logout, decodedToken } = useAuth();
    const userName = decodedToken?.username || "User";
    const userRole = decodedToken?.role || "User";
    const userInitials = (() => {
        const parts = userName
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }

        if (parts.length === 1) {
            const single = parts[0];
            if (single.length === 1) {
                return `${single[0]}${single[0]}`.toUpperCase();
            }
            return `${single[0]}${single[single.length - 1]}`.toUpperCase();
        }

        return "NA";
    })();
    const handleLogout = () => {
        logout();
        setIsSidebarOpen(false);
        navigate(APPRoutes.LOGIN);
    };

    const handleSidebarToggle = () => {
        if (window.innerWidth >= 992) {
            setIsSidebarCollapsed((prev) => !prev);
            return;
        }

        setIsSidebarOpen((prev) => !prev);
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 992) {
                setIsSidebarOpen(false);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const handleEscClose = (event) => {
            if (event.key === "Escape") {
                setIsSidebarOpen(false);
            }
        };

        if (isSidebarOpen) {
            window.addEventListener("keydown", handleEscClose);
        }

        return () => window.removeEventListener("keydown", handleEscClose);
    }, [isSidebarOpen]);

    return (
        <div className="container-fluid px-0 bg-light min-vh-100">
            <div className="row g-0 flex-nowrap">
                <aside className={`d-none d-lg-block p-0 hc-desktop-sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
                    <div className="hc-sidebar-surface hc-desktop-sidebar-inner d-flex flex-column vh-100 overflow-auto p-3">
                        <SideBar onLogout={handleLogout} />
                    </div>
                </aside>

                <main className="col vh-100 d-flex flex-column hc-main-content">
                    <div className="navbar bg-white border-bottom shadow-sm px-3 py-2">
                        <div className="container-fluid px-0 d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary d-inline-flex align-items-center justify-content-center d-lg-none"
                                    onClick={handleSidebarToggle}
                                    aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                                >
                                    <MdMenu size={22} />
                                </button>
                                <span className="d-inline d-md-none fw-semibold fs-4 px-2 px-md-0 text-primary-emphasis">{organizationShortName}</span>
                                <span className="d-none d-md-inline fw-semibold fs-4 px-2 px-md-0 text-primary-emphasis">{organizationName}</span>
                            </div>

                            <span
                                className="d-inline-flex d-md-none align-items-center justify-content-center rounded-circle bg-primary text-white fw-semibold"
                                style={{ width: "30px", height: "30px" }}
                            >
                                {userInitials}
                            </span>

                            <div className="d-none d-md-flex align-items-center gap-2 border rounded-pill px-2 py-1 bg-body-tertiary">
                                <span
                                    className="d-inline-flex align-items-center justify-content-center rounded-circle hc-bg-primary text-white fw-semibold"
                                    style={{ width: "30px", height: "30px"  }}
                                >
                                    {userInitials}
                                </span>
                                <div className="d-flex flex-column pe-2 lh-sm">
                                    <span className="fw-semibold text-dark" style={{fontSize: "12px"}}>{userName}</span>
                                    <small className="text-secondary" style={{fontSize: "11px"}}>{userRole}</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-2 p-md-3 flex-grow-1 overflow-auto position-relative">
                        <Outlet />
                    </div>
                </main>
            </div>

            <div
                className={`offcanvas offcanvas-start d-lg-none ${isSidebarOpen ? "show" : ""}`}
                style={{ visibility: isSidebarOpen ? "visible" : "hidden" }}
                aria-hidden={!isSidebarOpen}
            >
                <div className="offcanvas-header hc-sidebar-surface border-bottom border-primary-subtle d-flex justify-content-between align-items-center">
                    <h5 className="offcanvas-title text-white">Menu</h5>
                    <button
                        type="button"
                        className="btn btn-danger border-0  d-inline-flex align-items-center justify-content-center"
                        style={{height:"28px"}}
                        onClick={() => setIsSidebarOpen(false)}
                        aria-label="Close"
                    >
                        X
                    </button>
                </div>
                <div className="offcanvas-body hc-sidebar-surface d-flex flex-column p-3">
                    <SideBar onNavigate={() => setIsSidebarOpen(false)} onLogout={handleLogout} />
                </div>
            </div>

            {isSidebarOpen ? (
                <button
                    type="button"
                    className="offcanvas-backdrop fade show d-lg-none border-0 p-0"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-label="Close sidebar"
                />
            ) : null}
        </div>
    );
}