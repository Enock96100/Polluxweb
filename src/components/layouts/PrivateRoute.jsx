import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../context/auth/utils";

export default function PrivateRoute() {
  const auth = useAuth();
 console.log(auth);
  
  return (auth && auth.user) ? <Outlet /> : <Navigate to="/login" replace />;
}