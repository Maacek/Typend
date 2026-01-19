'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/register', { email, password, name });
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            router.push('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registrace selhala');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center">
                    <Link href="/login" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Zpět na přihlášení
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Visual<span className="text-indigo-600">Analyzer</span>
                    </h1>
                    <p className="mt-2 text-slate-500">Vytvořte si nový účet</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleRegister}>
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                placeholder="Vaše jméno"
                            />
                        </div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                placeholder="Emailová adresa"
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                placeholder="Heslo"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Zaregistrovat se'}
                    </button>

                    <div className="text-center text-sm text-slate-500">
                        Již máte účet?{' '}
                        <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-500">
                            Přihlaste se
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
