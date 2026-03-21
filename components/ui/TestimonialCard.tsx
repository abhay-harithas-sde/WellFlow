import React from 'react';
import { StarRating } from './StarRating';

export interface TestimonialCardProps {
  id: string;
  quote: string;
  author: string;
  rating: number;
  className?: string;
}

export function TestimonialCard({ id, quote, author, rating, className = '' }: TestimonialCardProps) {
  return (
    <figure
      data-testid={`testimonial-card-${id}`}
      className={`flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm ${className}`}
    >
      <StarRating rating={rating} />
      <blockquote className="flex-1">
        <p className="text-gray-300 leading-relaxed">&ldquo;{quote}&rdquo;</p>
      </blockquote>
      <figcaption>
        <cite className="not-italic text-sm font-semibold text-white">{author}</cite>
      </figcaption>
    </figure>
  );
}

export default TestimonialCard;
