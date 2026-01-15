'use client'

import type React from 'react'
import { Github, Mail, MapPin, Twitter } from 'lucide-react'

import type { ContactMutation } from '../../components/ContactForm'
import ContactForm from '../../components/ContactForm'
import ZennIcon from '../../components/icons/ZennIcon'

interface ContactProps {
  contactMutation: ContactMutation
}

const Contact = ({ contactMutation }: ContactProps) => {
  const contactInfo = [
    {
      id: 'github',
      icon: <Github className="h-6 w-6" />,
      title: 'GitHub',
      value: 'github.com/aromarious',
      href: 'https://github.com/aromarious',
    },
    {
      id: 'zenn',
      icon: <ZennIcon className="h-6 w-6" />,
      title: 'Zenn',
      value: 'zenn.dev/aromarious',
      href: 'https://zenn.dev/aromarious',
    },
    {
      id: 'twitter',
      preferred: true,
      icon: <Twitter className="h-6 w-6" />,
      title: 'X (Twitter)',
      value: '@aromarious',
      href: 'https://twitter.com/aromarious',
    },
    {
      id: 'email',
      icon: <Mail className="h-6 w-6" />,
      title: 'Email',
      value: 'aromarious@gmail.com',
      href: 'mailto:aromarious@gmail.com',
    },
    {
      id: 'location',
      icon: <MapPin className="h-6 w-6" />,
      title: 'Location',
      value: '神奈川, 日本',
      href: null,
    },
  ]

  return (
    <section id="contact" data-testid="contact-section" className="bg-white py-20 dark:bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            Contact Me
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            お仕事のご相談、技術メンタリング、その他お気軽にお問い合わせください
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Contact Information */}
          <div>
            <h3 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Get in Touch
            </h3>

            <div className="mb-8 space-y-6">
              {contactInfo.map((info) => (
                <div key={info.id} className="flex items-center">
                  <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                    {info.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{info.title}</h4>
                    {info.href ? (
                      <a
                        href={info.href}
                        className="text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        target={info.href.startsWith('http') ? '_blank' : undefined}
                        rel={info.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      >
                        {info.value}
                      </a>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-300">{info.value}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20">
              <h4 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">
                対応可能な内容
              </h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• フルスタック開発プロジェクト</li>
                <li>• 技術メンタリング・コーチング</li>
                <li>• モダンWeb技術の導入支援</li>
                <li>• AIツール活用の技術指導</li>
                <li>• システム設計・アーキテクチャ相談</li>
                <li>• エンジニア転職支援</li>
              </ul>
            </div>
*/}
          </div>

          {/* Contact Form */}
          <div data-testid="contact-form-container">
            <ContactForm mutation={contactMutation} />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact
