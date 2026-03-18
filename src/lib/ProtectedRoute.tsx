import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  children: React.ReactNode;
  role?: "admin" | "superadmin";
};

const ProtectedRoute = ({ children, role }: Props) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("Profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!profile) {
        setAllowed(false);
      } else if (role && profile.role !== role) {
        setAllowed(false);
      } else {
        setAllowed(true);
      }

      setLoading(false);
    };

    checkAccess();
  }, [role]);

  if (loading) return <div>Loading...</div>;

  if (!allowed) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
