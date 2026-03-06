 import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./Context";
import api from "../../lib/axios";
import { useNavigate } from "react-router-dom";
import parseJWT from "../../lib/parseJWT";

export default function AuthProvider({children}) {
    const navigate  = useNavigate()

    const [user,setUser] = useState(undefined)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    
    const getUser = async () => {
        setLoading(true)
        try {
            const response = await api.get("/admin-agents/user")
            console.log(response)
            if(response && response.data && response.data.success) {
                setUser(response.data.data)
            }
        } catch (error) {
            // console.error("FAILED TO FETCH USER", error)
        } finally {
            setLoading(false)
        }
    }

     const login = async ({email, password}) => {
        setLoading(true)
        setError("");

         try {
            const response = await api.post("/auth/login",
                {
                    email: email.trim(),
                    password: password.trim(),
                },
            );

            if(!response) {
                throw new Error("Données utilisateur non reçues");
            }

            const data = response?.data?.data;

            const tempToken = data?.tempToken

            if (!tempToken) {
                throw new Error("Token non reçu");
            }

            localStorage.setItem("tempToken", tempToken);

            navigate("/code");

        } catch (err) {
            console.error("LOGIN ERROR :", err.response?.data || err.message);
            setError(
                err?.response?.data?.message ||
                err.message ||
                "Erreur lors de la connexion"
            );
        } finally {
            setLoading(false);
        }
    }

const loginWithCode = async ({email, code}) => {
        setError("");
        setLoading(true);

        try {
            if (!email) throw new Error("Email introuvable.");
            if (!code || code.length !== 6) throw new Error("Le code doit contenir 6 chiffres.");
            
            const response = await api.post("/auth/verify-email", {},         
                {
                    params: {
                        email,
                        code,
                        methodReq: "login"
                    }
                }
            );

            console.log(response)

            if(response && response.data) {
                const token = response.data?.data?.token 
                localStorage.setItem("token", token);
                localStorage.removeItem("tempToken");

                window.location.reload()
            }

        } catch (err) {
            const message =
                err.response?.data?.description ||
                err.response?.data?.message ||
                err.message;

            if (message?.toLowerCase().includes("expir")) {
                setError("Votre code a expiré. Cliquez sur 'Code expiré ?' pour en recevoir un nouveau.");
            } else {
                setError(message || "Erreur serveur");
            }

            console.error(err);

        } finally {
            setLoading(false);
        }
    }
       const resendCode = async () => {
    setError("");
    setLoading(true);

    try {
        const tempToken = localStorage.getItem("tempToken");
        if (!tempToken) {
            throw new Error("Session expirée. Veuillez vous reconnecter.");
        }

        const { data } = parseJWT(tempToken);
        const email = data?.email;

        if (!email) {
            throw new Error("Email introuvable.");
        }

        const response = await api.post(
            "/auth/resend-code",
            { email }
        );

        if (response?.data?.success) {
            setError("Code renvoyé avec succès.");
        }

    } catch (err) {
        setError(
            err.response?.data?.message ||
            err.message ||
            "Impossible de renvoyer le code"
        );
    } finally {
        setLoading(false);
    }
};

    const logout = async () => {
        try {
            await api.post("/auth/logout", {})
        } catch (error) {
            console.error("Erreur logout API :", error.response?.data || error.message)
        } finally {
            localStorage.removeItem("token")
            localStorage.removeItem("tempToken")
            setUser(undefined)

            navigate("/login", { replace: true })
        }
    }

 
    useEffect(()=>{
        getUser()
    },[])

    const userInfo = useMemo(()=> {
        if(!user) return undefined
        return user.user
    }, [user])

    const userCompany = useMemo(()=> {
        if(!user) return undefined
        return user.company
    }, [user])

    return <AuthContext.Provider value={{user, userInfo, userCompany, login, loading, error, loginWithCode,resendCode, logout }}>
        {children}
    </AuthContext.Provider>
} 