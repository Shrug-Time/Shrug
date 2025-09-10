"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const INTRODUCTION_MODAL_STORAGE_KEY = 'shrug_introduction_modal_shown';

export function useIntroductionModal() {
  const { user } = useAuth();
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setShouldShowModal(false);
      setIsModalOpen(false);
      return;
    }

    // Check if this is the user's first time seeing the introduction
    const hasSeenIntroduction = localStorage.getItem(INTRODUCTION_MODAL_STORAGE_KEY);
    
    if (!hasSeenIntroduction && !shouldShowModal && !isModalOpen) {
      // Show modal after a very short delay to let the page render
      const timer = setTimeout(() => {
        setShouldShowModal(true);
        setIsModalOpen(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user?.uid, shouldShowModal, isModalOpen]); // Add state dependencies to prevent loops

  const closeModal = () => {
    setIsModalOpen(false);
    setShouldShowModal(false);
    
    // Mark introduction as seen in localStorage
    localStorage.setItem(INTRODUCTION_MODAL_STORAGE_KEY, 'true');
  };

  return {
    shouldShowModal,
    isModalOpen,
    closeModal
  };
}