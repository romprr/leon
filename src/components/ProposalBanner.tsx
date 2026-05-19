'use client';

import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Bell } from 'lucide-react';

export function ProposalBanner() {
  const { proposedChanges, acceptProposal, declineProposal } = useStore();

  if (proposedChanges.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 right-4 z-[70]">
      <AnimatePresence>
        {proposedChanges.map((proposal) => (
          <motion.div
            key={proposal.id}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[20px] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.1)] border-2 border-[#39a62d]/20 mb-3"
          >
            <div className="flex gap-4">
              <div className="bg-[#39a62d]/10 p-3 rounded-full h-fit">
                <Bell className="text-[#39a62d]" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-black">Schedule Optimization</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {proposal.reason} Want to move <span className="font-bold text-[#39a62d]">{proposal.title}</span>?
                </p>
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => acceptProposal(proposal.id)}
                    className="flex-1 bg-[#39a62d] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    onClick={() => declineProposal(proposal.id)}
                    className="flex-1 bg-gray-100 text-gray-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform"
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
