"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  setDoc,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  Shield,
  Clock,
  CreditCard,
  User,
  Timer,
  Lock,
  Briefcase,
  ChevronDown,
  LayoutGrid,
  List,
  Sparkles,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Globe,
  Link,
  Crown,
  Eye,
  EyeOff,
} from "lucide-react";
import { notify } from "@/lib/notify";

const DESIGNATIONS = [
  "Chief Executive Officer (CEO)",
  "General Manager",
  "Operations Manager",
  "HR Manager",
  "Project Manager",
  "Senior Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "UI/UX Designer",
  "Senior Graphic Designer",
  "Motion Graphics Artist",
  "Video Editor",
  "Digital Marketing Head",
  "Social Media Manager",
  "Content Strategist",
  "SEO Specialist",
  "Sales Executive",
  "Accountant",
  "Office Assistant",
  "IT Support Specialist",
];

const initialForm = {
  name: "",
  designation: DESIGNATIONS[0],
  role: "Staff",
  email: "",
  password: "",
  salary: "",
  shiftStart: "09:00",
  shiftEnd: "18:00",
  dutyHours: "9",
};

export default function ManageStaffPage() {
  const { userData, user, loading: authLoading } = useAuth();

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState(initialForm);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const isTrialValid = () => {
    if (userData?.isPremium === false) return false;
    if (!userData?.createdAt) return false;

    const trialDays = 14;
    const createdDate = userData.createdAt?.toDate
      ? userData.createdAt.toDate()
      : new Date(userData.createdAt);

    const expiryDate = new Date(
      createdDate.getTime() + trialDays * 24 * 60 * 60 * 1000
    );

    return new Date() < expiryDate;
  };

  const hasAccess = userData?.isPremium || isTrialValid();

  useEffect(() => {
    if (authLoading) return;

    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "employees"),
      where("adminUid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setEmployees(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Staff Snapshot Error:", error);
        notify("Unable to load staff records.");
        setEmployees([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, user?.uid]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
    setShowPassword(false);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (emp: any) => {
    setFormData({
      name: emp.name || "",
      designation: emp.designation || DESIGNATIONS[0],
      role: emp.role || "Staff",
      email: emp.email || "",
      password: "",
      salary: emp.salary || "",
      shiftStart: emp.shiftStart || "09:00",
      shiftEnd: emp.shiftEnd || "18:00",
      dutyHours: emp.dutyHours || "9",
    });

    setEditingId(emp.id);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openProfile = (emp: any) => {
    setSelectedStaff(emp);
    setIsProfileModalOpen(true);
  };

  const triggerDelete = (id: string) => {
    setDeleteId(id);
    setIsConfirmOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid) {
      notify("Session expired. Please login again.");
      return;
    }

    if (!formData.name.trim()) {
      notify("Employee name is required.");
      return;
    }

    if (!formData.email.trim()) {
      notify("Employee email is required.");
      return;
    }

    if (!editingId && formData.password.length < 6) {
      notify("Password must be at least 6 characters.");
      return;
    }

    setSaving(true);

    try {
      const cleanEmail = formData.email.trim().toLowerCase();

      const safeEmployeeData = {
        name: formData.name.trim(),
        designation: formData.designation,
        role: formData.role,
        email: cleanEmail,
        salary: formData.salary,
        shiftStart: formData.shiftStart,
        shiftEnd: formData.shiftEnd,
        dutyHours: formData.dutyHours,
        officeName: userData?.officeName || "Organization Name",
        status: "active",
      };

      if (editingId) {
        await updateDoc(doc(db, "employees", editingId), {
          ...safeEmployeeData,
          updatedAt: serverTimestamp(),
        });

        notify("Employee updated successfully! 📝");
      } else {
        const { initializeApp, getApps } = await import("firebase/app");
        const {
          getAuth: getSecondaryAuth,
          createUserWithEmailAndPassword: createInSecondary,
          signOut: secondarySignOut,
        } = await import("firebase/auth");

        const firebaseConfig = {
          apiKey: "AIzaSyBEsvkvSZRRXTkj4uj_G2sMJw34Kr98ZHk",
          authDomain: "attendx-f70b9.firebaseapp.com",
          projectId: "attendx-f70b9",
        };

        const secondaryApp =
          getApps().find((app) => app.name === "Secondary") ||
          initializeApp(firebaseConfig, "Secondary");

        const secondaryAuth = getSecondaryAuth(secondaryApp);

        const userCredential = await createInSecondary(
          secondaryAuth,
          cleanEmail,
          formData.password
        );

        const newUserId = userCredential.user.uid;

        await setDoc(doc(db, "employees", newUserId), {
          ...safeEmployeeData,
          uid: newUserId,
          adminUid: user.uid,
          createdAt: serverTimestamp(),
          setupComplete: true,
        });

        await secondarySignOut(secondaryAuth);

        notify("Employee registered successfully!");
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      const code = err?.code;

      if (code === "auth/email-already-in-use") {
        notify("This email is already registered.");
      } else if (code === "auth/weak-password") {
        notify("Password must be at least 6 characters.");
      } else if (code === "permission-denied") {
        notify("Permission denied. Check Firebase rules.");
      } else {
        notify("Error: " + (err?.message || "Something went wrong."));
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    setSaving(true);

    try {
      const empToDelete = employees.find((e) => e.id === deleteId);

      if (empToDelete?.uid) {
        await fetch("/api/delete-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: empToDelete.uid }),
        });
      }

      await deleteDoc(doc(db, "employees", deleteId));

      if (empToDelete) {
        const attendanceQueries = [
          query(collection(db, "attendance"), where("employeeId", "==", empToDelete.id)),
          query(collection(db, "attendance"), where("employeeUid", "==", empToDelete.uid || "")),
          query(collection(db, "attendance"), where("uid", "==", empToDelete.uid || "")),
        ];

        for (const q of attendanceQueries) {
          const snap = await getDocs(q);
          snap.forEach((d) => deleteDoc(d.ref));
        }

        const salaryQueries = [
          query(collection(db, "salary_history"), where("employeeId", "==", empToDelete.id)),
          query(collection(db, "salary_history"), where("employeeUid", "==", empToDelete.uid || "")),
          query(collection(db, "salary_history"), where("uid", "==", empToDelete.uid || "")),
        ];

        for (const q of salaryQueries) {
          const snap = await getDocs(q);
          snap.forEach((d) => deleteDoc(d.ref));
        }
      }

      notify("Employee record deleted successfully.");
      setIsConfirmOpen(false);
      setDeleteId(null);
    } catch (err: any) {
      notify("Delete failed: " + (err?.message || "Something went wrong."));
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return employees.filter((e) => {
      return (
        e.name?.toLowerCase().includes(term) ||
        e.designation?.toLowerCase().includes(term) ||
        e.email?.toLowerCase().includes(term)
      );
    });
  }, [employees, searchTerm]);

  if (!authLoading && userData?.role === "Staff") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
        <div className="bg-white rounded-[36px] border border-gray-100 p-10 text-center shadow-sm max-w-md">
          <Shield className="text-blue-600 mx-auto mb-4" size={40} />
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            Access Denied
          </h1>
          <p className="text-gray-500 text-sm italic mt-3">
            Staff accounts cannot access the management console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 px-4 mt-4 text-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase leading-none">
            Staff <span className="text-blue-600">Management</span>
          </h1>
          <p className="text-gray-500 font-medium italic mt-2">
            Enterprise control over team roles and credentials.
          </p>
        </div>

        {hasAccess ? (
          <button
            onClick={openAddModal}
            className="bg-gray-900 text-white px-8 py-4 rounded-[24px] font-black uppercase text-xs hover:bg-blue-600 transition-all shadow-xl active:scale-95 flex items-center gap-3"
          >
            <UserPlus size={18} /> Add New Staff
          </button>
        ) : (
          <button
            onClick={() => setIsPremiumModalOpen(true)}
            className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-8 py-4 rounded-[24px] font-black uppercase text-xs hover:scale-105 transition-all shadow-xl shadow-yellow-500/30 active:scale-95 flex items-center gap-3"
          >
            <Crown size={18} /> Add New Staff
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="bg-white p-4 rounded-[32px] border border-gray-50 shadow-sm flex-1 w-full">
          <div className="bg-gray-50 flex items-center gap-3 px-6 py-3 rounded-2xl border border-gray-100">
            <Search className="text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search staff by name, email, or designation..."
              className="bg-transparent border-none outline-none w-full font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white p-2 rounded-[24px] border border-gray-50 shadow-sm flex gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-3 rounded-2xl transition-all ${
              viewMode === "grid"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:bg-gray-50"
            }`}
          >
            <LayoutGrid size={20} />
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={`p-3 rounded-2xl transition-all ${
              viewMode === "list"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:bg-gray-50"
            }`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {loading || authLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-[40px] p-12 text-center shadow-sm">
          <Users className="mx-auto text-blue-600 mb-4" size={44} />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">
            No Staff Found
          </h2>
          <p className="text-gray-500 italic mt-2">
            Add your first employee or adjust your search filter.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => {
            const isComplete = emp.phone || emp.address;

            return (
              <div
                key={emp.id}
                onClick={() => openProfile(emp)}
                className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="relative">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-100">
                      {(emp.name || "A")[0]}
                    </div>

                    {isComplete && (
                      <div
                        className="absolute -top-2 -right-2 bg-blue-600 text-white p-1 rounded-lg shadow-lg border-2 border-white"
                        title="Profile Complete"
                      >
                        <Sparkles size={12} />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 z-20 relative">
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(emp);
                      }}
                      className="p-2.5 bg-blue-50/50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all duration-300"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerDelete(emp.id);
                      }}
                      className="p-2.5 bg-red-50/50 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all duration-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black uppercase italic leading-none truncate">
                    {emp.name || "Unnamed Staff"}
                  </h3>

                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2 mb-6">
                    {emp.designation || "Staff"}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-50 font-black text-[10px] uppercase">
                    <div className="bg-gray-50 p-4 rounded-2xl flex flex-col gap-1">
                      <span className="text-[8px] italic text-blue-600 mb-1">
                        Salary
                      </span>
                      PKR {Number(emp.salary || 0).toLocaleString()}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl flex flex-col gap-1">
                      <span className="text-[8px] italic text-blue-600 mb-1">
                        Hours
                      </span>
                      {emp.dutyHours || 0}h
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-gray-50 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-900 text-white font-black text-[10px] uppercase tracking-[0.2em]">
                <th className="p-6 italic">Employee Info</th>
                <th className="p-6 italic">Designation</th>
                <th className="p-6 italic">Salary</th>
                <th className="p-6 italic">Timings</th>
                <th className="p-6 italic text-right px-10">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50 font-bold text-sm">
              {filteredEmployees.map((emp) => {
                const isComplete = emp.phone || emp.address;

                return (
                  <tr
                    key={emp.id}
                    onClick={() => openProfile(emp)}
                    className="hover:bg-blue-50/30 transition-all group cursor-pointer"
                  >
                    <td className="p-6 flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-blue-600 font-black italic group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {(emp.name || "A")[0]}
                        </div>

                        {isComplete && (
                          <Sparkles
                            size={10}
                            className="absolute -top-1 -right-1 text-blue-600"
                          />
                        )}
                      </div>

                      <div className="flex flex-col">
                        <span className="uppercase italic tracking-tighter">
                          {emp.name || "Unnamed Staff"}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {emp.email}
                        </span>
                      </div>
                    </td>

                    <td className="p-6 text-[10px] uppercase font-black text-blue-600 tracking-widest">
                      {emp.designation || "Staff"}
                    </td>

                    <td className="p-6 italic">
                      PKR {Number(emp.salary || 0).toLocaleString()}
                    </td>

                    <td className="p-6 text-xs font-black">
                      {emp.shiftStart} - {emp.shiftEnd}
                    </td>

                    <td className="p-6 text-right px-10">
                      <div className="flex justify-end gap-2 relative z-20">
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(emp);
                          }}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerDelete(emp.id);
                          }}
                          className="p-2 hover:bg-red-100 text-red-500 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isPremiumModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-xl"
            onClick={() => setIsPremiumModalOpen(false)}
          />

          <div className="relative bg-white w-full max-w-md rounded-[50px] overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-yellow-100">
            <button
              onClick={() => setIsPremiumModalOpen(false)}
              className="absolute top-6 right-6 z-10 bg-white/20 text-white p-2 rounded-full backdrop-blur-md hover:bg-white/40 transition-all"
            >
              <X size={18} />
            </button>

            <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl" />

              <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30 shadow-xl">
                <Crown size={32} className="text-white" />
              </div>

              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
                Unlock Premium
              </h3>

              <p className="text-yellow-100 text-[10px] font-bold uppercase mt-2 tracking-widest">
                PKR 5,000 / Month
              </p>
            </div>

            <div className="p-8 space-y-6">
              <p className="text-gray-500 font-bold italic text-sm text-center leading-relaxed">
                Premium access ke liye payment transfer karein aur WhatsApp par
                screenshot bhej dein.
              </p>

              <a
                href="https://wa.me/message/IUY2YDEDHTFTN1"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsPremiumModalOpen(false)}
                className="w-full py-4 bg-[#25D366] text-white rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-[#128C7E] transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Send Slip on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {isProfileModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl"
            onClick={() => setIsProfileModalOpen(false)}
          />

          <div className="relative bg-white w-full max-w-2xl rounded-[44px] sm:rounded-[60px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="absolute top-6 right-6 bg-white/20 text-white p-3 rounded-2xl backdrop-blur-md hover:bg-white/40 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 sm:px-10 pb-12">
              <div className="relative -mt-16 mb-6">
                <div className="w-32 h-32 bg-white p-2 rounded-[45px] shadow-2xl">
                  <div className="w-full h-full bg-blue-50 rounded-[38px] flex items-center justify-center text-blue-600 overflow-hidden border-2 border-blue-100">
                    {selectedStaff.profilePic ? (
                      <img
                        src={selectedStaff.profilePic}
                        className="w-full h-full object-cover"
                        alt={selectedStaff.name}
                      />
                    ) : (
                      <User size={50} strokeWidth={1.5} />
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
                    {selectedStaff.name}
                  </h2>

                  <p className="text-blue-600 font-black uppercase text-xs tracking-[0.3em] mt-2 italic flex items-center gap-2">
                    <Shield size={14} /> {selectedStaff.designation}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
                <ProfileInfo
                  icon={<Mail size={12} className="text-blue-600" />}
                  label="Email Identity"
                  value={selectedStaff.email}
                />

                <ProfileInfo
                  icon={<Phone size={12} className="text-blue-600" />}
                  label="Direct Contact"
                  value={selectedStaff.phone || "Not Provided"}
                />

                <ProfileInfo
                  wide
                  icon={<MapPin size={12} className="text-blue-600" />}
                  label="Registered Address"
                  value={selectedStaff.address || "Address not provided yet."}
                />

                <ProfileInfo
                  wide
                  icon={<Sparkles size={12} className="text-blue-600" />}
                  label="Professional Bio"
                  value={selectedStaff.bio || "No bio updated by staff yet."}
                />
              </div>

              <div className="flex gap-4 mt-8">
                {selectedStaff.linkedin && (
                  <a
                    href={selectedStaff.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"
                  >
                    <Link size={20} />
                  </a>
                )}

                {selectedStaff.website && (
                  <a
                    href={selectedStaff.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-gray-900 text-white rounded-2xl hover:bg-blue-600 transition-all"
                  >
                    <Globe size={20} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md overflow-y-auto text-gray-900">
          <div className="bg-white w-full max-w-4xl rounded-[40px] sm:rounded-[50px] shadow-2xl overflow-hidden my-8 animate-in zoom-in duration-300">
            <div className="bg-blue-600 p-8 sm:p-10 text-white flex justify-between items-center relative overflow-hidden">
              <div className="z-10">
                <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                  {editingId ? "Update" : "Register"} Profile
                </h3>
                <p className="text-blue-100 text-[10px] font-bold uppercase mt-3 tracking-[0.2em]">
                  Full Workforce Credentials
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="z-10 p-3 hover:bg-white/20 rounded-full transition-all text-white"
              >
                <X size={28} />
              </button>

              <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar"
            >
              <Field label="Full Name">
                <User className="text-blue-600" size={20} />
                <input
                  required
                  className="bg-transparent outline-none w-full font-bold"
                  placeholder="Alex"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </Field>

              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                  Designation
                </label>

                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`bg-gray-50 p-5 rounded-[24px] border flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                    isDropdownOpen
                      ? "border-blue-600 bg-white"
                      : "border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Briefcase className="text-blue-600" size={20} />
                    <span className="font-bold">{formData.designation}</span>
                  </div>
                  <ChevronDown size={18} />
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-[110] left-0 right-0 mt-3 bg-white border border-gray-100 rounded-[30px] shadow-2xl overflow-hidden py-2 max-h-64 overflow-y-auto">
                    {DESIGNATIONS.map((d) => (
                      <div
                        key={d}
                        onClick={() => {
                          setFormData({ ...formData, designation: d });
                          setIsDropdownOpen(false);
                        }}
                        className={`px-8 py-4 text-sm font-bold hover:bg-blue-50 hover:text-blue-600 cursor-pointer ${
                          formData.designation === d
                            ? "text-blue-600 bg-blue-50"
                            : "text-gray-600"
                        }`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Field label="Work Email">
                <Mail className="text-blue-600" size={20} />
                <input
                  required
                  disabled={!!editingId}
                  type="email"
                  className="bg-transparent outline-none w-full font-bold disabled:opacity-60"
                  placeholder="staff@attendx.info"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </Field>

              {!editingId && (
                <Field label="Login Password">
                  <Lock className="text-blue-600" size={20} />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    className="bg-transparent outline-none w-full font-bold"
                    placeholder="Set Secure Access"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-gray-400 hover:text-blue-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </Field>
              )}

              <Field label="Organization Role">
                <Users className="text-blue-600" size={20} />
                <select
                  className="bg-transparent outline-none w-full font-bold appearance-none cursor-pointer"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="Staff">Staff Member</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">System Admin</option>
                </select>
              </Field>

              <Field label="Monthly Salary (PKR)">
                <CreditCard className="text-blue-600" size={20} />
                <input
                  required
                  type="number"
                  min="0"
                  className="bg-transparent outline-none w-full font-bold"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: e.target.value })
                  }
                />
              </Field>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                  Shift Timings
                </label>

                <div className="flex gap-4">
                  <div className="bg-gray-50 flex-1 p-5 rounded-[24px] border flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    <input
                      type="time"
                      className="bg-transparent outline-none font-bold w-full"
                      value={formData.shiftStart}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shiftStart: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="bg-gray-50 flex-1 p-5 rounded-[24px] border flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    <input
                      type="time"
                      className="bg-transparent outline-none font-bold w-full"
                      value={formData.shiftEnd}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shiftEnd: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Field label="Daily Duty Hours">
                <Timer className="text-blue-600" size={20} />
                <input
                  required
                  type="number"
                  min="1"
                  className="bg-transparent outline-none w-full font-bold"
                  value={formData.dutyHours}
                  onChange={(e) =>
                    setFormData({ ...formData, dutyHours: e.target.value })
                  }
                />
              </Field>

              <div className="md:col-span-2 flex gap-4 pt-10 mt-6 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[28px] font-black uppercase text-xs tracking-widest"
                >
                  Discard
                </button>

                <button
                  disabled={saving}
                  type="submit"
                  className="flex-[2] py-5 bg-blue-600 text-white rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : editingId ? (
                    "Save Changes"
                  ) : (
                    "Confirm Registration"
                  )}
                  {!saving && <Sparkles size={16} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden border border-red-50 animate-in zoom-in duration-300">
            <div className="bg-red-500 p-8 text-white text-center relative overflow-hidden">
              <div className="bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <AlertCircle size={32} />
              </div>

              <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">
                Confirm Delete
              </h3>

              <p className="text-red-100 text-[10px] font-bold uppercase mt-2 tracking-widest">
                This action is irreversible
              </p>
            </div>

            <div className="p-8 space-y-4">
              <p className="text-gray-500 font-bold text-center italic text-sm leading-relaxed">
                This will permanently remove the employee account and connected
                workforce records. This action cannot be undone.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsConfirmOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  onClick={confirmDelete}
                  className="flex-[2] py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-200 disabled:opacity-70"
                >
                  {saving ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
        {label}
      </label>

      <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
        {children}
      </div>
    </div>
  );
}

function ProfileInfo({
  icon,
  label,
  value,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`bg-gray-50 p-6 rounded-[35px] border border-gray-100 space-y-1 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
        {icon} {label}
      </p>

      <p className="font-bold text-gray-900 break-words">{value}</p>
    </div>
  );
}