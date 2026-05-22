import { endpoints, baseurl } from "../Utils/Constants";

export const getAllUsers = async (token) => {
    try {
        const response = await fetch(baseurl + endpoints.GET_USERS, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
};

export const getUserById = async (id, token) => {
    try {
        const response = await fetch(`${baseurl + endpoints.GET_USER_BY_ID}${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching user:", error);
        throw error;
    }
};

export const saveUser = async (userData, token) => {
    try {
        const response = await fetch(baseurl + endpoints.SAVE_USER, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        return await response.json();
    } catch (error) {
        console.error("Error saving user:", error);
        throw error;
    }
};

export const deleteUser = async (id, token) => {
    try {
        const response = await fetch(`${baseurl + endpoints.DELETE_USER}${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    }
};