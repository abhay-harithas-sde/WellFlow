'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TestimonialCard } from '../ui/TestimonialCard';
import { StarRating } from '../ui/StarRating';

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  rating: number; // 1-5
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    quote:
      'WellFlow has completely transformed my morning routine. The voice-guided breathing exercises help me start every day with clarity and calm.',
    author: 'Sarah M.',
    rating: 5,
  },
  {
    id: '2',
    quote:
      'I love how seamlessly it syncs with my Apple Watch. Tracking my stress levels throughout the day has never been this effortless.',
    author: 'James T.',
    rating: 5,
  },
  {
    id: '3',
    quote:
      'The mindfulness sessions are genuinely helpful. After two weeks I noticed a real difference in how I handle work pressure.',
    author: 'Priya K.',
    rating: 4,
  },
  {
    id: '4',
    quote:
      'Being able to just speak my wellness intent and get an instant guided response feels like having a personal coach in my pocket.',
    author: 'Carlos R.',
    rating: 5,
  },
  {
    id: '5',
    quote:
      'The community feature keeps me accountable. Knowing others are on the same journey makes it so much easier to stay consistent.',
    author: 'Aisha N.',
    rating: 4,
  },
];

function computeAggregateRating(testimonials: Testimonial[]): number {
  if (testimonials.length === 0) return 0;
  const sum = testimonials.reduce((acc, t) => acc + t.rating, 0);
  return Math.round((sum / testimonials.length) * 10) / 10;
}

interface TestimonialsSectionProps {
  testimonials?: Testimonial[];
}

export default function TestimonialsSection({
  testimonials = DEFAULT_TESTIMONIALS,
}: TestimonialsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const total = testimonials.length;
  const aggregateRating = computeAggregateRating(testimonials);

  const goTo = useCallback(
    (index: number, dir: 'next' | 'prev') => {
      if (animating || total === 0) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setCurrentIndex(index);
        setAnimating(false);
      }, 300);
    },
    [animating, total]
  );

  const handleNext = useCallback(() => {
    const next = (currentIndex + 1) % total;
    goTo(next, 'next');
  }, [currentIndex, total, goTo]);

  const handlePrev = useCallback(() => {
    const prev = (currentIndex - 1 + total) % total;
    goTo(prev, 'prev');
  }, [currentIndex, total, goTo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    },
    [handleNext, handlePrev]
  );

  // Reset index if testimonials change
  useEffect(() => {
    setCurrentIndex(0);
  }, [testimonials]);

  const slideClass = animating
    ? direction === 'next'
      ? 'opacity-0 translate-x-4'
      : 'opacity-0 -translate-x-4'
    : 'opacity-100 translate-x-0';

  return (
    <section id="testimonials" className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            What Our Users Say
          </h2>

          {/* Aggregate rating — Req 6.5 */}
          {total > 0 && (
            <div
              className="flex flex-col items-center gap-2"
              aria-label={`Average rating: ${aggregateRating} out of 5 stars from ${total} reviews`}
            >
              <StarRating rating={aggregateRating} />
              <p className="text-gray-600 text-sm">
                <span className="font-semibold text-gray-900">{aggregateRating}</span> out of 5
                &nbsp;&mdash;&nbsp;
                <span className="font-semibold text-gray-900">{total}</span>{' '}
                {total === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          )}
        </div>

        {/* Empty state fallback */}
        {total === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No testimonials available yet. Check back soon!
          </p>
        ) : (
          <>
            {/* Carousel — Req 6.2, 6.3, 6.4 */}
            <div
              ref={carouselRef}
              role="region"
              aria-label="Testimonials carousel"
              aria-roledescription="carousel"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              className="relative focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-2xl"
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

              {/* Prev / Next controls — Req 6.3 */}
              {total > 1 && (
                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={handlePrev}
                    aria-label="Previous testimonial"
                    disabled={animating}
                    className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 transition-colors"
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
                    aria-label="Testimonial navigation"
                    className="flex gap-2"
                  >
                    {testimonials.map((t, i) => (
                      <button
                        key={t.id}
                        role="tab"
                        aria-selected={i === currentIndex}
                        aria-label={`Go to testimonial ${i + 1}`}
                        onClick={() => goTo(i, i > currentIndex ? 'next' : 'prev')}
                        className={`w-2.5 h-2.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          i === currentIndex
                            ? 'bg-blue-600'
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNext}
                    aria-label="Next testimonial"
                    disabled={animating}
                    className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 transition-colors"
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
                Testimonial {currentIndex + 1} of {total}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
