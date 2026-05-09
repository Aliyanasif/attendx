"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface ConfirmContextType {
  confirm: (message: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<{ isOpen: boolean; message: string; resolve: (val: boolean) => void } | null>(null);

  const confirm = (message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ isOpen: true, message, resolve });
    });
  };

  const handleClose = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state?.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl border border-red-50 overflow-hidden">
            <div className="bg-red-500 p-8 text-white text-center">
              <div className="bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md"><AlertCircle size={32} /></div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">Confirm Action</h3>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-gray-500 font-bold text-center italic text-sm">{state.message}</p>
              <div className="flex gap-3">
                <button onClick={() => handleClose(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
                <button onClick={() => handleClose(true)} className="flex-[2] py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-red-200">Yes, Proceed</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used within ConfirmProvider");
  return context;
};