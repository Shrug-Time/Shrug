import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AnswerForm } from './AnswerForm';
import type { Post } from '@/types/models';

interface AnswerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedQuestion: Post;
  onAnswerSubmitted: () => void;
}

export function AnswerModal({ isOpen, onClose, selectedQuestion, onAnswerSubmitted }: AnswerModalProps) {
  console.log('AnswerModal state:', {
    isOpen,
    hasSelectedQuestion: !!selectedQuestion,
    questionId: selectedQuestion?.id,
    questionText: selectedQuestion?.question
  });

  if (!selectedQuestion) {
    return null;
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
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
              <Dialog.Panel className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
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
                  Answer Question
                </Dialog.Title>

                {/* Question preview */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{selectedQuestion.question}</p>
                </div>

                {/* Answer form */}
                <AnswerForm
                  selectedQuestion={selectedQuestion}
                  onAnswerSubmitted={() => {
                    onAnswerSubmitted();
                    onClose();
                  }}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 