import { endpoints, baseurl } from "../Utils/Constants";

export const saveClient = async (data, token) => {
    try{
        const response = await fetch(baseurl + endpoints.SAVE_CLIENT, {
            method: "POST",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            },
            body: data
        });
        return await response.json();
    } catch (error) {
        console.error("Error saving client:", error);
        throw error;
    }
}

export const getClients = async (token) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_CLIENTS, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {        
        console.error("Error fetching clients:", error);
        throw error;
    }
}

export const getClientLogo = async (clientId, token) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_CLIENT_LOGO + clientId, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching client logo:", error);
        throw error;
    }
}

export const getClientById = async (clientId, token) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_CLIENT_BY_ID + clientId, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching client by ID:", error);
        throw error;
    }
}

export const deleteClientById = async (clientId, token) => {
    try{
        const response = await fetch(baseurl + endpoints.DELETE_CLIENT + clientId, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error deleting client by ID:", error);
        throw error;
    }
}

export const getAllClientNames = async (token) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_ALL_CLIENT_NAMES, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching all client names:", error);
        throw error;
    }
}