'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { TestimonialCard } from '../ui/TestimonialCard';
import { StarRating } from '../ui/StarRating';

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  rating: number; // 1-5
}

function computeAggregateRating(testimonials: Testimonial[]): number {
  if (testimonials.length === 0) return 0;
  const sum = testimonials.reduce((acc, t) => acc + t.rating, 0);
  return Math.round((sum / testimonials.length) * 10) / 10;
}

const AUTO_ADVANCE_MS = 5000;
const PAUSE_AFTER_INTERACTION_MS = 3000;

export default function TestimonialsSection() {
  const t = useTranslations('testimonials');

  // Build testimonials from i18n keys
  const rawItems = t.raw('items') as Array<{
    id: string;
    quote: string;
    author: string;
    rating: number;
  }>;
  const testimonials: Testimonial[] = Array.isArray(rawItems) ? rawItems : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);
  // Tracks when the user last interacted so we can pause auto-advance
  const lastInteractionRef = useRef<number>(0);

  const total = testimonials.length;
  const aggregateRating = computeAggregateRating(testimonials);

  const goTo = useCallback(
    (index: number, dir: 'next' | 'prev', fromUser = false) => {
      if (animating || total === 0) return;
      if (fromUser) {
        lastInteractionRef.current = Date.now();
      }
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setCurrentIndex(index);
        setAnimating(false);
      }, 300);
    },
    [animating, total]
  );

  const handleNext = useCallback(
    (fromUser = false) => {
      const next = (currentIndex + 1) % total;
      goTo(next, 'next', fromUser);
    },
    [currentIndex, total, goTo]
  );

  const handlePrev = useCallback(() => {
    const prev = (currentIndex - 1 + total) % total;
    goTo(prev, 'prev', true);
  }, [currentIndex, total, goTo]);

  const handleDotClick = useCallback(
    (i: number) => {
      goTo(i, i > currentIndex ? 'next' : 'prev', true);
    },
    [currentIndex, goTo]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext(true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    },
    [handleNext, handlePrev]
  );

  // Auto-advance every 5000ms; pause 3000ms after user interaction
  useEffect(() => {
    if (total <= 1) return;
    const interval = setInterval(() => {
      const msSinceInteraction = Date.now() - lastInteractionRef.current;
      if (msSinceInteraction >= PAUSE_AFTER_INTERACTION_MS) {
        handleNext(false);
      }
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [total, handleNext]);

  // Reset index if testimonials change
  useEffect(() => {
    setCurrentIndex(0);
  }, [testimonials.length]);

  const slideClass = animating
    ? direction === 'next'
      ? 'opacity-0 translate-x-4'
      : 'opacity-0 -translate-x-4'
    : 'opacity-100 translate-x-0';

  return (
    <section id="testimonials" className="py-20 bg-gray-900 border-y border-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
            {t('title')}
          </h2>

          {/* Aggregate rating */}
          {total > 0 && (
            <div
              className="flex flex-col items-center gap-2"
              aria-label={t('averageRatingLabel', { rating: aggregateRating, total })}
            >
              <StarRating rating={aggregateRating} />
              <p className="text-gray-400 text-sm">
                {t('aggregate')}
              </p>
            </div>
          )}
        </div>

        {/* Empty state fallback */}
        {total === 0 ? (
          <p className="text-center text-gray-500 py-12">{t('noReviews')}</p>
        ) : (
          <>
            {/* Carousel */}
            <div
              ref={carouselRef}
              role="region"
              aria-label={t('carouselLabel')}
              aria-roledescription="carousel"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              className="relative focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-2xl"
            >
              {/* Slide */}
              <div
                aria-live="polite"
                aria-atomic="true"
                className={`transition-all duration-300 ease-in-out ${slideClass}`}
              >
                <TestimonialCard
                  key={testimonials[currentIndex].id}
                  id={testimonials[currentIndex].id}
                  quote={testimonials[currentIndex].quote}
                  author={testimonials[currentIndex].author}
                  rating={testimonials[currentIndex].rating}
                />
              </div>

              {/* Prev / Next controls */}
              {total > 1 && (
                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={handlePrev}
                    aria-label={t('prevLabel')}
                    disabled={animating}
                    className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 transition-colors"
                  >
                    <svg
                      aria-hidden="true"
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  {/* Dot indicators */}
                  <div
                    role="tablist"
                    aria-label={t('navLabel')}
                    className="flex gap-2"
                  >
                    {testimonials.map((testimonial, i) => (
                      <button
                        key={testimonial.id}
                        role="tab"
                        aria-selected={i === currentIndex}
                        aria-label={t('dotLabel', { n: i + 1 })}
                        onClick={() => handleDotClick(i)}
                        className={`w-2.5 h-2.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                          i === currentIndex
                            ? 'bg-green-500'
                            : 'bg-gray-600 hover:bg-gray-500'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => handleNext(true)}
                    aria-label={t('nextLabel')}
                    disabled={animating}
                    className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 transition-colors"
                  >
                    <svg
                      aria-hidden="true"
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Screen-reader position announcement */}
              <p className="sr-only" aria-live="polite">
                {t('positionAnnouncement', { current: currentIndex + 1, total })}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
