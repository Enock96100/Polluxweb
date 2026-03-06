 import { useContext } from "react";
import { AuthContext } from "./Context";

export default function useAuth(){
    const auth = useContext(AuthContext)

    if(!auth) {
        throw new Error("useAuth doit etre dans un AuthProvider")
    }
    return auth
} 