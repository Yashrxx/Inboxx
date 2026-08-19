import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Mail, Shield, Calendar, Key, Check, Pencil, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile — " + BRAND_NAME }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const [fullName, setFullName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let name = "";
    if (user?.user_metadata?.full_name) {
      name = user.user_metadata.full_name;
    } else {
      name = user?.email?.split("@")[0] || "";
    }
    setFullName(name);
    setOriginalName(name);
  }, [user]);

  const handleButtonClick = (e: React.MouseEvent) => {
    if (!isEditing) {
      e.preventDefault();
      setIsEditing(true);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;

    if (!fullName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      if (error) throw error;
      toast.success("Profile updated successfully");
      setOriginalName(fullName.trim());
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  const userInitial = fullName ? fullName.charAt(0).toUpperCase() : "U";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Title & Breadcrumb */}
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account profile details and preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Avatar & Summary */}
        <div className="md:col-span-1 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f0533c] text-3xl font-extrabold text-white shadow-md">
            {userInitial}
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 truncate max-w-full">{fullName}</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1 truncate max-w-full">
            {user?.email}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active Account
          </span>
        </div>

        {/* Right Column: Edit Profile Form */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Profile Details
            </h3>

            {/* Full Name field */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs font-bold text-slate-700">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter your full name"
                  className={`w-full rounded-xl border py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f0533c]/15 transition-all ${
                    isEditing
                      ? "border-[#f0533c] bg-white"
                      : "border-slate-200 bg-slate-50/40 text-slate-700 cursor-not-allowed"
                  }`}
                />
              </div>
            </div>

            {/* Email field (readonly) */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  disabled
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Contact your administrator to change your associated email login.
              </p>
            </div>

            {/* Update button */}
            <div className="pt-2 flex justify-end gap-2.5">
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setFullName(originalName);
                    setIsEditing(false);
                  }}
                  className="rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 text-xs font-semibold transition"
                >
                  Cancel
                </button>
              )}

              <button
                type={isEditing ? "submit" : "button"}
                onClick={handleButtonClick}
                disabled={isSaving || (isEditing && fullName.trim() === originalName)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-xs transition active:scale-[0.98] ${
                  !isEditing
                    ? "bg-slate-900 hover:bg-slate-800 text-white"
                    : isSaving || fullName.trim() === originalName
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "bg-[#b91c1c] hover:bg-[#991b1b] text-white"
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : !isEditing ? (
                  <>
                    <Pencil className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </>
                ) : (
                  <>
                    <Check
                      className={`h-4 w-4 ${fullName.trim() === originalName ? "text-slate-400" : "text-white"}`}
                    />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Account Metadata metadata */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              System Information
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="font-bold text-slate-700">Member Since</p>
                  <p className="text-slate-500 mt-0.5">{formattedDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Shield className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="font-bold text-slate-700">Account ID</p>
                  <p
                    className="text-slate-500 mt-0.5 font-mono truncate max-w-[180px]"
                    title={user?.id}
                  >
                    {user?.id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
