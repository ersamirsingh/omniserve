import { useSelector } from "react-redux";
import Spinner from "../components/ui/Spinner";
import { Navigate } from "react-router-dom";

export default function AuthRoute({ children }) {
  const { isAuthenticated, authChecked } = useSelector((state) => state.auth);

  if (!authChecked) {
    return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}