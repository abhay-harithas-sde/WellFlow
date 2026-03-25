'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useStickyNav } from '@/hooks/useStickyNav';

const NAV_LINKS = [
  { key: 'features' as const, href: '#features' },
  { key: 'howItWorks' as const, href: '#how-it-works' },
  { key: 'integrations' as const, href: '#integrations' },
  { key: 'pricing' as const, href: '#pricing' },
];

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

export default function Navigation() {
  const t = useTranslations('nav');
  const isSticky = useStickyNav(80);
  const [menuOpen, setMenuOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) closeMenu();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { closeMenu(); hamburgerRef.current?.focus(); return; }
      if (e.key === 'Tab' && overlayRef.current) {
        const focusable = getFocusableElements(overlayRef.current);
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
        else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (menuOpen && overlayRef.current) {
      const focusable = getFocusableElements(overlayRef.current);
      focusable[0]?.focus();
    }
  }, [menuOpen]);

  function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    closeMenu();
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = href;
    }
  }

  return (
    <header
      className={[
        'w-full z-50 transition-all duration-200',
        isSticky
          ? 'fixed top-0 shadow-lg bg-gray-950/95 backdrop-blur-sm border-b border-gray-800'
          : 'relative bg-gray-950 border-b border-gray-800/50',
      ].join(' ')}
      role="banner"
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <a href="/en" className="text-xl font-bold text-white hover:text-green-400 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500" aria-label="WellFlow home">
          Well<span className="text-green-400">Flow</span>
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-6 list-none m-0 p-0" role="list">
          {NAV_LINKS.map(({ key, href }) => (
            <li key={href}>
              <a
                href={href}
                onClick={(e) => handleLinkClick(e, href)}
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
              >
                {t(key)}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/raw"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            {t('cta')}
          </a>
        </div>

        {/* Hamburger (mobile) */}
        <button
          ref={hamburgerRef}
          type="button"
          className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((p) => !p)}
        >
          {menuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile backdrop */}
      {menuOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" aria-hidden="true" />}

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={[
          'fixed inset-0 z-50 flex flex-col bg-gray-950 md:hidden transition-transform duration-300',
          menuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-800">
          <span className="text-xl font-bold text-white">Well<span className="text-green-400">Flow</span></span>
          <button type="button" className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500" aria-label="Close menu" onClick={closeMenu}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col gap-1 px-4 py-6 list-none m-0" role="list">
          {NAV_LINKS.map(({ key, href }) => (
            <li key={href}>
              <a href={href} onClick={(e) => handleLinkClick(e, href)} className="block py-3 text-lg font-medium text-gray-300 hover:text-white border-b border-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded">
                {t(key)}
              </a>
            </li>
          ))}
        </ul>
        <div className="px-4 mt-auto pb-8">
          <a href="/raw" className="flex items-center justify-center w-full px-4 py-3 rounded-lg text-base font-semibold bg-green-600 text-white hover:bg-green-500 transition-colors" onClick={closeMenu}>
            {t('cta')}
          </a>
        </div>
      </div>
    </header>
  );
}
