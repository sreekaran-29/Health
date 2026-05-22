import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import { APPRoutes } from "./Utils/Route";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./Context/AuthContext";
import ProtectedRoute from "./Context/ProtectedRoute";
import LoginPage from "./Pages/SignIn/LoginPage";
import ForgetPasswordPage from "./Pages/SignIn/ForgetPasswordPage";
import ResetPassword from "./Pages/SignIn/ResetPassword";
import ValidationExpires from "./Components/SignIn/ValidationExpires";
import Layout from "./Components/Layout";
import Dashboard from "./Pages/Dashboard/Dashboard";
import ServicesList from "./Pages/Services/ServicesList";
import ServicesView from "./Pages/Services/ServicesView";
// import ServiceForm from "./Pages/Services/ServiceForm";
import ClientsList from "./Pages/Clients/ClientsList";
import ClientsForm from "./Pages/Clients/ClientsForm";
import ClientView from "./Pages/Clients/ClientView";
import SubscriptionList from "./Pages/Subscription/SubscriptionList";
import SubscriptionForm from "./Pages/Subscription/SubscriptionForm";
import SubscriptionView from "./Pages/Subscription/SubscriptionView";
import SubscribersList from "./Pages/Subscription/SubscribersList";
import SubscribersView from "./Pages/Subscription/SubscribersView";
import AuditLogList from "./Pages/AuditLogs/AuditLogList";
import AuditLogView from "./Pages/AuditLogs/AuditLogView";
import RolesList from "./Pages/Roles/RolesList";
import RolesForm from "./Pages/Roles/RolesForm";
import RolesView from "./Pages/Roles/RolesView";
import UsersList from "./Pages/Users/UsersList";
import UsersForm from "./Pages/Users/UsersForm";
import UsersView from "./Pages/Users/UsersView";
import DoctorsList from "./Pages/Doctors/DoctorsList";
import DoctorsView from "./Pages/Doctors/DoctorsView";
import DoctorsSchedule from "./Pages/Doctors/DoctorsSchedule";
import Restricted from "./Components/Restricted/Restricted";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path={APPRoutes.LOGIN} element={<LoginPage />} />
          <Route path={APPRoutes.FORGOT_PASSWORD} element={<ForgetPasswordPage />} />
          <Route path={APPRoutes.RESET_PASSWORD} element={<ResetPassword />} />
          <Route path={APPRoutes.VALIDATION_EXPIRES} element={<ValidationExpires />} />
          <Route path={APPRoutes.RESTRICTED} element={<Restricted />} />

          {/* Protected Routes - Super Admin only */}
          <Route element={<ProtectedRoute requiredRoles={["Super Admin"]} />}>
            <Route element={<Layout />}>
              <Route path={APPRoutes.DASHBOARD} element={<Dashboard />} />
              <Route path={APPRoutes.CLIENTS} element={<ClientsList />} />
              <Route path={APPRoutes.SUBSCRIPTION_MANAGE_PLANS} element={<SubscriptionList />} />
              <Route path={APPRoutes.SUBSCRIPTION_SUBSCRIBERS} element={<SubscribersList />} />
              <Route path={APPRoutes.SUBSCRIPTION_SUBSCRIBER_VIEW} element={<SubscribersView />} />
              <Route path={APPRoutes.SUBSCRIPTION_CREATE} element={<SubscriptionForm />} />
              <Route path={APPRoutes.SUBSCRIPTION_EDIT} element={<SubscriptionForm />} />
              <Route path={APPRoutes.SUBSCRIPTION_VIEW} element={<SubscriptionView />} />
              <Route path={APPRoutes.AUDIT_LOGS} element={<AuditLogList />} />
              <Route path={APPRoutes.AUDIT_LOGS_VIEW} element={<AuditLogView />} />
              <Route path={APPRoutes.SERVICES} element={<ServicesList />} />
              <Route path={APPRoutes.SERVICES_VIEW} element={<ServicesView />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute/>}>
            <Route element={<Layout />}>
              <Route path={APPRoutes.CLIENTS_FORM} element={<ClientsForm />} />
              <Route path={APPRoutes.CLIENTS_EDIT} element={<ClientsForm />} />
              <Route path={APPRoutes.CLIENTS_VIEW} element={<ClientView />} />
              <Route path={APPRoutes.ROLES} element={<RolesList />} />
              <Route path={APPRoutes.ROLES_FORM} element={<RolesForm />} />
              <Route path={APPRoutes.ROLES_EDIT} element={<RolesForm />} />
              <Route path={APPRoutes.ROLES_VIEW} element={<RolesView />} />
              <Route path={APPRoutes.USERS} element={<UsersList />} />
              <Route path={APPRoutes.USERS_FORM} element={<UsersForm />} />
              <Route path={APPRoutes.USERS_EDIT} element={<UsersForm />} />
              <Route path={APPRoutes.USERS_VIEW} element={<UsersView />} />
              <Route path={APPRoutes.DOCTORS} element={<DoctorsList />} />
              <Route path={APPRoutes.DOCTORS_VIEW} element={<DoctorsView />} />
              <Route path={APPRoutes.DOCTORS_SCHEDULE} element={<DoctorsSchedule />} />
            </Route>
          </Route>
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      </Router>
    </AuthProvider>
  )
}

export default App;