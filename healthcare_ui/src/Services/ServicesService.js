import { endpoints, baseurl } from "../Utils/Constants";

export const getAllServices = async(token) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_ALL_SERVICES, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    }catch (error) {
        console.error("Error fetching services:", error);
        throw error;
    }
}

export const getServiceById = async(token, serviceId) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_SERVICE_BY_ID + serviceId, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    }catch (error) {
        console.error("Error fetching service by ID:", error);
        throw error;
    }
}

export const saveService = async(token, serviceData) => {
    try{
        const response = await fetch(baseurl + endpoints.SAVE_SERVICES, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(serviceData)
        });
        return await response.json();
    }catch (error) {
        console.error("Error saving service:", error);
        throw error;
    }
}

export const deleteService = async(token, serviceId) => {
    try{
        const response = await fetch(baseurl + endpoints.DELETE_SERVICE + serviceId, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    }catch (error) {
        console.error("Error deleting service:", error);
        throw error;
    }
}