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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden surface-dots animate-fade-in">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-pluma-950/30" />
        <div className="absolute left-[-10%] top-24 h-px w-[120%] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
        <div className="absolute left-[-10%] bottom-20 h-px w-[120%] bg-gradient-to-r from-transparent via-gold-400/30 to-transparent" />
      </div>

      <div className="w-full max-w-[390px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-7 animate-slide-up">
          <div className="inline-flex flex-col items-center leading-none select-none mb-4">
            <p className="text-gold-400 text-xs font-semibold tracking-[0.42em] uppercase mb-2">Grupo</p>
            <p className="text-white font-black"
              style={{ fontSize: '3.35rem', lineHeight: 1 }}>
              PLUMA
            </p>
          </div>
          <div className="w-16 h-0.5 bg-gold-500 mx-auto mb-4 rounded-full" />
          <p className="text-pluma-200 text-sm font-medium tracking-wide">Sistema de Controle de PDV</p>
        </div>

        {/* Card */}
        <div
          className="bg-white/95 backdrop-blur-sm rounded-lg border border-white/80 overflow-hidden animate-slide-up"
          style={{
            animationDelay: '110ms',
            boxShadow: '0 24px 60px rgba(8, 26, 23, 0.3), 0 2px 8px rgba(8, 26, 23, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          }}
        >
          {/* Gold accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-gold-700 via-gold-300 to-gold-700 animate-shimmer" />

          <div className="px-7 py-7 sm:px-8">
            <h2 className="text-pluma-800 font-bold text-lg mb-1">Acesso ao sistema</h2>
            <p className="text-gray-500 text-sm mb-6">Entre com suas credenciais corporativas</p>

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
        <p className="text-center text-pluma-200 text-[11px] mt-6 animate-fade-in" style={{ animationDelay: '240ms' }}>
          © 2026 Grupo Pluma • Desenvolvido por Lukas Widmer
        </p>
      </div>
    </div>
  );
}
