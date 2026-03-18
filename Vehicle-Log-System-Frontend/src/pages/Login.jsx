import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Car, Loader2, Mail, Lock, AlertCircle } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] px-4 font-sans">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-[1.5rem] text-white mb-6">
                        <Car size={32} />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Welcome back</h1>
                    <p className="text-gray-500 mt-3 text-lg">Sign in to your AutoLog AI account</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2rem] border border-gray-100 shadow-sm space-y-6 relative overflow-hidden">
                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900">Email Address</label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900">Password</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 size={24} className="animate-spin" /> : 'Sign In'}
                    </button>

                    <p className="text-center text-gray-500 pt-4 border-t border-gray-50">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-gray-900 font-bold hover:underline">Create one</Link>
                    </p>
                </form>
                
                <div className="text-center mt-8">
                     <Link to="/" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
                        ← Back to Home
                     </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
