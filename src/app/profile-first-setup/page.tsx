"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import {
  Building2,
  ArrowRight,
  Loader2,
  Sparkles,
  MapPin,
  Navigation,
} from "lucide-react";

type LocationData = {
  lat: number;
  lng: number;
  accuracy: number;
};

export default function ProfileSetup() {
  const { userData, user } = useAuth();
  const [officeName, setOfficeName] = useState("");
  const [officeLocation, setOfficeLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const getCurrentLocation = () => {
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

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!officeLocation) {
      notify("Please capture your office location first.");
      return;
    }

    setLoading(true);

    try {
      const userDocRef = doc(db, "employees", userData?.id || user.uid);

      await updateDoc(userDocRef, {
        officeName: officeName.trim(),
        officeLocation: {
          lat: officeLocation.lat,
          lng: officeLocation.lng,
          accuracy: officeLocation.accuracy,
          radiusMeters: 100,
        },
        adminUid: user.uid,
        workspaceUid: user.uid,
        setupComplete: true,
        updatedAt: new Date().toISOString(),
      });

      notify("Workspace setup complete! 🚀");
      router.push("/");
    } catch (error: any) {
      notify("Setup Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-gray-900">
      <div className="w-full max-w-[480px] animate-in fade-in zoom-in duration-500">
        <div className="bg-white rounded-[40px] shadow-2xl p-10 border border-gray-50 relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
              <Sparkles className="text-white" size={30} />
            </div>

            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
              Final <span className="text-blue-600">Step</span>
            </h2>

            <p className="text-gray-500 font-medium italic text-sm mb-8">
              Please provide your office name and capture your office location.
              Staff punch-in/out will only work inside this location range.
            </p>

            <form onSubmit={handleSetup} className="space-y-6">
              <div className="group space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                  Office Name
                </label>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                  <Building2
                    size={20}
                    className="text-gray-400 group-focus-within:text-blue-600"
                  />

                  <input
                    required
                    placeholder="e.g. Pixel Craft Agency"
                    className="bg-transparent outline-none w-full font-bold text-sm"
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl border border-gray-100 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="text-blue-600 shrink-0" size={22} />

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Office GPS Location
                    </p>

                    <p className="text-xs font-bold text-gray-500 italic mt-1">
                      Stand inside your office and click the button below.
                    </p>
                  </div>
                </div>

                {officeLocation && (
                  <div className="bg-white rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest text-green-600 border border-green-100">
                    Location Saved • Accuracy:{" "}
                    {Math.round(officeLocation.accuracy)}m
                  </div>
                )}

                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  {locationLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Navigation size={18} />
                  )}
                  {officeLocation ? "Update Office Location" : "Use Current Location"}
                </button>
              </div>

              <button
                disabled={loading || !officeName || !officeLocation}
                type="submit"
                className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    Complete Setup <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}