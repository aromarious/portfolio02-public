'use client'

import React, { useCallback, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Github, Mail, Menu, X } from 'lucide-react'

import { useAppStore } from '../stores/app-store'
import ZennIcon from './icons/ZennIcon'

const Header = () => {
  const {
    isMenuOpen,
    isScrolled,
    isHeroPassed,
    toggleMenu,
    closeMenu,
    setIsScrolled,
    setIsHeroPassed,
  } = useAppStore()

  const pathname = usePathname()
  const isHome = pathname === '/'

  // Link adjustment helper
  const getHref = (href: string) => {
    if (href.startsWith('#') && !isHome) {
      return `/${href}`
    }
    return href
  }

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY
    setIsScrolled(scrollY > 50)
    setIsHeroPassed(scrollY > 100)
  }, [setIsScrolled, setIsHeroPassed])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const navItems = [
    { href: '#about', label: 'About' },
    {
      href: '#projects',
      label: 'Projects',
      children: [
        { label: 'All Projects', href: '/#projects' },
        { label: 'Portfolio Site', href: '/project-portfolio' },
        { label: 'Mimicord', href: '/project-mimicord' },
      ],
    },
    { href: '#skills', label: 'Skills' },
    { href: '#experience', label: 'Experience' },
    { href: '#contact', label: 'Contact' },
  ]

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/90 shadow-lg backdrop-blur-md dark:bg-gray-900/90' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link
            href="/"
            className={`bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-600 bg-clip-text text-2xl font-bold text-transparent transition-all duration-500 ${
              isHeroPassed || !isHome ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
            }`}
          >
            Aromarious Portfolio
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center space-x-8 md:flex">
            <Link
              href="/"
              className="font-medium text-gray-700 transition-colors duration-200 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            >
              Home
            </Link>

            {navItems.map((item) => {
              if (item.children) {
                return (
                  <div key={item.label} className="group relative">
                    <Link
                      href={getHref(item.href)}
                      className="flex items-center font-medium text-gray-700 transition-colors duration-200 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                    >
                      {item.label}
                    </Link>
                    {/* Dropdown */}
                    <div className="absolute left-1/2 mt-0 hidden w-48 -translate-x-1/2 pt-2 opacity-0 transition-all duration-200 group-hover:block group-hover:opacity-100">
                      <div className="overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={getHref(item.href)}
                  className="font-medium text-gray-700 transition-colors duration-200 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Social Links */}
          <div className="hidden items-center space-x-4 md:flex">
            {/* TODO */}
            <a
              href="https://github.com/aromarious"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            >
              <Github size={20} />
            </a>
            <a
              href="https://zenn.dev/aromarious"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            >
              <ZennIcon className="h-5 w-5" />
            </a>
            {/* TODO */}
            <a
              href="mailto:contact@example.com"
              className="text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            >
              <Mail size={20} />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="text-gray-700 dark:text-gray-300 md:hidden"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="mt-2 rounded-lg bg-white/95 py-4 shadow-lg backdrop-blur-md dark:bg-gray-900/95 md:hidden">
            <Link
              href="/"
              className="block px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-400"
              onClick={closeMenu}
            >
              Home
            </Link>

            {navItems.map((item) => (
              <React.Fragment key={item.label}>
                <Link
                  href={getHref(item.href)}
                  className="block px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
                {/* Mobile Submenu */}
                {item.children && (
                  <div className="pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block border-l-2 border-gray-200 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400 dark:hover:text-blue-400"
                        onClick={closeMenu}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
            <div className="mt-4 flex justify-center space-x-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              <a
                href="https://github.com/aromarious"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              >
                <Github size={20} />
              </a>
              <a
                href="https://zenn.dev/aromarious"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              >
                <ZennIcon className="h-5 w-5" />
              </a>
              <a
                href="mailto:contact@example.com"
                className="text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export { Header }
export default Header
