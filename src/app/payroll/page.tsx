"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, Timestamp, query, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext"; 
import { 
  Search, Loader2, AlertCircle, Banknote, Users, 
  CheckCircle2, Lock, Clock, CalendarDays, Activity,
  FileText, Crown, X 
} from "lucide-react"; 
import { notify } from "@/lib/notify";

export default function PayrollPage() {
  const { userData, loading: authLoading } = useAuth();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false); 
  const [disburseData, setDisburseData] = useState<any>(null); 

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();

  // 🛠️ Disburse button 1 se 15 tak open rahega
  const isDisburseEnabled = currentDay >= 1 && currentDay <= 15;

  // ⏱️ SaaS Trial Logic & Kill Switch
  const isTrialValid = () => {
    if (userData?.isPremium === false) return false;
    if (!userData?.createdAt) return false;
    const trialDays = 14;
    const createdDate = userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
    const expiryDate = new Date(createdDate.getTime() + trialDays * 24 * 60 * 60 * 1000);
    return new Date() < expiryDate;
  };

  const hasAccess = userData?.isPremium || isTrialValid();

  if (!authLoading && userData?.role === "Staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-100">
          <Lock size={48} />
        </div>
        <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">Access Denied</h2>
        <p className="text-gray-500 font-bold mt-4 max-w-sm italic text-sm">Bhai, ye area sirf Management ke liye reserved hai.</p>
      </div>
    );
  }

  useEffect(() => {
    if (authLoading || !userData?.uid || userData?.role === "Staff") return;

    const fetchData = async () => {
      try {
        const empQuery = query(collection(db, "employees"), where("adminUid", "==", userData.uid));
        const attQuery = query(collection(db, "attendance"), where("adminUid", "==", userData.uid));
        const salQuery = query(collection(db, "salary_history"), where("adminUid", "==", userData.uid)); 

        const [empSnap, attSnap, salSnap] = await Promise.all([
          getDocs(empQuery),
          getDocs(attQuery),
          getDocs(salQuery)
        ]);
        
        setEmployees(empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAttendanceData(attSnap.docs.map(doc => doc.data()));
        setSalaryHistory(salSnap.docs.map(doc => doc.data())); 
      } catch (err) { console.error("Fetch Error:", err); }
      setLoading(false);
    };
    fetchData();
  }, [userData, authLoading]); 

  const getPayrollDetails = (emp: any) => {
    const baseSalary = parseFloat(emp.salary) || 0;
    const empAttendance = attendanceData.filter(a => a.employeeName === emp.name);
    
    let totalMinutes = 0;
    let validDays = 0;

    empAttendance.forEach(record => {
      const recordDate = new Date(record.date);
      if (recordDate.getMonth() === today.getMonth() && recordDate.getFullYear() === today.getFullYear()) {
        if (record.clockIn && record.clockOut) {
          const inTime = record.clockIn.toDate();
          const outTime = record.clockOut.toDate();
          const diffMs = outTime.getTime() - inTime.getTime();
          const mins = Math.max(0, diffMs / (1000 * 60));
          totalMinutes += mins;
          validDays++;
        }
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    const perMinRate = baseSalary / 30 / 9 / 60;
    const netPay = Math.round(totalMinutes * perMinRate);

    return { 
      totalPresent: validDays, 
      formattedTime: `${hours}h ${mins}m`,
      netPay: netPay < 0 ? 0 : netPay 
    };
  };

  const openDisburseModal = (emp: any, netPay: number, totalPresent: number, trackedTime: string) => {
    setDisburseData({ emp, netPay, totalPresent, trackedTime });
    setIsDisburseModalOpen(true);
  };

  const confirmDisbursement = async () => {
    if (!disburseData) return;
    const { emp, netPay, totalPresent, trackedTime } = disburseData;
    
    try {
      await addDoc(collection(db, "salary_history"), {
        employeeId: emp.id,
        employeeName: emp.name,
        adminUid: userData.uid,
        baseSalary: parseFloat(emp.salary) || 0,
        totalAttendance: totalPresent,
        trackedTime: trackedTime,
        netSalary: netPay,
        month: currentMonth,
        year: currentYear,
        disbursedAt: Timestamp.now(),
        status: "Paid"
      });

      setSalaryHistory(prev => [...prev, { employeeId: emp.id, month: currentMonth, year: currentYear }]);
      
      notify(`PKR ${netPay.toLocaleString()} disbursed successfully! 🚀`);
      setIsDisburseModalOpen(false);
      setDisburseData(null);
    } catch (err) { 
      notify("System error while recording payment."); 
    }
  };

  // 📄 FINAL FEATURE: GENERATE OFFICIAL PDF SLIP
  const handleGenerateSlip = (emp: any, netPay: number, totalPresent: number, trackedTime: string) => {
    if (!hasAccess) {
      setIsPremiumModalOpen(true);
      return;
    }

    const baseSalary = parseFloat(emp.salary) || 0;
    const deduction = baseSalary > netPay ? baseSalary - netPay : 0;
    const officeName = userData?.officeName || "Organization Name";

    // 🎨 Professional Cinematic Slip Template
    const slipHTML = `
      <html>
        <head>
          <title>Salary_Slip_${emp.name.replace(/\s+/g, '_')}_${currentMonth}</title>
          <style>
            body { font-family: 'Arial', sans-serif; color: #111827; padding: 40px; background: #f8fafc; }
            .slip-container { max-width: 800px; margin: 0 auto; background: #fff; padding: 50px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
            .header { text-align: center; border-bottom: 4px solid #2563eb; padding-bottom: 30px; margin-bottom: 40px; }
            .header h1 { font-size: 40px; font-weight: 900; font-style: italic; text-transform: uppercase; color: #111827; margin: 0; letter-spacing: -1px; }
            .header h1 span { color: #2563eb; }
            .header p { color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 4px; font-size: 12px; margin-top: 10px; }
            .grid-2 { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 20px;}
            .box { background: #f8fafc; padding: 25px; border-radius: 16px; border: 1px solid #f1f5f9; width: 48%; }
            .box-title { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; }
            .box-value { font-size: 18px; font-weight: 900; color: #111827; text-transform: uppercase; margin: 0; }
            .table-container { margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; padding: 15px; background: #f8fafc; color: #94a3b8; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
            td { padding: 20px 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: bold; color: #111827; }
            .total-row { background: #2563eb; color: #fff; }
            .total-row td { color: #fff !important; font-size: 24px; font-weight: 900; font-style: italic; border: none;}
            .footer { text-align: center; color: #94a3b8; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 50px; }
            @media print {
              body { background: #fff; padding: 0; }
              .slip-container { box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="slip-container">
            <div class="header">
              <h1>${officeName.split(' ')[0]} <span>${officeName.split(' ').slice(1).join(' ') || ''}</span></h1>
              <p>Official Salary Slip • ${currentMonth} ${currentYear}</p>
            </div>
            
            <div class="grid-2">
              <div class="box">
                <div class="box-title">Employee Name</div>
                <div class="box-value">${emp.name}</div>
                <div class="box-title" style="margin-top: 20px;">Designation</div>
                <div class="box-value" style="font-size: 14px; color: #2563eb;">${emp.designation || "Staff Member"}</div>
              </div>
              <div class="box">
                <div class="box-title">Billing Period</div>
                <div class="box-value">${currentMonth} ${currentYear}</div>
                <div class="box-title" style="margin-top: 20px;">Verification Status</div>
                <div class="box-value" style="font-size: 14px; color: #10b981;">Verified by System</div>
              </div>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Gross Base Pay</td>
                    <td style="text-align: right;">${baseSalary.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Attendance Records (${totalPresent} Days / ${trackedTime} Tracked)</td>
                    <td style="text-align: right;">-</td>
                  </tr>
                  <tr>
                    <td style="color: #ef4444;">Deductions (Late / Absent Log)</td>
                    <td style="text-align: right; color: #ef4444;">- ${deduction.toLocaleString()}</td>
                  </tr>
                  <tr class="total-row">
                    <td style="border-radius: 16px 0 0 16px;">NET DISBURSED PAY</td>
                    <td style="text-align: right; border-radius: 0 16px 16px 0;">PKR ${netPay.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="footer">
              <p>This is a system generated slip. No physical signature is required.</p>
              <p style="margin-top: 5px; color: #cbd5e1;">Generated securely via AttendX Enterprise System</p>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(slipHTML);
      printWindow.document.close();
    } else {
      notify("Pop-ups blocked! Bhai, browser settings mein pop-ups allow karein PDF download karne ke liye.");
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 max-w-full overflow-hidden pb-20 px-4 mt-4 text-gray-900">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase leading-none">
            Payroll <span className="text-blue-600">Engine</span>
          </h1>
          <p className="text-gray-500 font-medium italic mt-2 text-sm flex items-center gap-2">
            <Activity size={14} className="text-blue-600 animate-pulse" /> Live Per-Minute Tracking System
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {userData?.isPremium ? (
             <div className="bg-blue-50 border border-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
               <Crown size={12} /> Premium Active
             </div>
          ) : (
             <div className="bg-yellow-50 border border-yellow-100 text-yellow-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
               <Clock size={12} /> {userData?.isPremium === false ? "Trial Expired" : "14-Day Free Trial"}
             </div>
          )}
          <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase italic shadow-xl">
            {currentMonth} {currentYear}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[40px] shadow-2xl shadow-blue-900/20 flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest leading-none">Your Monthly Liability</p>
            <h4 className="text-3xl md:text-5xl font-black italic text-white mt-2 leading-none tracking-tighter">
              PKR {employees.reduce((acc, curr) => acc + (parseFloat(curr.salary) || 0), 0).toLocaleString()}
            </h4>
          </div>
          <div className="bg-white/10 p-5 rounded-3xl text-white backdrop-blur-md group-hover:scale-110 transition-transform">
            <Banknote size={32} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-xl transition-all group">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Your Active Staff</p>
            <h4 className="text-3xl md:text-5xl font-black italic text-gray-900 mt-2 leading-none tracking-tighter">
              {employees.length} <span className="text-xl text-gray-300">Staff</span>
            </h4>
          </div>
          <div className="bg-gray-50 p-5 rounded-3xl text-gray-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
            <Users size={32} />
          </div>
        </div>
      </div>

      <div className="bg-white p-2 rounded-[28px] border border-gray-100 shadow-sm">
        <div className="bg-gray-50 flex items-center gap-3 px-6 py-4 rounded-[20px] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search className="text-gray-400 shrink-0" size={20} />
          <input 
            type="text" 
            placeholder="Search your staff..." 
            className="bg-transparent border-none outline-none w-full font-bold text-sm text-gray-900"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest">
                <th className="p-8">Employee</th>
                <th className="p-8 text-center">Base Salary</th>
                <th className="p-8">Present Days</th>
                <th className="p-8">Tracked Time</th>
                <th className="p-8 text-right">Net Payment</th>
                <th className="p-8 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold">
              {loading ? (
                <tr><td colSpan={6} className="p-10 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto" size={32} /></td></tr>
              ) : (
                employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map((emp) => {
                  const { totalPresent, formattedTime, netPay } = getPayrollDetails(emp);
                  
                  const hasBeenPaidThisMonth = salaryHistory.some(s => s.employeeId === emp.id && s.month === currentMonth && s.year === currentYear);

                  return (
                    <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group text-sm">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 shrink-0 bg-blue-600 text-white rounded-[18px] flex items-center justify-center font-black italic shadow-md text-lg">{emp.name[0]}</div>
                          <div className="flex flex-col">
                            <span className="font-black text-gray-900 uppercase italic leading-none whitespace-nowrap text-base">{emp.name}</span>
                            <span className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-widest">{emp.designation || "Staff"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-center text-gray-400 italic font-black whitespace-nowrap">PKR {emp.salary}</td>
                      <td className="p-6"><div className="flex items-center gap-2 bg-gray-50 w-max px-4 py-2 rounded-xl text-gray-600 italic whitespace-nowrap"><CalendarDays size={16} /><span className="font-black text-xs">{totalPresent} Days</span></div></td>
                      <td className="p-6"><div className="flex items-center gap-2 bg-blue-50 w-max px-4 py-2 rounded-xl text-blue-700 italic whitespace-nowrap border border-blue-100"><Clock size={16} /><span className="font-black text-xs tracking-wider">{formattedTime}</span></div></td>
                      <td className="p-6 text-right"><div className="flex flex-col items-end"><p className="text-2xl font-black text-green-600 tracking-tighter italic leading-none whitespace-nowrap">PKR {netPay.toLocaleString()}</p></div></td>
                      <td className="p-6">
                        <div className="flex flex-col gap-2">
                          
                          <button 
                            disabled={!isDisburseEnabled || netPay === 0 || hasBeenPaidThisMonth} 
                            onClick={() => openDisburseModal(emp, netPay, totalPresent, formattedTime)} 
                            className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap ${
                              hasBeenPaidThisMonth 
                                ? "bg-green-100 text-green-700 cursor-not-allowed shadow-none border border-green-200" 
                                : (isDisburseEnabled && netPay > 0) 
                                  ? "bg-gray-900 text-white hover:bg-blue-600 shadow-blue-200" 
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            {hasBeenPaidThisMonth ? <CheckCircle2 size={14} /> : (!isDisburseEnabled || netPay === 0 ? <Lock size={14} /> : <Banknote size={14} />)} 
                            {hasBeenPaidThisMonth ? "Paid" : (!isDisburseEnabled ? "Locked" : "Disburse")}
                          </button>
                          
                          <button onClick={() => handleGenerateSlip(emp, netPay, totalPresent, formattedTime)} className="w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white active:scale-95">
                            {!hasAccess ? <Crown size={14} className="text-amber-500" /> : <FileText size={14} />} 
                            Generate Slip
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isDisburseModalOpen && disburseData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden border border-gray-50 animate-in zoom-in duration-300">
            <div className="bg-blue-600 p-8 text-white text-center relative overflow-hidden">
              <div className="bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <Banknote size={32} />
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Confirm Payout</h3>
              <p className="text-blue-100 text-[10px] font-bold uppercase mt-2 tracking-widest">Action Cannot Be Undone</p>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-gray-500 font-bold text-center italic text-sm leading-relaxed">
                Kya aap waqai <strong>{disburseData.emp.name}</strong> ko is maheene ki salary <strong>PKR {disburseData.netPay.toLocaleString()}</strong> disburse karna chahte hain?
              </p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsDisburseModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                <button onClick={confirmDisbursement} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">Yes, Disburse</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPremiumModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-xl" onClick={() => setIsPremiumModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[50px] overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-yellow-100">
            <button onClick={() => setIsPremiumModalOpen(false)} className="absolute top-6 right-6 z-10 bg-white/20 text-white p-2 rounded-full backdrop-blur-md hover:bg-white/40 transition-all"><X size={18} /></button>
            
            <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
              <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30 shadow-xl">
                <Crown size={32} className="text-white" />
              </div>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">Unlock Premium</h3>
              <p className="text-yellow-100 text-[10px] font-bold uppercase mt-2 tracking-widest">PKR 5,000 / Month</p>
            </div>
            
            <div className="p-8 space-y-6">
              <p className="text-gray-500 font-bold italic text-sm text-center leading-relaxed">
                Premium access ke liye neechay diye gaye account mein payment transfer karein aur WhatsApp par screenshot bhej dein.
              </p>
              
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-3 shadow-inner">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bank</span>
                  <span className="font-black text-sm italic text-gray-900 uppercase">Meezan Bank</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</span>
                  <span className="font-black text-sm italic text-gray-900 uppercase">ALIYAN ASIF</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account #</span>
                  <span className="font-black text-sm italic text-gray-900 tracking-wider">00300114548188</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">IBAN</span>
                  <span className="font-black text-xs italic text-gray-900 tracking-wider">PK16MEZN0000300114548188</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch</span>
                  <span className="font-black text-[10px] italic text-gray-900 text-right uppercase">MEEZAN DIGITAL CENTRE</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
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
        </div>
      )}

    </div>
  );
}