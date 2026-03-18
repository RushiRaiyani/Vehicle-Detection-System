import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, Database, Users, ArrowRight, Plus, LogIn, Loader2, Trash2, Copy, Check, X } from 'lucide-react';
import { collectionsAPI } from '../api/api';

const CollectionCard = ({ collection, onDelete }) => (
  <div className="bg-white border border-gray-100 rounded-[2rem] p-8 hover:border-gray-300 hover:shadow-md transition-all group flex flex-col">
    <div className="flex items-start justify-between mb-8">
      <div className="w-14 h-14 bg-gray-900 text-white rounded-[1.5rem] flex items-center justify-center transition-transform group-hover:scale-105">
        <Car size={28} />
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Access Code</p>
        <p className="text-sm font-mono font-bold text-gray-900">{collection.groupCode}</p>
      </div>
    </div>

    <h3 className="text-2xl font-bold text-gray-900 mb-2 truncate" title={collection.name}>{collection.name}</h3>
    <p className="text-gray-500 text-sm mb-8">
      Created on {new Date(collection.createdAt).toLocaleDateString()}
    </p>

    <div className="grid grid-cols-2 gap-4 mb-8">
      <div className="bg-gray-50 rounded-[1.25rem] p-4">
        <div className="flex items-center gap-2 text-gray-400 mb-1">
          <Database size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Logs</span>
        </div>
        <p className="text-sm font-black text-gray-900">{(collection.logsCount || 0).toLocaleString()}</p>
      </div>
      <div className="bg-gray-50 rounded-[1.25rem] p-4">
        <div className="flex items-center gap-2 text-gray-400 mb-1">
          <Users size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Members</span>
        </div>
        <p className="text-sm font-black text-gray-900">{collection.members?.length || 0}</p>
      </div>
    </div>

    <div className="flex gap-3 mt-auto pt-6 border-t border-gray-50">
      <Link
        to={`/collections/${collection._id}`}
        className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg shadow-gray-100"
      >
        View Details
        <ArrowRight size={18} />
      </Link>
      <button
        onClick={() => onDelete(collection._id)}
        className="p-4 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
        title="Delete collection"
      >
        <Trash2 size={18} />
      </button>
    </div>
  </div>
);

// ─── Modal component ──────────────────────────────────────────────────
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-md px-4" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl relative border border-gray-100 scale-in-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-0 left-0 w-full h-2 bg-gray-900"></div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Collections = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchCollections = () => {
    setLoading(true);
    collectionsAPI.list()
      .then((data) => setCollections(data.collections || []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCollections(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const data = await collectionsAPI.create(newName);
      setCreatedCode(data.collection.groupCode);
      setNewName('');
      fetchCollections();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setJoining(true);
    try {
      await collectionsAPI.join(joinCode);
      setJoinCode('');
      setShowJoin(false);
      fetchCollections();
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Warning: This will permanently delete the collection and all recorded logs. Continue?')) return;
    try {
      await collectionsAPI.delete(id);
      fetchCollections();
    } catch (err) {
      alert(err.message);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Your Collections</h1>
          <p className="text-gray-500 text-lg mt-2">Centralized monitoring for all your registered entry points.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowJoin(true); setError(''); }}
            className="px-8 py-4 bg-white border-2 border-gray-100 text-gray-900 rounded-xl font-bold hover:border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <LogIn size={20} />
            Join
          </button>
          <button
            onClick={() => { setShowCreate(true); setError(''); setCreatedCode(''); }}
            className="px-8 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg shadow-gray-200"
          >
            <Plus size={20} />
            New Collection
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={40} className="animate-spin text-gray-300" />
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[2.5rem] border border-gray-100 max-w-2xl mx-auto flex flex-col items-center shadow-sm">
          <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 mb-8">
            <Database size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">No active collections</h2>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">Create a new collection to start tracking vehicle entries at specific locations.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-10 px-8 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
          >
            Get Started
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {collections.map((col) => (
            <CollectionCard key={col._id} collection={col} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Collection">
        {createdCode ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700">
               <Check size={20} className="shrink-0" />
               <p className="text-sm font-bold">Successfully created!</p>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Share this code with your team</p>
              <div className="flex flex-col gap-3">
                <div className="bg-gray-50 rounded-[1.5rem] py-8 text-center border-2 border-dashed border-gray-200 group relative">
                    <span className="font-mono text-4xl font-black text-gray-900 tracking-[0.2em]">{createdCode}</span>
                </div>
                <button 
                  onClick={copyCode} 
                  className="flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                  {copied ? 'Copied to Clipboard' : 'Copy Access Code'}
                </button>
              </div>
            </div>
            <button onClick={() => setShowCreate(false)} className="w-full py-4 bg-white border-2 border-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-50 transition-all">
              Return to Collections
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-8">
            {error && <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in shake duration-300">
               <X size={18} /> {error}
            </div>}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Collection Identity</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Main Gate, North Entrance"
                required
                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-gray-900 placeholder:text-gray-300 font-bold focus:outline-none focus:border-gray-900 focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
            >
              {creating ? <Loader2 size={24} className="animate-spin" /> : 'Confirm & Create'}
            </button>
          </form>
        )}
      </Modal>

      {/* Join Modal */}
      <Modal isOpen={showJoin} onClose={() => setShowJoin(false)} title="Join Existing">
        <form onSubmit={handleJoin} className="space-y-8">
          {error && <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in shake duration-300">
             <X size={18} /> {error}
          </div>}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Unique Access Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              required
              className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-50 rounded-2xl text-center text-3xl font-mono font-black tracking-[0.2em] text-gray-900 uppercase placeholder:text-gray-200 focus:outline-none focus:border-gray-900 focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={joining}
            className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
          >
            {joining ? <Loader2 size={24} className="animate-spin" /> : 'Validate & Join'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Collections;
