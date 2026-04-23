"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import AddEmployeeModal from "@/components/AddEmployeeModal";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Firebase se data "Live" kheenchnay ke liye
    const q = query(collection(db, "employees"), orderBy("joiningDate", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const empData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmployees(empData);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees Management</h1>
          <p className="text-gray-500 text-sm">Manage your team and their salary structures.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          + Add New Employee
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-20 text-center text-gray-400 font-medium">Loading employees...</div>
        ) : employees.length === 0 ? (
          <div className="p-20 text-center text-gray-400 font-medium">No employees found. Add your first one!</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Employee Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Job Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Salary</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{emp.name}</p>
                    <p className="text-[10px] font-mono text-gray-400 uppercase">{emp.id.substring(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">{emp.role}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{emp.salary}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal taake yahan se bhi add ho sakay */}
      <AddEmployeeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}