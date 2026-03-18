import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Database, Car, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { collectionsAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
      <Icon size={24} />
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
  </div>
);

const Home = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    collectionsAPI.list()
      .then((data) => setCollections(data.collections || []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="relative z-10 text-center max-w-3xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider"
          >
            <Zap size={14} />
            Next-Gen AI Detection
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl font-black text-gray-900 tracking-tight leading-[1.1]"
          >
            AI Vehicle Number Plate <br />
            <span className="text-blue-600">Detection System</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed"
          >
            Automate your vehicle logging with our state-of-the-art YOLO-based detection system.
            Perfect for schools, apartments, and corporate offices.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-4"
          >
            <Link
              to="/upload"
              className="px-8 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              <Zap size={20} />
              Try Detection
            </Link>
            {user ? (
              <Link
                to="/collections"
                className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <Database size={20} />
                View Collections
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <Shield size={20} />
                Sign In to Save
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard
          icon={Shield}
          title="Secure Logging"
          description="Every detection is stored with high-resolution timestamps and owner details for maximum security."
        />
        <FeatureCard
          icon={Zap}
          title="Real-time Detection"
          description="Powered by YOLOv8 and EasyOCR for lightning-fast plate extraction and processing."
        />
        <FeatureCard
          icon={Database}
          title="Centralized Data"
          description="Manage multiple entry points from a single dashboard with organized collection groups."
        />
      </section>

      {/* Collections Preview Section or Login Prompt */}
      {user ? (
        <section className="space-y-10">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-900">Active Collections</h2>
              <p className="text-gray-500 text-lg">Monitor your primary entry points in real-time.</p>
            </div>
            <Link to="/collections" className="text-gray-900 font-bold flex items-center gap-2 hover:underline">
              View All <ArrowRight size={20} />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={40} className="animate-spin text-gray-300" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-gray-100 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-gray-400 mb-6">
                <Database size={32} />
              </div>
              <p className="text-xl font-bold text-gray-900">No collections yet</p>
              <p className="text-gray-500 mt-2">Create a collection to start tracking and analyzing logs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {collections.slice(0, 3).map((col) => (
                <Link key={col._id} to={`/collections/${col._id}`} className="group bg-white border border-gray-100 rounded-[2rem] p-8 hover:border-gray-300 hover:shadow-md transition-all flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                     <div className="w-14 h-14 bg-gray-900 text-white rounded-[1.5rem] flex items-center justify-center transition-transform group-hover:scale-105">
                        <Car size={28} />
                     </div>
                     <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                        <ArrowRight size={20} />
                     </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 truncate" title={col.name}>{col.name}</h3>
                  <p className="text-gray-500 text-sm mb-8">
                    {col.members?.length || 0} member{(col.members?.length || 0) !== 1 ? 's' : ''} · Created {new Date(col.createdAt).toLocaleDateString()}
                  </p>
                  
                  <div className="mt-auto pt-6 border-t border-gray-50 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-gray-900">{(col.logsCount || 0).toLocaleString()}</span>
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Logs</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="bg-gray-900 rounded-[2rem] p-12 text-center text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
           
           <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <div className="w-20 h-20 bg-white/10 text-white rounded-[1.5rem] flex items-center justify-center mx-auto">
                 <Shield size={32} />
              </div>
              <div>
                 <h2 className="text-3xl font-black mb-4">Unlock Full Capabilities</h2>
                 <p className="text-gray-400 text-lg">Create a free account to save detection logs, manage collections, and collaborate with your team to monitor all entry points.</p>
              </div>
              <div className="flex justify-center">
                 <Link to="/signup" className="px-8 py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors">
                    Create Free Account
                 </Link>
              </div>
           </div>
        </section>
      )}
    </div>
  );
};

export default Home;
