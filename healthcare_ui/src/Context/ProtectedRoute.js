import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ requiredRoles }) {
  const { token, decodedToken, logout } = useAuth();

  // No token? → redirect to login
  if (!token) {
    return <Navigate to={"/"} replace />;
  }

  let decoded;
  try {
    decoded = decodedToken || jwtDecode(token);
  } catch {
    Promise.resolve().then(logout);
    return <Navigate to={"/"} replace />;
  }

  // Check token expiry
  if (decoded.exp * 1000 < Date.now()) {
    // Let AuthContext handle expiry via modal-driven re-authentication flow.
    return <Outlet />;
  }

  // Check role access if requiredRoles is provided
  if (requiredRoles && !requiredRoles.map(r => r.toLowerCase()).includes((decoded.role || "").toLowerCase())) {
    return <Navigate to="/restricted" replace />;
  }

  return <Outlet />;
}
