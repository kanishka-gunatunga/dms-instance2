/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosProgressEvent } from "axios";
import Cookies from "js-cookie";

export const API_BASE_URL =
  // process.env.NEXT_PUBLIC_API_BASE_URL ||
  // "https://dms1.genaitech.dev/api/";
process.env.NEXT_PUBLIC_API_BASE_URL ||
"https://dms3.genaitech.dev/api/";

if (!API_BASE_URL) {
  throw new Error("API base URL is not defined in environment variables.");
}

export async function postWithAuth(
  endpoint: string,
  formData: FormData
): Promise<any> {
  const token = Cookies.get("authToken");

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
      body: formData,
    });

    const rawResponse = await response.text();
    const data = JSON.parse(rawResponse);

    if (response.status === 403 && data?.error === "LICENSE_INVALID") {
      window.location.href = "/license-invalid";
      return;
    }

    if (response.status === 403 && data?.error === "CONCURRENT_USER_LIMIT") {
      window.location.href = "/concurrent-limit";
      return;
    }

    return data;
  } catch (error) {
    console.error("Error during POST request:", error);
    throw error;
  }
}

export async function postAxiosWithAuth(
  endpoint: string,
  formData: FormData,
  config?: { onUploadProgress?: (progressEvent: AxiosProgressEvent) => void }
): Promise<any> {
  const token = Cookies.get("authToken");

  try {
    const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
      headers: {
        Authorization: `Bearer ${token || ""}`,
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: config?.onUploadProgress,
    });

    return response.data;
  } catch (error: any) {
    if (
      error.response?.status === 403 &&
      error.response?.data?.error === "LICENSE_INVALID"
    ) {
      window.location.href = "/license-invalid";
      return;
    }

    if (
      error.response?.status === 403 &&
      error.response?.data?.error === "CONCURRENT_USER_LIMIT"
    ) {
      window.location.href = "/concurrent-limit";
      return;
    }

    console.error("Error during POST request:", error);
    throw error;
  }
}

export async function postWithAuthXML(
  endpoint: string,
  formData: FormData,
  onProgress: (progress: number, fileName: string) => void
): Promise<any> {
  const token = Cookies.get("authToken");

  const xhr = new XMLHttpRequest();

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress(progress, formData.get("upload_file")?.toString() || "Unknown");
    }
  };


  try {
    return new Promise((resolve, reject) => {
      xhr.open("POST", `${API_BASE_URL}${endpoint}`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token || ""}`);

      xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);

        if (xhr.status === 403 && data?.error === "LICENSE_INVALID") {
          window.location.href = "/license-invalid";
          return;
        }

        if (xhr.status === 403 && data?.error === "CONCURRENT_USER_LIMIT") {
          window.location.href = "/concurrent-limit";
          return;
        }

        if (xhr.status === 200 || xhr.status === 201) {
          resolve(data);
        } else {
          reject(new Error(`Request failed with status ${xhr.status}`));
        }
      } catch (e) {
        reject(e);
      }
    };

      xhr.onerror = () => {
        console.error("Network error");
        reject(new Error("Network error"));
      };

      xhr.send(formData);
    });
  } catch (error) {
    console.error("Error during POST request:", error);
    throw error;
  }
}


export async function getWithAuth(endpoint: string): Promise<any> {
  const token = Cookies.get("authToken");

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
    });

    const rawResponse = await response.text();
    const data = JSON.parse(rawResponse);

    if (response.status === 403 && data?.error === "LICENSE_INVALID") {
      window.location.href = "/license-invalid";
      return;
    }

    if (response.status === 403 && data?.error === "CONCURRENT_USER_LIMIT") {
      window.location.href = "/concurrent-limit";
      return;
    }

    return data;
  } catch (error) {
    console.error("Error during GET request:", error);
    throw error;
  }
}


export async function deleteWithAuth(endpoint: string): Promise<any> {
  const token = Cookies.get("authToken");

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
    });

    const rawResponse = await response.text();
    const data = JSON.parse(rawResponse);

    if (response.status === 403 && data?.error === "LICENSE_INVALID") {
      window.location.href = "/license-invalid";
      return;
    }

    if (response.status === 403 && data?.error === "CONCURRENT_USER_LIMIT") {
      window.location.href = "/concurrent-limit";
      return;
    }

    return data;
  } catch (error) {
    console.error("Error during GET request:", error);
    throw error;
  }
}


export async function deleteAllWithAuth(
  endpoint: string,
  formData: FormData
): Promise<any> {
  const token = Cookies.get("authToken");

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
      body: formData,
    });

    const rawResponse = await response.text();
    const data = JSON.parse(rawResponse);

    if (response.status === 403 && data?.error === "LICENSE_INVALID") {
      window.location.href = "/license-invalid";
      return;
    }

    if (response.status === 403 && data?.error === "CONCURRENT_USER_LIMIT") {
      window.location.href = "/concurrent-limit";
      return;
    }

    return data;
  } catch (error) {
    console.error("Error during POST request:", error);
    throw error;
  }
}

export async function getBlobWithAuth(endpoint: string): Promise<Blob> {
  const token = Cookies.get("authToken");

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
    });

    if (!response.ok) {
      return new Blob();
    }

    return await response.blob();
  } catch (error) {
    console.error("Error during blob GET request:", error);
    return new Blob();
  }
}