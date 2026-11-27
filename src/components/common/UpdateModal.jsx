import React from 'react';
import { ArrowUpCircle, X, ExternalLink } from 'lucide-react';
import { sfx } from '../../utils/audio';

export const UpdateModal = ({ updateInfo, onDismiss }) => {
  if (!updateInfo || !updateInfo.hasUpdate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xs bg-[var(--color-surface-card)] rounded-3xl border border-[var(--color-border)] p-4 shadow-2xl space-y-3.5 text-center animate-in zoom-in-95 duration-200">
        
        <div className="w-11 h-11 mx-auto rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 text-[var(--color-primary)] flex items-center justify-center shadow-xs">
          <ArrowUpCircle className="w-6 h-6 stroke-[2]" />
        </div>

        <div className="space-y-1">
          <span className="text-sm font-bold text-[var(--color-text-primary)] block">
            Update Available
          </span>
          <span className="text-xs text-[var(--color-text-secondary)] block">
            A new version ({updateInfo.latestVersion}) is out on GitHub.
          </span>
          {updateInfo.releaseNotes && (
            <p className="text-[11px] text-[var(--color-text-tertiary)] italic pt-1 truncate">
              "{updateInfo.releaseNotes}"
            </p>
          )}
        </div>

        <div className="pt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              sfx.tap();
              onDismiss();
            }}
            className="py-2 px-3 rounded-xl bg-[var(--color-surface-secondary)] hover:bg-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] tap-spring"
          >
            Later
          </button>

          <a
            href={updateInfo.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              sfx.confirm();
              onDismiss();
            }}
            className="py-2 px-3 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold tap-spring flex items-center justify-center space-x-1 shadow-xs"
          >
            <span>Update</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
};
