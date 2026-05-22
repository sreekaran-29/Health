import { endpoints, baseurl } from "../Utils/Constants";

export const getAllDoctors = async (token) => {
    try{
        const response = await fetch(baseurl + endpoints.GET_ALL_DOCTORS, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching doctors:', error);
        throw error;
    }
};

export const deleteDoctor = async (id, token) => {
    try {
        const response = await fetch(baseurl + endpoints.DELETE_DOCTOR + id, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error deleting doctor:', error);
        throw error;
    }
};

export const getSchedules = async (id, date, token) => {
    try {
        const response = await fetch(baseurl + endpoints.GET_SCHEDULES + id + `/${date}`, {
            method: 'GET',
            headers: {      
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching schedules:', error);
        throw error;
    }
};

export const getDoctorById = async (id, token) => {
    try {
        const response = await fetch(baseurl + endpoints.GET_DOCTOR_BY_ID + id, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching doctor by ID:', error);
        throw error;
    }
};

export const getDaysOff = async (id, token) => {
    try {
        const response = await fetch(baseurl + endpoints.GET_DAYS_OFF + id, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching days off:', error);
        throw error;
    }
};

export const saveDoctorSchedule = async (scheduleData, token) => {
    try {
        const response = await fetch(baseurl + endpoints.SAVE_DOCTOR_SCHEDULE, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(scheduleData)
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error saving doctor schedule:', error);
        throw error;
    }
};

export const saveDoctorDaysOff = async (daysOffData, token) => {
    try {
        const response = await fetch(baseurl + endpoints.SAVE_DOCTOR_DAYS_OFF, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(daysOffData)
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error saving doctor days off:', error);
        throw error;
    }
};

export const deleteDoctorSchedule = async (id, token) => {
    try {
        const response = await fetch(baseurl + endpoints.DELETE_DOCTOR_SCHEDULE + id, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error deleting doctor schedule:', error);
        throw error;
    }
};

export const deleteDoctorsDaysOff = async (id, token) => {
    try {
        const response = await fetch(baseurl + endpoints.DELETE_DOCTOR_DAYS_OFF + id, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error deleting doctor days off:', error);
        throw error;
    }
};