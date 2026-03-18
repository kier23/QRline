import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AccountRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const SuperAdmin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(true);
  const [superAdmin, setSuperAdmin] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalQueues: 0,
  });

  const navigate = useNavigate();

  const loadSuperAdminData = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSuperAdmin(null);
      setAuthenticating(false);
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("Profiles")
      .select("id, name, email, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData) {
      setError(profileError?.message || "No profile found for this account");
      setSuperAdmin(null);
      setAuthenticating(false);
      setLoading(false);
      return;
    }

    if (profileData.role !== "superadmin") {
      setError("Unauthorized access: superadmin role required");
      setSuperAdmin(null);
      setAuthenticating(false);
      setLoading(false);
      return;
    }

    setSuperAdmin(profileData);

    const [profilesRes, queueRes] = await Promise.all([
      supabase.from("Profiles").select("id, name, email, role"),
      supabase.from("Queue").select("id", { count: "exact", head: true }),
    ]);

    const allProfiles = profilesRes.data;
    const profilesError = profilesRes.error;
    const queueError = queueRes.error;
    const queueCount = typeof queueRes.count === "number" ? queueRes.count : 0;

    if (profilesError) {
      setError(profilesError.message);
    } else {
      const profileList: AccountRow[] = (allProfiles as any[]).map((item) => ({
        id: item.id,
        name: item.name || "-",
        email: item.email || "-",
        role: item.role || "user",
      }));
      setAccounts(profileList);
      const totalUsers = profileList.length;
      const totalAdmins = profileList.filter((p) => p.role === "admin").length;
      const totalSuperAdmins = profileList.filter(
        (p) => p.role === "superadmin",
      ).length;
      setMetrics({
        totalUsers,
        totalAdmins: totalAdmins + totalSuperAdmins,
        totalQueues: queueCount,
      });
    }

    if (queueError && !error) {
      setError(queueError.message);
    }

    setAuthenticating(false);
    setLoading(false);
  };

  useEffect(() => {
    loadSuperAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    await loadSuperAdminData();
    setEmail("");
    setPassword("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSuperAdmin(null);
    setAccounts([]);
    setMetrics({ totalUsers: 0, totalAdmins: 0, totalQueues: 0 });
    navigate("/");
  };

  const updateRole = async (userId: string, desiredRole: string) => {
    setLoading(true);
    setError(null);
    const { error: roleError } = await supabase
      .from("Profiles")
      .update({ role: desiredRole })
      .eq("id", userId);

    if (roleError) {
      setError(roleError.message);
      setLoading(false);
      return;
    }

    await loadSuperAdminData();
  };

  if (authenticating) {
    return (
      <Layout showNavigation={false}>
        <div className="h-[70vh] flex items-center justify-center">
          Loading...
        </div>
      </Layout>
    );
  }

  if (!superAdmin) {
    return (
      <Layout showNavigation={false}>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              Superadmin Login
            </h2>
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-red-800 border border-red-200">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full px-4 py-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 w-full px-4 py-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Login as Superadmin"}
              </button>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNavigation={false}>
      <div className="min-h-screen bg-gray-100 py-10 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Superadmin Console
              </h1>
              <p className="text-gray-600">
                Welcome, {superAdmin.name} ({superAdmin.email})
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-white p-5 rounded-2xl shadow">
              <p className="text-sm text-gray-500">Total Accounts</p>
              <p className="mt-2 text-3xl font-bold text-gray-800">
                {metrics.totalUsers}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow">
              <p className="text-sm text-gray-500">Total Admins</p>
              <p className="mt-2 text-3xl font-bold text-gray-800">
                {metrics.totalAdmins}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow">
              <p className="text-sm text-gray-500">Total Queues</p>
              <p className="mt-2 text-3xl font-bold text-gray-800">
                {metrics.totalQueues}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Account Management
            </h2>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                {error}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accounts.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.role}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {row.role !== "superadmin" ? (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => updateRole(row.id, "admin")}
                              className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs"
                              disabled={loading}
                            >
                              Make Admin
                            </button>
                            <button
                              onClick={() => updateRole(row.id, "user")}
                              className="px-2 py-1 bg-gray-200 text-gray-800 rounded-lg text-xs"
                              disabled={loading}
                            >
                              Make User
                            </button>
                          </div>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs">
                            Superadmin
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SuperAdmin;
