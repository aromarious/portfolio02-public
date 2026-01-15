import type React from 'react'

import { cn } from '..'

// Basic Skeleton component
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

// Projects Section Skeleton
export function ProjectsSkeleton() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <Skeleton className="mx-auto mb-4 h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => i).map((id) => (
            <div key={`skeleton-project-${id}`} className="card bg-base-100 shadow-xl">
              <figure>
                <Skeleton className="h-48 w-full" />
              </figure>
              <div className="card-body">
                <Skeleton className="mb-2 h-6 w-3/4" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="mb-4 h-4 w-2/3" />
                <div className="card-actions justify-end">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Contact Form Skeleton
export function ContactSkeleton() {
  return (
    <section className="bg-base-200 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <Skeleton className="mx-auto mb-4 h-8 w-32" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
        <div className="mx-auto max-w-md">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="form-control">
                <Skeleton className="mb-2 h-4 w-16" />
                <Skeleton className="mb-4 h-12 w-full" />
              </div>
              <div className="form-control">
                <Skeleton className="mb-2 h-4 w-20" />
                <Skeleton className="mb-4 h-12 w-full" />
              </div>
              <div className="form-control">
                <Skeleton className="mb-2 h-4 w-16" />
                <Skeleton className="mb-4 h-32 w-full" />
              </div>
              <div className="form-control mt-6">
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Page-level Skeleton
export function PageSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Hero Section Skeleton */}
      <section className="hero bg-base-200 min-h-screen">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <Skeleton className="mx-auto mb-4 h-12 w-64" />
            <Skeleton className="mx-auto mb-8 h-6 w-80" />
            <Skeleton className="mx-auto h-12 w-32" />
          </div>
        </div>
      </section>

      {/* About Section Skeleton */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <Skeleton className="mx-auto mb-4 h-8 w-32" />
            <Skeleton className="mx-auto h-4 w-96" />
          </div>
          <div className="mx-auto max-w-3xl">
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-3/4" />
          </div>
        </div>
      </section>

      {/* Projects Skeleton */}
      <ProjectsSkeleton />

      {/* Contact Skeleton */}
      <ContactSkeleton />
    </div>
  )
}
