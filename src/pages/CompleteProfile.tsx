import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const CompleteProfile = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("Invalid or expired invite link");
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (!user) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }
    const { error: passwordError } = await supabase.auth.updateUser({
      password: password,
    });
    if (passwordError) {
      setError(passwordError.message);
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("Profiles").insert({
      id: user.id,
      name: username,
      email: user.email,
      role: "admin",
    });
    if (profileError) {
      setError(profileError.message);
    } else {
      alert("Profile completed successfully!");
      window.location.href = "/";
      setError(null);
    }
    setLoading(false);
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow"
      >
        <h2 className="text-2xl font-bold text-center">
          Complete Your Profile
        </h2>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="mb-3">
          <label className="block text-sm mb-1">Username</label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Create Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
            placeholder="Create Password"
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-200"
          disabled={loading}
        >
          {loading ? "Completing Profile..." : "Complete Profile"}
        </button>
      </form>
    </main>
  );
};

export default CompleteProfile;
