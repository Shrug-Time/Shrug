"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/hooks/useUser';
import { auth } from '@/firebase';
import { useRouter } from 'next/navigation';

interface UserItem {
  id: string;
  name: string;
  email: string;
  username: string;
  membershipTier: string;
  photoURL?: string;
  createdAt: number;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { profile } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionResult, setActionResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ action: string; label: string; data: any } | null>(null);

  const isAdmin = profile?.membershipTier === 'admin';

  useEffect(() => {
    if (profile && !isAdmin) {
      router.push('/');
    }
  }, [profile, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const getToken = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not logged in');
    return currentUser.getIdToken();
  };

  const adminAction = async (action: string, data: any = {}) => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/god', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setActionResult({ message: result.message, type: 'success' });
      if (['deleteUser', 'deleteProfilePhoto', 'updateUser'].includes(action)) loadUsers();
      return result;
    } catch (error: any) {
      setActionResult({ message: error.message, type: 'error' });
      throw error;
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await adminAction('listUsers', { limit: 100 });
      setUsers(result.users || []);
    } catch {
      // error already shown
    } finally {
      setLoading(false);
    }
  };

  const executeConfirmed = async () => {
    if (!confirmAction) return;
    try {
      await adminAction(confirmAction.action, confirmAction.data);
    } catch {
      // error already shown
    }
    setConfirmAction(null);
  };

  if (!isAdmin) {
    return <div className="flex items-center justify-center min-h-[60vh] text-gray-500">Access denied</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
      <p className="text-gray-500 mb-6 text-sm">God mode. Be careful.</p>

      {actionResult && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${actionResult.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {actionResult.message}
          <button onClick={() => setActionResult(null)} className="ml-2 font-medium underline">dismiss</button>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="font-semibold mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-600 mb-4">{confirmAction.label}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
              <button onClick={executeConfirmed} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Users ({users.length})</h2>
          <button onClick={loadUsers} disabled={loading} className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4">User</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Tier</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                          {u.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-gray-400 text-xs">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{u.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      u.membershipTier === 'admin' ? 'bg-red-100 text-red-700' :
                      u.membershipTier === 'premium' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {u.membershipTier}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1 flex-wrap">
                      {u.photoURL && (
                        <button
                          onClick={() => setConfirmAction({
                            action: 'deleteProfilePhoto',
                            label: `Remove ${u.name}'s profile photo?`,
                            data: { userId: u.id }
                          })}
                          className="px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
                        >
                          Remove Photo
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmAction({
                          action: 'deleteUser',
                          label: `Permanently delete ${u.name} (${u.email})? This cannot be undone.`,
                          data: { userId: u.id }
                        })}
                        className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                        disabled={u.id === user?.uid}
                      >
                        Delete User
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
