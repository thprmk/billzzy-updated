'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '../ui/Select';
import { FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';

import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { TermsModal } from '../ui/TermsModal';
import { TrialModal } from '../ui/TrailModal';
import { getPincodeDetails } from '@/lib/utils/pincode';

const COMPANY_SIZES = [
  { value: 'solo', label: 'Just me' },
  { value: 'small', label: '1-10 employees' },
  { value: 'medium', label: '11-50 employees' },
  { value: 'large', label: '50+ employees' }
];

export default function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    companySize: '',
    shopName: '',
    flatNo: '',
    street: '',
    city: '',
    district: '',
    state: '',
    country: 'India',
    pincode: '',
    mobileNumber: '',
    landlineNumber: '',
    websiteAddress: '',
    gstNumber: '',
    subscriptionType: 'trial'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pincode = e.target.value;
    handleInputChange(e);

    if (pincode.length === 6) {
      try {
        setIsLoading(true);
        const details = await getPincodeDetails(pincode);
        setFormData(prev => ({
          ...prev,
          ...details
        }));
        toast.success('Address details fetched successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to fetch pincode details');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    return /^[0-9]{10}$/.test(phone);
  };

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.name || !formData.phone) {
      toast.error('Please fill in all required fields');
      return false;
    }

    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (!validatePhone(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return false;
    }

    if (!formData.companySize) {
      toast.error('Please select your company size');
      return false;
    }

    if (!acceptedTerms) {
      toast.error('Please accept the terms and conditions');
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setIsTrialModalOpen(true);
    }
  };

  const handleTrialConfirm = () => {
    setIsTrialModalOpen(false);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      toast.success('Registration successful! Please login.');
      router.push('/login?registered=true');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

// Previous code remains same until return statement

return (
  <div className="max-h-screen w-[500px]">
    <div className="relative w-full mx-auto  md:p-0">
      <div className="bg-white/80  backdrop-blur-lg rounded-2xl shadow-xl  md:p-8">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {step === 1 ? 'Account Details' : 'Business Information'}
            </h2>
            <span className="text-sm text-gray-500">Step {step} of 2</span>
          </div>
       
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {/* Previous form content with grid adjustments */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={formVariants}
            transition={{ duration: 0.5 }}
            // className="max-h-[calc(100vh-250px)] "
          >
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

{step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full pr-10"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <Input
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  name="phone"
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  pattern="[0-9]{10}"
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Company Size
                </label>
                <Select
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                >
                  <option value="">Select company size</option>
                  {COMPANY_SIZES.map(size => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I accept the{' '}
                  <button
                    type="button"
                    onClick={() => setIsTermsModalOpen(true)}
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    terms and conditions
                  </button>
                </label>
              </div>

             
            </div>
          )}

            {/* Step 2 Content */}
            {step === 2 && (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Shop Details Section */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Shop Name
                  </label>
                  <Input
                    type="text"
                    name="shopName"
                    placeholder="Your Shop Name"
                    value={formData.shopName}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>

                {/* Address Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Flat/Shop No
                  </label>
                  <Input
                    type="text"
                    name="flatNo"
                    placeholder="Flat/Shop Number"
                    value={formData.flatNo}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Street
                  </label>
                  <Input
                    type="text"
                    name="street"
                    placeholder="Street Name"
                    value={formData.street}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Pincode Section */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Pincode
                  </label>
                  <Input
                    type="text"
                    name="pincode"
                    placeholder="6-digit pincode"
                    value={formData.pincode}
                    onChange={handlePincodeChange}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                  />
                </div>

                {/* Auto-filled Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <Input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    District
                  </label>
                  <Input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    required
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <Input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <Input
                    type="text"
                    name="country"
                    value={formData.country}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                {/* Contact Details */}
            

               
                {/* Optional Fields */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Website (Optional)
                  </label>
                  <Input
                    type="url"
                    name="websiteAddress"
                    placeholder="https://your-website.com"
                    value={formData.websiteAddress}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    GST Number (Optional)
                  </label>
                  <Input
                    type="text"
                    name="gstNumber"
                    placeholder="GST number"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Buttons */}
          <div className="flex justify-between space-x-4 mt-6">
            {step === 2 && (
              <Button
                type="button"
                onClick={() => setStep(1)}
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
            )}
            <Button
              type={step === 1 ? "button" : "submit"}
              onClick={step === 1 ? handleNextStep : undefined}
              isLoading={isLoading}
              className="w-full"
            >
              {step === 1 ? 'Next Step' : 'Complete Registration'}
            </Button>
          </div>
        </form>
      </div>
    </div>

    {/* Modal Overlay */}
    {(isTrialModalOpen || isTermsModalOpen) && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
    )}

    {/* Modals */}
    <TrialModal
      isOpen={isTrialModalOpen}
      onClose={() => setIsTrialModalOpen(false)}
      onConfirm={handleTrialConfirm}
    />

    <TermsModal
      isOpen={isTermsModalOpen}
      onClose={() => setIsTermsModalOpen(false)}
    />
  </div>
);
};