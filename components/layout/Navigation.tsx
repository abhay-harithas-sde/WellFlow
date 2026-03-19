'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStickyNav } from '@/hooks/useStickyNav';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export interface NavProps {
  links: { label: string; href: string }[];
  ctaLabel: string;
  ctaHref: string;
}

function smoothScrollTo(href: string) {
  if (!href.startsWith('#')) {
    window.location.href = href;
    return;
  }
  const target = document.querySelector(href);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}

export default function Navigation({ links, ctaLabel, ctaHref }: NavProps) {
  const isSticky = useStickyNav();
  const [menuOpen, setMenuOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Close on outside tap
  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen, closeMenu]);

  // Close on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, closeMenu]);

  function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    closeMenu();
    smoothScrollTo(href);
  }

  const navClasses = [
    'w-full z-50 bg-white border-b border-gray-100 transition-shadow duration-200',
    isSticky ? 'fixed top-0 shadow-md' : 'relative',
  ].join(' ');

  return (
    <header className={navClasses} role="banner">
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16"
        aria-label="Main navigation"
      >
        {/* Logo / brand */}
        <a
          href="/"
          className="text-xl font-bold text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 rounded"
          aria-label="WellFlow home"
        >
          WellFlow
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-6 list-none m-0 p-0" role="list">
          {links.map(({ label, href }) => (
            <li key={href}>
              <a
                href={href}
                onClick={(e) => handleLinkClick(e, href)}
                className="text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 rounded"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA + Language Switcher */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <Button
            variant="primary"
            onClick={() => smoothScrollTo(ctaHref)}
            aria-label={ctaLabel}
          >
            {ctaLabel}
          </Button>
        </div>

        {/* Hamburger button (mobile only) */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-brand-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? (
            /* X icon */
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            /* Hamburger icon */
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile full-screen overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
        />
      )}
      <div
        id="mobile-menu"
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={[
          'fixed inset-0 z-50 flex flex-col bg-white md:hidden transition-transform duration-300',
          menuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        ].join(' ')}
      >
        {/* Close button inside overlay */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100">
          <span className="text-xl font-bold text-brand-600">WellFlow</span>
          <button
            type="button"
            className="p-2 rounded-md text-gray-700 hover:text-brand-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            aria-label="Close menu"
            onClick={closeMenu}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col gap-2 px-4 py-6 list-none m-0" role="list">
          {links.map(({ label, href }) => (
            <li key={href}>
              <a
                href={href}
                onClick={(e) => handleLinkClick(e, href)}
                className="block py-3 text-lg font-medium text-gray-800 hover:text-brand-600 border-b border-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 rounded"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="px-4 mt-auto pb-8">
          <div className="mb-4">
            <LanguageSwitcher />
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              closeMenu();
              smoothScrollTo(ctaHref);
            }}
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </header>
  );
}
