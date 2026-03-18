import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users,
  Database,
  Upload,
  Video,
  Trash2,
  ChevronLeft,
  Search,
  Loader2,
  Copy,
  Check,
  Hash,
  Layout
} from 'lucide-react';
import { collectionsAPI, logsAPI } from '../api/api';

const CollectionDetails = () => {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      collectionsAPI.get(id),
      logsAPI.getByCollection(id),
    ])
      .then(([colData, logsData]) => {
        setCollection(colData.collection);
        setLogs(logsData.logs || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDeleteLog = async (logId) => {
    if (!confirm('Delete this log entry?')) return;
    try {
      await logsAPI.delete(logId);
      setLogs((prev) => prev.filter((l) => l._id !== logId));
    } catch (err) {
      alert(err.message);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(collection.groupCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter((log) =>
    log.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={40} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="text-center py-32 bg-white rounded-[2rem] border border-gray-100 max-w-2xl mx-auto">
        <Layout size={48} className="mx-auto text-gray-300 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900">Collection not found</h2>
        <p className="text-gray-500 mt-2">The collection you are looking for might have been deleted.</p>
        <Link to="/collections" className="mt-8 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold inline-block hover:bg-gray-800 transition-all">Back to Collections</Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Link to="/collections" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
            <ChevronLeft size={16} />
            Back to Collections
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-900 text-white rounded-[1.5rem] flex items-center justify-center">
              <Database size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">{collection.name}</h1>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-full border border-emerald-100">Live</span>
              </div>
              <p className="text-gray-500 mt-1">Created on {new Date(collection.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <button
             onClick={copyCode}
             className="flex items-center gap-2 bg-white border-2 border-gray-100 px-5 py-3 rounded-xl hover:border-gray-200 transition-all group"
           >
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Group Code:</span>
              <span className="font-mono font-bold text-gray-900">{collection.groupCode}</span>
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-gray-400 group-hover:text-gray-900" />}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar: Members & Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-8">
              <Users size={20} className="text-gray-400" />
              Members
              <span className="ml-auto bg-gray-50 text-gray-500 text-xs px-2 py-1 rounded-lg">{collection.members?.length || 0}</span>
            </h2>
            <div className="space-y-6">
              {(collection.members || []).map((member, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs uppercase group-hover:bg-gray-900 group-hover:text-white transition-all">
                    {member.name?.split(' ').map((n) => n[0]).join('') || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{member.name}</p>
                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-[2rem] border border-gray-100 p-8">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Quick Overview</h3>
            <div className="space-y-4">
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Logs</p>
                  <p className="text-3xl font-black text-gray-900">{logs.length.toLocaleString()}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Detection</p>
                  <p className="text-sm font-bold text-gray-900">
                    {logs.length > 0 ? new Date(logs[0].detectedAt).toLocaleDateString() : 'Never'}
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Main: Logs Content */}
        <div className="lg:col-span-3 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find a vehicle number..."
                className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <Link to={`/upload?collectionId=${id}`} className="px-6 py-4 bg-gray-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
                <Upload size={18} />
                New Detection
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50 uppercase tracking-widest text-[10px] font-bold text-gray-400 bg-gray-50/30">
                    <th className="px-8 py-6">Date</th>
                    <th className="px-8 py-6">License Plate</th>
                    <th className="px-8 py-6">Registered By</th>
                    <th className="px-8 py-6 text-center">Source</th>
                    <th className="px-8 py-6 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center opacity-30">
                           <Database size={48} className="mb-4" />
                           <p className="font-bold">{searchTerm ? 'No results found' : 'No entries yet'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-8 py-6">
                           <p className="text-sm font-bold text-gray-900">{new Date(log.detectedAt).toLocaleDateString()}</p>
                           <p className="text-[10px] text-gray-400 font-medium">{new Date(log.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="font-mono text-base font-black bg-gray-900 text-white px-3 py-1.5 rounded-lg tracking-wider">
                            {log.vehicleNumber}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-[10px] flex items-center justify-center font-black">
                                 {log.detectedByUser?.name?.[0] || 'U'}
                              </div>
                              <span className="text-sm font-bold text-gray-900">{log.detectedByUser?.name || 'Unknown'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            log.sourceType === 'video' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {log.sourceType}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button
                            onClick={() => handleDeleteLog(log._id)}
                            className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredLogs.length > 0 && (
              <div className="px-8 py-6 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                   Showing {filteredLogs.length} Entries
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionDetails;
