import { endpoints, baseurl } from "../Utils/Constants";

export const getAuditLogs = async (token) => {
    try {
        const response = await fetch(baseurl + endpoints.GET_AUDIT_LOGS, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching audit logs:", error);
        throw error;
    }
}

export const getAuditLogById = async (id, token) => {
    try {
        const response = await fetch(baseurl + endpoints.GET_AUDIT_BY_ID + id, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching audit log by ID:", error);
        throw error;
    }
}
