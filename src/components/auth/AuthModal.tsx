import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'login' | 'signup';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');

  const handleSuccess = () => {
    onClose();
    setActiveTab('login'); // Reset to login tab after successful action
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Title */}
                <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                  {activeTab === 'login' ? 'Log in to your account' : 'Create a new account'}
                </Dialog.Title>

                {/* Tabs */}
                <div className="flex space-x-4 mb-6">
                  <button
                    className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                      activeTab === 'login'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('login')}
                  >
                    Login
                  </button>
                  <button
                    className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                      activeTab === 'signup'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('signup')}
                  >
                    Sign Up
                  </button>
                </div>

                {/* Forms */}
                <div className="mt-4">
                  {activeTab === 'login' ? (
                    <>
                      <LoginForm onSuccess={handleSuccess} />
                      <p className="mt-4 text-sm text-center text-gray-600">
                        Don't have an account?{' '}
                        <button
                          onClick={() => setActiveTab('signup')}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Sign up
                        </button>
                      </p>
                    </>
                  ) : (
                    <>
                      <SignupForm onSuccess={handleSuccess} />
                      <p className="mt-4 text-sm text-center text-gray-600">
                        Already have an account?{' '}
                        <button
                          onClick={() => setActiveTab('login')}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Log in
                        </button>
                      </p>
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 