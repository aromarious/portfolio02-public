import Image from 'next/image'
import { Code, Heart } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="bg-gray-900 py-12 text-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-8">
            <h3 className="mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
              Aromarious Portfolio
            </h3>
            <p className="mx-auto max-w-2xl text-gray-400 dark:text-gray-300">
              一緒に素敵なプロダクトを作りませんか？お気軽にお声がけください！
            </p>
          </div>

          <div className="border-t border-gray-800 pt-8 dark:border-gray-700">
            <div className="flex flex-col items-center justify-between md:flex-row">
              <div className="mb-4 flex items-center text-gray-400 dark:text-gray-300 md:mb-0">
                <span>Made with</span>
                <Heart className="mx-2 h-4 w-4 text-red-500" />
                <Code className="mx-2 h-4 w-4 text-blue-400" />
                <span>and</span>
                <Image
                  src="/favicon/favicon.svg"
                  alt="Aromarious icon"
                  width={16}
                  height={16}
                  className="mx-2 rounded-sm"
                />
                <span>by a passionate engineer</span>
              </div>

              <div className="text-sm text-gray-400 dark:text-gray-300">
                © 2025-2026 Aromarious Portfolio. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
