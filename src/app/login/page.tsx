"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  setDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import {
  Lock,
  Mail,
  User,
  Building2,
  ArrowRight,
  Loader2,
  Fingerprint,
  Eye,
  EyeOff,
  MapPin,
  Navigation,
} from "lucide-react";

type LocationData = {
  lat: number;
  lng: number;
  accuracy: number;
};

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [officeLocation, setOfficeLocation] = useState<LocationData | null>(
    null
  );

  const cleanEmail = email.trim().toLowerCase();

  const captureOfficeLocation = () => {
    setLocationLoading(true);

    if (!navigator.geolocation) {
      notify("GPS is not supported in this browser.");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOfficeLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        notify("Office location captured successfully 📍");
        setLocationLoading(false);
      },
      () => {
        notify("Location access denied. Please allow GPS permission.");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const userEmail = res.user.email;

      if (!userEmail) {
        notify("Google account email not found.");
        return;
      }

      const normalizedEmail = userEmail.trim().toLowerCase();

      const q = query(
        collection(db, "employees"),
        where("email", "==", normalizedEmail)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const userDocRef = doc(db, "employees", res.user.uid);

        await setDoc(userDocRef, {
          uid: res.user.uid,
          adminUid: res.user.uid,
          workspaceUid: res.user.uid,
          name: res.user.displayName || "Owner",
          email: normalizedEmail,
          officeName: "",
          officeLocation: null,
          role: "Super Admin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active",
          profilePic: res.user.photoURL || "",
          setupComplete: false,
        });

        notify("Welcome Owner! Please finalize your workspace setup. 🚀");
        router.push("/profile-first-setup");
      } else {
        const existingUser = querySnapshot.docs[0].data();

        if (
          existingUser.role === "Super Admin" &&
          existingUser.setupComplete === false
        ) {
          router.push("/profile-first-setup");
        } else {
          notify(`Welcome back, ${existingUser.name || "User"}! 👋`);
          router.push("/");
        }
      }
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        notify("Google Sign-In failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!cleanEmail) {
      notify("Please enter your email first.");
      return;
    }

    try {
      setResetLoading(true);
      await sendPasswordResetEmail(auth, cleanEmail);
      notify("Password reset email sent successfully 📩");
    } catch {
      notify("Failed to send reset email. Please check the email.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        if (!officeLocation) {
          notify("Please capture your office location first.");
          setLoading(false);
          return;
        }

        const res = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

        await sendEmailVerification(res.user);

        await setDoc(doc(db, "employees", res.user.uid), {
          uid: res.user.uid,
          adminUid: res.user.uid,
          workspaceUid: res.user.uid,
          name: name.trim(),
          officeName: officeName.trim(),
          officeLocation: {
            lat: officeLocation.lat,
            lng: officeLocation.lng,
            accuracy: officeLocation.accuracy,
            radiusMeters: 100,
          },
          email: cleanEmail,
          role: "Super Admin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active",
          setupComplete: true,
        });

        await signOut(auth);

        notify("Account created! 🚀 Please verify your email to login.");
        setIsRegistering(false);
        setPassword("");
        setOfficeLocation(null);
      } else {
        const res = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

        if (!res.user.emailVerified) {
          await signOut(auth);
          notify("Please verify your email address first! 🛑");
          return;
        }

        notify("Logged in successfully! 👋");
        router.push("/");
      }
    } catch (error: any) {
      const errorCode = error.code;

      if (
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/invalid-credential"
      ) {
        notify("Invalid Email or Password. Please try again! ❌");
      } else if (errorCode === "auth/email-already-in-use") {
        notify("This email is already registered. Please sign in.");
      } else if (errorCode === "auth/weak-password") {
        notify("Password should be at least 6 characters.");
      } else if (errorCode === "auth/too-many-requests") {
        notify("Too many failed attempts. Try again later! ⏳");
      } else {
        notify("Authentication failed. Check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchAuthMode = () => {
    setIsRegistering((prev) => !prev);
    setShowPassword(false);
    setPassword("");
    setOfficeLocation(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 font-sans text-gray-900">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[420px] h-[420px] bg-blue-100/50 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[420px] h-[420px] bg-blue-50/50 rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-[480px] animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[28px] shadow-xl shadow-blue-200 mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Fingerprint size={40} className="text-white" />
          </div>

          <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
            Attend<span className="text-blue-600">X</span>
          </h1>

          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
            Next-Gen Workforce Portal
          </p>
        </div>

        <div className="bg-white rounded-[38px] sm:rounded-[45px] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.12)] border border-gray-50 p-6 sm:p-8 md:p-10 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black italic uppercase tracking-tight mb-2">
              {isRegistering ? "Create Workspace" : "Welcome Back"}
            </h2>

            <p className="text-gray-500 mb-6 font-medium italic text-sm">
              {isRegistering
                ? "Setup your master office account."
                : "Login to manage your team."}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegistering && (
                <>
                  <InputBox icon={<User size={20} />} value={name}>
                    <input
                      required
                      placeholder="Your Full Name"
                      className="bg-transparent outline-none w-full font-bold text-sm"
                      value={name}
                      autoComplete="name"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </InputBox>

                  <InputBox icon={<Building2 size={20} />} value={officeName}>
                    <input
                      required
                      placeholder="Office Name"
                      className="bg-transparent outline-none w-full font-bold text-sm"
                      value={officeName}
                      autoComplete="organization"
                      onChange={(e) => setOfficeName(e.target.value)}
                    />
                  </InputBox>

                  <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin size={20} className="text-blue-600 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Office Location
                        </p>
                        <p className="text-xs text-gray-500 font-bold italic">
                          Stand inside your office and capture GPS location.
                        </p>
                      </div>
                    </div>

                    {officeLocation && (
                      <div className="bg-white rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-green-600 border border-green-100">
                        Location captured • Accuracy:{" "}
                        {Math.round(officeLocation.accuracy)}m
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={captureOfficeLocation}
                      disabled={locationLoading || loading}
                      className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {locationLoading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Navigation size={16} />
                      )}
                      {officeLocation ? "Update Location" : "Use Current Location"}
                    </button>
                  </div>
                </>
              )}

              <InputBox icon={<Mail size={20} />} value={email}>
                <input
                  required
                  type="email"
                  placeholder="Email Address"
                  className="bg-transparent outline-none w-full font-bold text-sm"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </InputBox>

              <div className="group">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                  <Lock
                    size={20}
                    className="text-gray-400 group-focus-within:text-blue-600"
                  />

                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Secure Password"
                    className="bg-transparent outline-none w-full font-bold text-sm"
                    value={password}
                    autoComplete={
                      isRegistering ? "new-password" : "current-password"
                    }
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!isRegistering && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading || loading}
                    className="text-[11px] font-black uppercase tracking-widest italic text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-60"
                  >
                    {resetLoading ? "Sending..." : "Forgot Password?"}
                  </button>
                </div>
              )}

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-gray-900 text-white py-4 md:py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    {isRegistering ? "Launch Workspace" : "Access Account"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>

              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400 font-bold uppercase text-[10px] tracking-widest italic">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-[#24292F] hover:bg-[#24292f]/90 text-white py-3.5 rounded-full font-bold text-sm shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-70 border border-white/10 mt-2 active:scale-95"
            >
              <span className="tracking-tight italic font-black uppercase text-[11px]">
                Continue with Google
              </span>
            </button>

            <div className="mt-8 pt-6 border-t border-gray-50 text-center">
              <button
                type="button"
                onClick={switchAuthMode}
                className="text-[11px] font-bold text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                {isRegistering
                  ? "Already have an account?"
                  : "Need a new office workspace?"}

                <span className="text-blue-600 underline font-black uppercase italic tracking-widest">
                  {isRegistering ? "Sign In" : "Register Now"}
                </span>
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
        </div>
      </div>
    </div>
  );
}

function InputBox({
  icon,
  children,
}: {
  icon: React.ReactNode;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group">
      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
        <div className="text-gray-400 group-focus-within:text-blue-600">
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}