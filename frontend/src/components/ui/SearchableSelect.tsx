'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
  disabled?: boolean;
  badge?: string;
}

export interface SearchableSelectProps {
  options: SelectOption[];
  value: string | number | '';
  onChange: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Enterprise searchable select dropdown with instant search filter and clean light theme.
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '-- Pilih Opsi --',
  searchPlaceholder = 'Ketik untuk mencari...',
  label,
  error,
  required = false,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2 text-left text-sm rounded-lg border transition-all flex items-center justify-between cursor-pointer bg-white ${
          error
            ? 'border-rose-300 focus:ring-2 focus:ring-rose-500'
            : isOpen
            ? 'border-slate-900 ring-2 ring-slate-900/10'
            : 'border-slate-300 hover:border-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
      >
        <span className={`block truncate ${selectedOption ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <span>{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="text-xs text-slate-500 font-normal">
                  ({selectedOption.subLabel})
                </span>
              )}
              {selectedOption.badge && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedOption.badge}
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>

        <svg
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-slate-900' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden py-1 max-h-72 flex flex-col animate-in fade-in-50 duration-100">
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <svg
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-4 text-center text-xs text-slate-400">
                Pilihan tidak ditemukan.
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = String(option.value) === String(value);

                return (
                  <div
                    key={String(option.value)}
                    onClick={() => handleSelect(option)}
                    className={`px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      option.disabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-50/50'
                        : isSelected
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{option.label}</span>
                        {option.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-700 border border-slate-200 font-normal">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      {option.subLabel && (
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5 truncate">
                          {option.subLabel}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-slate-900 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
};

