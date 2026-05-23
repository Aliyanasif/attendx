"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  Loader2,
  ShieldCheck,
  UserX,
  Search,
  Crown,
  Mail,
  User,
  X,
  Trash2,
  Users,
  Banknote,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { notify } from "@/lib/notify";

export default function OwnerControlPage() {
  const { user } = useAuth();

  const [admins, setAdmins] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const OWNER_EMAIL = "aliyanasif503@gmail.com";

  useEffect(() => {
    if (!user) return;

    if (user.email !== OWNER_EMAIL) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "employees"),
      where("role", "==", "Super Admin")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setAdmins(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const togglePremium = async (adminId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "employees", adminId), {
        isPremium: !currentStatus,
      });

      notify(
        currentStatus
          ? "Account downgraded to Free"
          : "Account upgraded to Premium! 🚀"
      );
    } catch {
      notify("Action failed!");
    }
  };

  const openOffice = async (admin: any) => {
    setSelectedAdmin(admin);
    setStaff([]);
    setStaffLoading(true);

    try {
      const q = query(
        collection(db, "employees"),
        where("adminUid", "==", admin.uid)
      );

      const snap = await getDocs(q);
      setStaff(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
      notify("Unable to load office staff.");
    } finally {
      setStaffLoading(false);
    }
  };

  const deleteOffice = async () => {
    if (!selectedAdmin || !user) return;

    const confirmText = prompt(
      `Type DELETE to permanently remove ${selectedAdmin.officeName || selectedAdmin.name}`
    );

    if (confirmText !== "DELETE") {
      notify("Delete cancelled.");
      return;
    }

    setDeleteLoading(true);

    try {
      const token = await user.getIdToken();

      const res = await fetch("/api/owner-delete-office", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminUid: selectedAdmin.uid,
          adminDocId: selectedAdmin.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }

      notify("Office and all related data deleted successfully.");
      setSelectedAdmin(null);
      setStaff([]);
    } catch (err: any) {
      notify(err.message || "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (user?.email !== OWNER_EMAIL) {
    return (
      <div className="p-20 text-center font-black uppercase italic text-red-500">
        Bhai, ye page sirf Owner ke liye hai! 🚫
      </div>
    );
  }

  const filteredAdmins = admins.filter(
    (a) =>
      a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.officeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStaffSalary = staff.reduce(
    (acc, curr) => acc + Number(curr.salary || 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 p-6 animate-in fade-in duration-700 text-gray-900">
      <div>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
          Owner <span className="text-blue-600">Command Center</span>
        </h1>

        <p className="text-gray-400 font-bold mt-2 uppercase text-[10px] tracking-widest italic">
          AttendX Platform Control
        </p>
      </div>

      <div className="bg-white p-4 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="bg-gray-50 flex items-center gap-3 px-6 py-3 rounded-2xl border border-gray-100">
          <Search className="text-gray-400" size={18} />
          <input
            placeholder="Search Office Owners..."
            className="bg-transparent outline-none w-full font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAdmins.map((admin) => (
            <div
              key={admin.id}
              onClick={() => openOffice(admin)}
              className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic text-2xl shadow-lg">
                  {admin.officeName?.[0] || "O"}
                </div>

                {admin.isPremium ? (
                  <div className="bg-yellow-50 text-yellow-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border border-yellow-100">
                    <Crown size={14} /> Premium Client
                  </div>
                ) : (
                  <div className="bg-gray-50 text-gray-400 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border border-gray-100">
                    Free Tier
                  </div>
                )}
              </div>

              <h3 className="text-xl font-black uppercase italic leading-none">
                {admin.officeName || "Unnamed Office"}
              </h3>

              <p className="text-gray-400 font-bold text-[10px] mt-2 uppercase tracking-widest italic border-b border-gray-50 pb-4 mb-4 flex items-center gap-2">
                <User size={12} className="text-blue-600" /> Owner:{" "}
                {admin.name || "Unknown"}
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                  <Mail size={16} className="text-blue-600" /> {admin.email}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePremium(admin.id, admin.isPremium);
                }}
                className={`w-full py-4 rounded-[24px] font-black uppercase text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  admin.isPremium
                    ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white"
                    : "bg-blue-600 text-white hover:bg-gray-900 shadow-xl shadow-blue-100"
                }`}
              >
                {admin.isPremium ? <UserX size={18} /> : <ShieldCheck size={18} />}
                {admin.isPremium ? "Deactivate Premium" : "Activate Premium"}
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedAdmin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl rounded-[44px] shadow-2xl overflow-hidden">
            <div className="bg-gray-900 text-white p-8 flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300 mb-2">
                  Office Details
                </p>

                <h2 className="text-4xl font-black italic uppercase tracking-tighter">
                  {selectedAdmin.officeName || "Unnamed Office"}
                </h2>

                <p className="text-gray-400 text-sm mt-2 font-bold">
                  {selectedAdmin.email}
                </p>
              </div>

              <button
                onClick={() => setSelectedAdmin(null)}
                className="p-3 hover:bg-white/10 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  icon={<Building2 size={22} />}
                  label="Owner"
                  value={selectedAdmin.name || "Unknown"}
                />

                <MetricCard
                  icon={<Users size={22} />}
                  label="Total Staff"
                  value={staffLoading ? "..." : staff.length}
                />

                <MetricCard
                  icon={<Banknote size={22} />}
                  label="Staff Salaries"
                  value={`Rs ${totalStaffSalary.toLocaleString()}`}
                />

                <MetricCard
                  icon={<Crown size={22} />}
                  label="Plan"
                  value={selectedAdmin.isPremium ? "Premium" : "Free"}
                />
              </div>

              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4">
                  Staff Members
                </h3>

                {staffLoading ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                  </div>
                ) : staff.length === 0 ? (
                  <div className="bg-gray-50 rounded-3xl p-10 text-center font-bold text-gray-400 italic">
                    No staff found for this office.
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-[32px] overflow-hidden border border-gray-100">
                    <table className="w-full text-left min-w-[700px]">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
                          <th className="p-5">Name</th>
                          <th className="p-5">Email</th>
                          <th className="p-5">Designation</th>
                          <th className="p-5 text-right">Salary</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100 bg-white">
                        {staff.map((member) => (
                          <tr key={member.id}>
                            <td className="p-5 font-black italic uppercase">
                              {member.name}
                            </td>
                            <td className="p-5 text-sm font-bold text-gray-500">
                              {member.email}
                            </td>
                            <td className="p-5 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                              {member.designation || "Staff"}
                            </td>
                            <td className="p-5 text-right font-black italic">
                              Rs {Number(member.salary || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-red-50 border border-red-100 rounded-[32px] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-4">
                  <AlertTriangle className="text-red-500 shrink-0" size={28} />
                  <div>
                    <h4 className="font-black uppercase italic text-red-600">
                      Danger Zone
                    </h4>
                    <p className="text-red-500 text-sm font-bold italic">
                      This will delete office owner, staff, attendance, leaves,
                      resignations, salary history and Firebase Auth accounts.
                    </p>
                  </div>
                </div>

                <button
                  onClick={deleteOffice}
                  disabled={deleteLoading}
                  className="bg-red-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
                >
                  {deleteLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Delete Office
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
        {icon}
      </div>

      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
        {label}
      </p>

      <p className="font-black italic text-gray-900 text-lg truncate">
        {value}
      </p>
    </div>
  );
}