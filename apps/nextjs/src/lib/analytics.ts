/**
 * Google Analytics utility functions for tracking events
 */

declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void
    dataLayer: unknown[]
  }
}

/**
 * Send a custom event to Google Analytics
 */
export function trackEvent(
  eventName: string,
  parameters?: {
    event_category?: string
    event_label?: string
    value?: number
    custom_parameters?: Record<string, unknown>
  }
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      event_category: parameters?.event_category,
      event_label: parameters?.event_label,
      value: parameters?.value,
      ...parameters?.custom_parameters,
    })
  }
}

/**
 * Track contact form submission
 */
export function trackContactFormSubmission(method: 'success' | 'error') {
  trackEvent('contact_form_submit', {
    event_category: 'engagement',
    event_label: method,
    custom_parameters: {
      contact_method: 'form',
      page_location: window.location.href,
    },
  })
}

/**
 * Track project view
 */
export function trackProjectView(projectName: string) {
  trackEvent('project_view', {
    event_category: 'content',
    event_label: projectName,
    custom_parameters: {
      content_type: 'project',
    },
  })
}

/**
 * Track skill section interaction
 */
export function trackSkillInteraction(skillName: string) {
  trackEvent('skill_view', {
    event_category: 'content',
    event_label: skillName,
    custom_parameters: {
      content_type: 'skill',
    },
  })
}

/**
 * Track page view manually (for SPA navigation)
 */
export function trackPageView(url: string, title?: string) {
  if (typeof window !== 'undefined' && window.gtag && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_location: url,
      page_title: title,
    })
  }
}
