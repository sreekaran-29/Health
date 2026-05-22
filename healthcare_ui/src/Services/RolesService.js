import { endpoints, baseurl } from "../Utils/Constants";

export const getAllRoles = async (token) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_ALL_ROLES, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching roles:", error);
        throw error;
    }
};

export const getRoleById = async (id, token) => {
    try{
        const response = await fetch(`${baseurl + endpoints.GET_ROLE_BY_ID}${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error(`Error fetching role with ID ${id}:`, error);
        throw error;
    }
};

export const saveRole = async (roleData, token) => {
    try{
        const response = await fetch(baseurl + endpoints.SAVE_ROLE, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(roleData)
        });
        return await response.json();
    } catch (error) {
        console.error("Error saving role:", error);
        throw error;
    }
};

export const getAllPermissions = async (token) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_ALL_PERMISSIONS, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching permissions:", error);
        throw error;
    }
};

export const deleteRole = async (id, token) => {
    try{
        const response = await fetch(`${baseurl + endpoints.DELETE_ROLE}${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error(`Error deleting role with ID ${id}:`, error);
        throw error;
    }
};

export const getRolesName = async (token) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_ROLES_NAMES, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching roles name:", error);
        throw error;
    }
};