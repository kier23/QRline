import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCrown,
  faRightFromBracket,
  faUsers,
  faShieldHalved,
  faClipboardList,
  faGear,
} from "@fortawesome/free-solid-svg-icons";

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
        <div className="min-h-screen bg-linear-to-br from-background via-orange-50/30 to-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!superAdmin) {
    return (
      <Layout showNavigation={false}>
        <div className="min-h-screen bg-linear-to-br from-background via-orange-50/30 to-background flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-primary/20">
              {/* Header */}
              <div className="text-center space-y-3 mb-8">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-linear-to-br from-primary to-orange-700 flex items-center justify-center shadow-lg">
                  <FontAwesomeIcon
                    icon={faCrown}
                    className="text-4xl text-white"
                  />
                </div>
                <h2 className="text-3xl font-bold bg-linear-to-r from-primary via-orange-600 to-black bg-clip-text text-transparent">
                  Superadmin Access
                </h2>
                <p className="text-gray-600 text-sm">
                  Enter your credentials to continue
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
                  {error}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-white text-gray-900 placeholder:text-gray-400"
                    placeholder="superadmin@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 block">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-white text-gray-900 placeholder:text-gray-400"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-linear-to-r from-primary via-orange-600 to-primary text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCrown} className="mr-2" /> Login
                      as Superadmin
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNavigation={false}>
      <div className="min-h-screen bg-linear-to-br from-background via-orange-50/30 to-background py-10 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-primary/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-orange-700 flex items-center justify-center shadow-lg">
                  <FontAwesomeIcon
                    icon={faCrown}
                    className="text-3xl text-white"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-linear-to-r from-primary via-orange-600 to-black bg-clip-text text-transparent">
                    Superadmin Console
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Welcome,{" "}
                    <span className="font-semibold">{superAdmin.name}</span> (
                    {superAdmin.email})
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-linear-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="mr-2" />{" "}
                Logout
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-primary/20 hover:shadow-xl transition-all transform hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faUsers}
                    className="text-2xl text-blue-600"
                  />
                </div>
                <p className="text-sm text-gray-500 font-semibold">Accounts</p>
              </div>
              <p className="text-4xl font-extrabold text-gray-800">
                {metrics.totalUsers}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-primary/20 hover:shadow-xl transition-all transform hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faShieldHalved}
                    className="text-2xl text-purple-600"
                  />
                </div>
                <p className="text-sm text-gray-500 font-semibold">Admins</p>
              </div>
              <p className="text-4xl font-extrabold text-gray-800">
                {metrics.totalAdmins}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-primary/20 hover:shadow-xl transition-all transform hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-green-100 to-green-200 flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faClipboardList}
                    className="text-2xl text-green-600"
                  />
                </div>
                <p className="text-sm text-gray-500 font-semibold">Queues</p>
              </div>
              <p className="text-4xl font-extrabold text-gray-800">
                {metrics.totalQueues}
              </p>
            </div>
          </div>

          {/* Account Management Table */}
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-primary/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                <FontAwesomeIcon
                  icon={faGear}
                  className="text-2xl text-primary"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Account Management
              </h2>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full">
                <thead className="bg-linear-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {accounts.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {row.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {row.email}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                            row.role === "superadmin"
                              ? "bg-purple-100 text-purple-800"
                              : row.role === "admin"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {row.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {row.role !== "superadmin" ? (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => updateRole(row.id, "admin")}
                              className="px-3 py-2 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                              disabled={loading}
                            >
                              Make Admin
                            </button>
                            <button
                              onClick={() => updateRole(row.id, "user")}
                              className="px-3 py-2 bg-linear-to-r from-gray-500 to-gray-600 text-white rounded-lg text-xs font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                              disabled={loading}
                            >
                              Make User
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            ✓ Superadmin
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
