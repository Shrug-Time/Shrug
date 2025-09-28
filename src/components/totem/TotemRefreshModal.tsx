import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface TotemRefreshModalProps {
  isOpen: boolean;
  onClose: () => void;
  totemName: string;
  currentCrispness: number;
  refreshesRemaining: number;
  onRestore: () => void;
  onRefresh: () => void;
}

export function TotemRefreshModal({
  isOpen, 
  onClose,
  totemName,
  currentCrispness,
  refreshesRemaining,
  onRestore,
  onRefresh
}: TotemRefreshModalProps) {
  
  // Debug logging
  console.log(`[DEBUG] TotemRefreshModal render:`, { 
    isOpen, 
    totemName, 
    currentCrispness, 
    refreshesRemaining 
  });

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
              <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <Dialog.Title className="text-lg font-medium text-gray-900">
                  Refresh your like?
                </Dialog.Title>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    You've liked <span className="font-medium">{totemName}</span> before. Would you like to:
                  </p>
                  
                  <div className="mt-6 space-y-4">
                    <button
                      onClick={onRestore}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <div className="font-medium">Restore previous like</div>
                      <div className="mt-1 text-sm text-gray-600">
                        Keep your original like time
                      </div>
                    </button>
                    
                    <button
                      onClick={onRefresh}
                      disabled={refreshesRemaining <= 0}
                      className="w-full rounded-lg bg-blue-600 px-4 py-3 text-left text-white hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      <div className="font-medium">Refresh your like</div>
                      <div className="mt-1 text-sm text-blue-100">
                        {refreshesRemaining > 0 
                          ? `Use 1 refresh (${refreshesRemaining} remaining today)`
                          : 'No refreshes remaining today'}
                      </div>
                    </button>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 