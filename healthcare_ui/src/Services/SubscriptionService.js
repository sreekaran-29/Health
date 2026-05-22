import { endpoints, baseurl } from "../Utils/Constants";

export const getAllSubscriptions = async (token) => {
    try {
        const response = await fetch(baseurl + endpoints.GET_SUBSCRIPTIONS, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching subscriptions:", error);
        throw error;
    }
}

export const getSubscriptionById = async (id, token) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_SUBSCRIPTION_BY_ID+id, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error(`Error fetching subscription with ID ${id}:`, error);
        throw error;
    }
}

export const deleteSubscriptionById = async (id, token) => {
    try{
        const response = await fetch(baseurl + endpoints.DELETE_SUBSCRIPTION + id, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error(`Error deleting subscription with ID ${id}:`, error);
        throw error;
    }
}

export const saveSubscription = async (subscriptionData, token) => {
    try {
        const response = await fetch(baseurl + endpoints.SAVE_SUBSCRIPTION, {
            method: "POST",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(subscriptionData)
        });
        return await response.json();
    } catch (error) {
        console.error("Error saving subscription:", error);
        throw error;
    }
}

export const getAllSubscribers = async (token) => {
    try {
        const response = await fetch(baseurl + endpoints.GET_ALL_SUBSCRIBERS, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching subscribers:", error);
        throw error;
    }
}

export const getSubscriberById = async (id, token) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_SUBSCRIBER_BY_ID+id, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error(`Error fetching subscriber with ID ${id}:`, error);
        throw error;
    }
}

export const getAllPlansPrices = async (token) => {
    try {
        const response = await fetch(baseurl + endpoints.GET_ALL_PLANS_PRICES, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching all plans prices:", error);
        throw error;
    }
}

export const createPaymentLink = async (paymentData, token) => {
    try {
        const response = await fetch(baseurl + endpoints.CREATE_PAYMENT_LINK, {
            method: "POST",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(paymentData)
        });
        return await response.json();
    } catch (error) {
        console.error("Error creating payment link:", error);
        throw error;
    }   
}

export const getAllTransactions = async (sub_id, acc_id, token) => {
    try {
        const response = await fetch(baseurl + endpoints.GET_TRANSACTIONS + `${sub_id}/${acc_id}`, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching transactions:", error);
        throw error;
    }
}

export const downloadInvoice = async (fileId, token) => {
    try {
        const response = await fetch(baseurl + endpoints.DOWNLOAD_INVOICE + fileId, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error(`Error downloading invoice with ID ${fileId}:`, error);
        throw error;
    }
}

export const cancelSubscription = async (subscriptionId, token) => {
    try {
        const response = await fetch(baseurl + endpoints.CANCEL_SUBSCRIPTION + subscriptionId, {
            method: "GET",
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Authorization": `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error(`Error canceling subscription with ID ${subscriptionId}:`, error);
        throw error;
    }
}