import toast from "react-hot-toast";
import { Bell } from "lucide-react"; // Aap yahan CheckCircle ya koi bhi icon laga sakte hain

export const notify = (message: string) => {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible 
            ? "animate-in slide-in-from-top-4 fade-in duration-300" 
            : "animate-out slide-out-to-top-4 fade-out duration-300"
        } max-w-md w-auto bg-[#ffffff] shadow-2xl rounded-full flex items-center gap-3 p-1.5 border border-white/10`}
      >
        {/* WhatsApp jesa Green Gol Icon */}
        <div className="w-8 h-8 bg-[#155dfc] rounded-full flex items-center justify-center shrink-0 shadow-sm">
          <Bell size={16} className="text-white" />
        </div>
        
        {/* Notification Text */}
        <p className="text-[13px] font-medium text-darkgray pr-4 tracking-wide">
          {message}
        </p>
      </div>
    ),
    { 
      position: "top-center", 
      duration: 3500 // 3.5 seconds baad khud gayab ho jayega
    }
  );
};