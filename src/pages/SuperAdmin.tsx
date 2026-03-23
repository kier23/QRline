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
  faUserPlus,
  faTrash,
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

  // Invite dialog state
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState<number>(2);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation state
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "success" });

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

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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

  // ✅ Invite user function
  const handleInviteSubmit = async () => {
    if (!inviteEmail || !inviteRoleId) {
      setNotification({
        show: true,
        message: "Please provide both email and role",
        type: "error",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke(
        "invite_admin_creator",
        {
          body: {
            email: inviteEmail.trim(),
            role_id: inviteRoleId,
            redirect_base: `${window.location.origin}/Signup`,
          },
        }
      );

      if (error) throw error;

      setNotification({
        show: true,
        message: "✅ Invite sent successfully!",
        type: "success",
      });
      setOpenInviteDialog(false);
      setInviteEmail("");
      setInviteRoleId(2);
    } catch (err: any) {
      setNotification({
        show: true,
        message: `❌ Failed to send invite: ${err.message || "Unknown error"}`,
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Delete user function (adapted from SuperAdminAC)
  const handleDeleteClick = (user: { id: string; name: string; email: string }) => {
    setSelectedUser(user);
    setOpenDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError(null);

    try {
      // Delete user's tickets first (if any)
      const { error: ticketsError } = await supabase
        .from("Tickets")
        .delete()
        .eq("user_id", selectedUser.id);

      if (ticketsError) {
        throw new Error(`Failed to delete user tickets: ${ticketsError.message}`);
      }

      // Delete user's profile
      const { error: profileError } = await supabase
        .from("Profiles")
        .delete()
        .eq("id", selectedUser.id);

      if (profileError) {
        throw new Error(`Failed to delete profile: ${profileError.message}`);
      }

      // Delete the Auth user (requires admin privileges)
      const { error: authError } = await supabase.auth.admin.deleteUser(selectedUser.id);

      if (authError) {
        throw new Error(`Failed to delete auth user: ${authError.message}`);
      }

      // Remove from local state
      setAccounts((prev) => prev.filter((u) => u.id !== selectedUser.id));
      
      setNotification({
        show: true,
        message: `🗑️ ${selectedUser.name || selectedUser.email} has been deleted.`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Delete error:", err);
      setNotification({
        show: true,
        message: `❌ Failed to delete user: ${err.message || "Unknown error"}`,
        type: "error",
      });
    } finally {
      setOpenDeleteConfirm(false);
      setSelectedUser(null);
      setLoading(false);
      await loadSuperAdminData();
    }
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
              <div className="flex gap-3">
                <button
                  onClick={() => setOpenInviteDialog(true)}
                  className="px-6 py-3 bg-linear-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  <FontAwesomeIcon icon={faUserPlus} className="mr-2" /> Invite
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 bg-linear-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} className="mr-2" />{" "}
                  Logout
                </button>
              </div>
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
                            <button
                              onClick={() => handleDeleteClick({ id: row.id, name: row.name, email: row.email })}
                              className="px-3 py-2 bg-linear-to-r from-red-500 to-red-600 text-white rounded-lg text-xs font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                              disabled={loading}
                            >
                              <FontAwesomeIcon icon={faTrash} />
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

          {/* Invite User Dialog */}
          {openInviteDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-primary/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold bg-linear-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                    Invite User
                  </h3>
                  <button
                    onClick={() => setOpenInviteDialog(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white text-gray-900 placeholder:text-gray-400"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">
                      Role
                    </label>
                    <select
                      value={inviteRoleId}
                      onChange={(e) => setInviteRoleId(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white text-gray-900"
                    >
                      <option value={2}>Canteen Admin</option>
                      <option value={3}>Hostel Admin</option>
                      <option value={4}>Auditor</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setOpenInviteDialog(false)}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInviteSubmit}
                      disabled={submitting}
                      className="flex-1 px-6 py-3 bg-linear-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {submitting ? "Sending..." : "Send Invite"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          {openDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-red-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <FontAwesomeIcon icon={faTrash} className="text-red-600 text-xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-red-600">Confirm Deletion</h3>
                </div>

                <p className="text-gray-700 mb-6">
                  Are you sure you want to permanently delete{" "}
                  <span className="font-bold text-gray-900">
                    {selectedUser?.name || selectedUser?.email}
                  </span>
                  ? This action cannot be undone.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setOpenDeleteConfirm(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 px-6 py-3 bg-linear-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notification Toast */}
          {notification.show && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
              <div
                className={`px-6 py-4 rounded-xl shadow-2xl border ${
                  notification.type === "success"
                    ? "bg-green-500 text-white border-green-600"
                    : notification.type === "error"
                    ? "bg-red-500 text-white border-red-600"
                    : "bg-blue-500 text-white border-blue-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  {notification.type === "success" && (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {notification.type === "error" && (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {notification.type === "info" && (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="font-semibold">{notification.message}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SuperAdmin;
