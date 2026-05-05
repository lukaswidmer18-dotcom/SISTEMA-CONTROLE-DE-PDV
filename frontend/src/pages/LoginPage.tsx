import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login.';
      const axiosMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(axiosMsg || message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f2d29 0%, #17413B 50%, #1a433e 100%)' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: '#BC933F' }} />
        <div className="absolute -bottom-48 -left-24 w-80 h-80 rounded-full opacity-5"
          style={{ background: '#BC933F' }} />
        <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full opacity-30"
          style={{ background: '#BC933F' }} />
        <div className="absolute top-2/3 left-1/3 w-1.5 h-1.5 rounded-full opacity-20"
          style={{ background: '#BC933F' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center leading-none select-none mb-4">
            <p className="text-gold-400 text-sm font-semibold tracking-[0.4em] uppercase mb-1">Grupo</p>
            <p className="text-white font-black tracking-tight"
              style={{ fontSize: '3.5rem', lineHeight: 1, letterSpacing: '-0.02em' }}>
              PLUMA
            </p>
          </div>
          <div className="w-16 h-0.5 bg-gold-500 mx-auto mb-4 rounded-full" />
          <p className="text-pluma-200 text-sm font-medium tracking-wide">Sistema de Controle de PDV</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Gold accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600" />

          <div className="p-7">
            <h2 className="text-pluma-800 font-bold text-lg mb-1">Acesso ao sistema</h2>
            <p className="text-gray-400 text-sm mb-6">Entre com suas credenciais corporativas</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Autenticando...
                  </span>
                ) : 'Entrar'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-pluma-400 text-[11px] mt-6">
          © 2026 Grupo Pluma • Desenvolvido por Lukas Widmer
        </p>
      </div>
    </div>
  );
}
