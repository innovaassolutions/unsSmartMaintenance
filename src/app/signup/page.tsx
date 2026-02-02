'use client';
import React, { useState } from 'react';
import { useAuth } from '@/contexts/NoAuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  // const [isSuccess, setIsSuccess] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(formData.email, formData.password);

      if (error) {
        setErrors({ submit: error.message });
      } else {
        // Success - redirect to login
        router.push('/login?message=Check your email to confirm your account');
      }
    } catch {
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#374151' }}
    >
      <div className="flex w-full max-w-4xl h-[600px] bg-white rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.15)] overflow-hidden">
        {/* Left Panel - Branding */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
          <div className="text-center">
            {/* Pntar AI Logo Placeholder */}
            <div className="w-[220px] h-[220px] mb-6 mx-auto">
              <Image
                src="/Pntar_AI_Logo.png"
                alt="Pntar AI Mascot"
                width={220}
                height={220}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Pntar Mascot */}
            <div className="w-[220px] h-[220px] mb-6 mx-auto">
              <Image
                src="/PntarMascot.png"
                alt="Pntar AI Mascot"
                width={220}
                height={220}
                className="w-full h-full object-contain"
              />
            </div>

            <h2
              className="text-2xl font-semibold mb-2"
              style={{ color: '#0d1a21' }}
            >
              Join Pntar Digital Hub
            </h2>
            <p className="text-gray-600">
              Start optimizing your manufacturing processes today
            </p>
          </div>
        </div>

        {/* Right Panel - Sign Up Form */}
        <div
          className="flex-1 flex flex-col justify-center p-12"
          style={{ backgroundColor: '#0d1a21' }}
        >
          <div className="w-full max-w-sm mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8 text-center">
              Create Account
            </h1>

            <div className="space-y-6">
              {/* Full Name Field */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 text-white placeholder-gray-400 ${
                    errors.fullName
                      ? 'border-red-500 bg-red-900/20'
                      : 'border-gray-600 bg-gray-800'
                  } focus:outline-none focus:border-blue-500 focus:bg-gray-700`}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="text-red-400 text-sm mt-1">{errors.fullName}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 text-white placeholder-gray-400 ${
                    errors.email
                      ? 'border-red-500 bg-red-900/20'
                      : 'border-gray-600 bg-gray-800'
                  } focus:outline-none focus:border-blue-500 focus:bg-gray-700`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 text-white placeholder-gray-400 ${
                    errors.password
                      ? 'border-red-500 bg-red-900/20'
                      : 'border-gray-600 bg-gray-800'
                  } focus:outline-none focus:border-blue-500 focus:bg-gray-700`}
                  placeholder="Create a password"
                />
                {errors.password && (
                  <p className="text-red-400 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 text-white placeholder-gray-400 ${
                    errors.confirmPassword
                      ? 'border-red-500 bg-red-900/20'
                      : 'border-gray-600 bg-gray-800'
                  } focus:outline-none focus:border-blue-500 focus:bg-gray-700`}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="p-3 bg-red-900/20 border border-red-500 rounded-lg">
                  <p className="text-red-400 text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl hover:from-orange-600 hover:to-orange-700 hover:transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            {/* Sign In Link */}
            <div className="text-center mt-6">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-orange-400 hover:text-orange-300 font-medium transition-colors duration-200"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
