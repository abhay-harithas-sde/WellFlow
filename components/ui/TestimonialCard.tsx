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
      className={`flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}
    >
      <StarRating rating={rating} />
      <blockquote className="flex-1">
        <p className="text-gray-700 leading-relaxed">&ldquo;{quote}&rdquo;</p>
      </blockquote>
      <figcaption>
        <cite className="not-italic text-sm font-semibold text-gray-900">{author}</cite>
      </figcaption>
    </figure>
  );
}

export default TestimonialCard;
