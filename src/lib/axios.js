
import axios from "axios";

const API_BASE = "https://youapi.youneed.app/pollux/dev/api";

const api = axios.create({
    baseURL: API_BASE
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if(token){
            config.headers.Authorization = `Bearer ${token}`
        }
        config.headers["Content-Type"] = "application/json"
        return config
    },
    (error) => {
        Promise.reject(error)
    }
)


export default api