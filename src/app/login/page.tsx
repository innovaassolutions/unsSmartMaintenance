'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/NoAuthContext';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    console.log('🚀 Login attempt started');

    try {
      const { error } = await signIn(formData.email, formData.password);
      console.log('🔐 SignIn result:', { error });

      if (error) {
        console.log('❌ Login failed:', error.message);
        setError(
          error.message || 'Invalid email or password. Please try again.'
        );
      } else {
        console.log('✅ Login successful, attempting redirect...');
        console.log('📍 Current URL:', window.location.href);
        router.push('/');
        console.log('🔄 Redirect called to "/"');

        // Check if redirect worked after a short delay
        setTimeout(() => {
          console.log('📍 URL after redirect:', window.location.href);
        }, 1000);
      }
    } catch (err) {
      console.log('💥 Login exception:', err);
      setError('An error occurred during login. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 flex items-center justify-center p-4">
      {/* Main Login Container */}
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex">
          {/* Left Panel - Branding & Mascot */}
          <div className="flex-1 bg-white p-8 flex flex-col items-center justify-center">
            {/* Pntar AI Logo */}
            <div className="mb-8">
              <Image
                src="/Pntar_AI_Logo.png"
                alt="Pntar.ai Logo"
                width={315}
                height={157.5}
                className="w-auto h-16"
              />
            </div>

            {/* Mascot */}
            <div className="mb-8">
              <Image
                src="/PntarMascot.png"
                alt="Pntar Mascot"
                width={220}
                height={220}
                className="w-auto h-48"
              />
            </div>

            {/* Branding Text */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Digital Hub
              </h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                Intelligent Manufacturing • Predictive Analytics • AI-Powered
                Insights
              </p>
            </div>
          </div>

          {/* Right Panel - Login Form */}
          <div className="flex-1 bg-gray-900 p-8 flex flex-col justify-center">
            {/* Welcome Text */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-400">Sign in to access your dashboard</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-xl flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email address"
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors duration-200 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-600 rounded bg-gray-800 disabled:opacity-50"
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm text-gray-300">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="text-orange-400 hover:text-orange-300 font-medium transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </p>
            </div>

            {/* Footer Links */}
            <div className="mt-8 text-center">
              <div className="flex justify-center space-x-6 text-xs text-gray-500">
                <Link
                  href="/terms"
                  className="hover:text-gray-400 transition-colors duration-200"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy"
                  className="hover:text-gray-400 transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
