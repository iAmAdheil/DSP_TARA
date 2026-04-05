import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useStore } from '../store';
import type { Project } from '../types';

export function ProjectModal() {
  const { projectModalOpen, setProjectModalOpen, setActiveProjectId } = useStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [domain, setDomain] = useState<'automotive' | 'general_system_security'>('automotive');
  const [systemContext, setSystemContext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!projectModalOpen) return null;

  const handleClose = () => {
    setProjectModalOpen(false);
    setName('');
    setDomain('automotive');
    setSystemContext('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const project = await api<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name,
          domain,
          systemContext: systemContext || undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setActiveProjectId(project.id);
      handleClose();
      navigate('/ingestion');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create project. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-[14px] shadow-xl w-full max-w-[480px] mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-[24px] py-[16px] border-b border-border-subtle bg-surface-1">
          <h2 className="text-[16px] font-bold text-text-primary">New Project</h2>
          <button
            onClick={handleClose}
            className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <X className="w-[16px] h-[16px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-[24px] py-[20px] space-y-[16px]">
            <div className="space-y-[6px]">
              <label className="text-[12px] font-semibold text-text-secondary">Project Name <span className="text-[#b42318]">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vehicle Infotainment TARA"
                className="input-base w-full"
              />
            </div>

            <div className="space-y-[6px]">
              <label className="text-[12px] font-semibold text-text-secondary">Domain <span className="text-[#b42318]">*</span></label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as typeof domain)}
                className="input-base w-full"
              >
                <option value="automotive">Automotive</option>
                <option value="general_system_security">General System Security</option>
              </select>
            </div>

            <div className="space-y-[6px]">
              <label className="text-[12px] font-semibold text-text-secondary">System Context <span className="text-[12px] font-normal text-text-muted">(optional)</span></label>
              <textarea
                value={systemContext}
                onChange={(e) => setSystemContext(e.target.value)}
                placeholder="Brief description of the system being analyzed..."
                rows={3}
                className="input-base w-full resize-none"
              />
            </div>

            {error && (
              <p className="text-[13px] text-[#b42318] font-medium">{error}</p>
            )}
          </div>

          <div className="px-[24px] py-[16px] border-t border-border-subtle flex justify-end gap-[10px]">
            <button type="button" onClick={handleClose} className="btn-secondary btn-md">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn-primary btn-md disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-[14px] h-[14px] rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Creating...
                </div>
              ) : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
