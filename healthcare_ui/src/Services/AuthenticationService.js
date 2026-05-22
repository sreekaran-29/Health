import { endpoints, baseurl } from "../Utils/Constants";

export const checkEmail = async (email) => {
  try {
    const response = await fetch(baseurl + endpoints.CHECKEMAIL + email,{
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
    }).then(
      (res) => res.json()
    );

    return response;
  } catch (error) {
    console.error("Error checking email:", error);
    throw error;
  }
};

export const login = async (data) => {
  try {
    const response = await fetch(baseurl + endpoints.LOGIN, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then((res) => res.json());

    return response;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}

export const forgotPassword = async (email) => {
  try {
    const response = await fetch(baseurl + endpoints.FORGOT_PASSWORD + email, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
    }).then((res) => res.json());
    return response;
  } catch (error) {
    console.error("Error sending forgot password request:", error);
    throw error;
  }
};

export const checkValidity = async(email) => {
  try {
    const response = await fetch(baseurl + endpoints.CHECKVALIDITY + email, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
    }).then((res) => res.json());
    return response;
  } catch (error) {
    console.error("Error checking link validity:", error);
    throw error;
  }
}

export const updatePassword = async (data) => {
  try{
    const response = await fetch(baseurl + endpoints.UPDATE_PASSWORD, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then((res) => res.json());

    return response;
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
}
