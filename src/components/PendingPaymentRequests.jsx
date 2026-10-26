import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { buildGoldUpgradeFields } from "../utils/membershipSchema";
import { sendGoldUpgradeEmailIfActive } from "../lib/emailService";
import { ShieldCheck, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";

export function PendingPaymentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "membership_requests"),
      where("status", "==", "pending_verification")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setRequests(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching membership requests:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (request) => {
    if (!confirm(`Approve GOLD membership for ${request.userName} (UTR: ${request.utrNumber})?`)) return;

    setActionLoadingId(request.id);
    try {
      const userDocRef = doc(db, "users", request.userId);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.exists() ? userSnap.data() : { uid: request.userId };

      const months = request.durationMonths || (request.planId === "plan_12m" ? 12 : request.planId === "plan_6m" ? 6 : 3);
      const upgradeFields = buildGoldUpgradeFields(userData, {
        amount: request.amount,
        durationMonths: months,
        transactionId: `UPI_${request.utrNumber}`
      });

      await updateDoc(userDocRef, upgradeFields);

      // Trigger automatic upgrade email if email notification system is enabled
      const userFullRecord = {
        ...userData,
        ...upgradeFields,
        email: request.userEmail || userData.email,
        name: request.userName || userData.name || userData.displayName,
      };
      sendGoldUpgradeEmailIfActive(db, userFullRecord, 'admin').catch(e => console.error("Payment approval upgrade email error:", e));

      await updateDoc(doc(db, "membership_requests", request.id), {
        status: "approved",
        approvedAt: new Date().toISOString()
      });

      alert(`Successfully upgraded ${request.userName} to GOLD!`);
    } catch (err) {
      console.error("Failed to approve request:", err);
      alert("Error approving request: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (request) => {
    const reason = prompt("Reason for rejection (optional):", "Invalid UTR or payment not received");
    if (reason === null) return;

    setActionLoadingId(request.id);
    try {
      await updateDoc(doc(db, "membership_requests", request.id), {
        status: "rejected",
        rejectionReason: reason,
        rejectedAt: new Date().toISOString()
      });
      alert("Payment request rejected.");
    } catch (err) {
      alert("Error rejecting request: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (request) => {
    if (!confirm(`Permanently delete payment request for ${request.userName} (UTR: ${request.utrNumber})?`)) return;

    setActionLoadingId(request.id);
    try {
      await deleteDoc(doc(db, "membership_requests", request.id));
      alert("Payment request deleted permanently.");
    } catch (err) {
      console.error("Failed to delete request:", err);
      alert("Error deleting request: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return <div className="p-4 text-xs font-bold text-gray-500">Loading pending verification requests...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center text-gray-500 text-xs">
        <Clock size={24} className="mx-auto mb-2 text-gray-400" />
        No pending UPI payment verification requests.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <ShieldCheck size={18} className="text-amber-500" /> Pending UPI Payment Verifications ({requests.length})
        </h3>
      </div>

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm bg-white dark:bg-gray-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 uppercase text-[10px] font-extrabold">
            <tr>
              <th className="p-3">User & Email</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Amount</th>
              <th className="p-3">UTR / Ref Number</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {requests.map(req => (
              <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                <td className="p-3 font-semibold">
                  <div className="text-gray-900 dark:text-white">{req.userName}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{req.userEmail || req.userId}</div>
                </td>
                <td className="p-3 font-bold text-amber-600 dark:text-amber-400">{req.planTitle}</td>
                <td className="p-3 font-black">₹{req.amount}</td>
                <td className="p-3 font-mono font-bold text-gray-800 dark:text-gray-200 select-all">{req.utrNumber}</td>
                <td className="p-3 text-gray-500 text-[11px]">{new Date(req.createdAt).toLocaleString()}</td>
                <td className="p-3 text-right space-x-2">
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={actionLoadingId === req.id}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm inline-flex items-center gap-1"
                  >
                    <CheckCircle size={13} /> Approve GOLD
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    disabled={actionLoadingId === req.id}
                    className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-lg font-bold text-xs inline-flex items-center gap-1"
                  >
                    <XCircle size={13} /> Reject
                  </button>
                  <button
                    onClick={() => handleDelete(req)}
                    disabled={actionLoadingId === req.id}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg font-bold text-xs inline-flex items-center gap-1"
                    title="Delete request permanently"
                  >
                    <Trash2 size={13} className="text-slate-500" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
