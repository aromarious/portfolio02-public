import Image from 'next/image'
import { BookOpen, Cpu, Monitor, Network, Server, Users, Wrench } from 'lucide-react'

const Skills = () => {
  const skillCategories = [
    {
      icon: <Monitor className="h-8 w-8" />,
      title: 'フロントエンド',
      color: 'from-blue-500 to-cyan-500',
      skills: [
        'Next.js',
        'React',
        'TypeScript',
        'Tailwind CSS',
        'shadcn/ui',
        'radix/ui',
        'React Hook Form',
        'Zod/v4',
        'レスポンシブデザイン',
      ],
    },
    {
      icon: <Server className="h-8 w-8" />,
      title: 'バックエンド・インフラ',
      color: 'from-green-500 to-emerald-500',
      skills: [
        'tRPC',
        'PostgreSQL',
        'Drizzle ORM',
        'MySQL',
        'Prisma ORM',
        'Notion API',
        'Node.js',
        'Vercel',
      ],
    },
    {
      icon: <Network className="h-8 w-8" />,
      title: 'アーキテクチャ・設計',
      color: 'from-indigo-500 to-purple-500',
      skills: ['Clean Architecture', 'DDD', 'Design Patterns', 'DMZ設計・運用', 'セキュリティ'],
    },
    {
      icon: <Wrench className="h-8 w-8" />,
      title: '開発ツール',
      color: 'from-purple-500 to-pink-500',
      skills: ['GitHub Copilot', 'Claude Code', 'Git/GitHub', 'Docker', 'T3 Turbo'],
    },
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: '学習中・研究領域',
      color: 'from-amber-500 to-orange-500',
      skills: ['エージェントコーディング', '機械学習・深層学習の基礎知識'],
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'ヒューマンスキル',
      color: 'from-teal-500 to-cyan-500',
      skills: ['エンジニアメンタリング', 'チーム連携', '英語での開発協業'],
    },
    {
      icon: <Cpu className="h-8 w-8" />,
      title: '過去の技術経験',
      color: 'from-orange-500 to-red-500',
      skills: [
        'Java',
        'UNIX系システム運用',
        'Perl',
        'HTML/JavaScript',
        'Apache',
        'Sendmail',
        'ハードウェア設計',
      ],
    },
  ]

  return (
    <section
      id="skills"
      className="bg-gradient-to-br from-gray-50 to-blue-50 py-20 dark:from-gray-800 dark:to-blue-900"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            Technical Skills
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            これまでの経験と現在学習中の技術
          </p>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {skillCategories.map((category) => (
            <div
              key={category.title}
              className="rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:bg-gray-800"
            >
              <div className="mb-4 flex items-center">
                <div
                  className={`rounded-xl bg-gradient-to-r p-2 ${category.color} mr-3 text-white`}
                >
                  {category.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {category.title}
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill) => (
                  <span
                    key={skill}
                    className={`rounded-full border-2 bg-gradient-to-r ${category.color} p-[1px] shadow-sm`}
                  >
                    <span className="flex rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      {skill}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Learning Journey with Image */}
        <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
          <h3 className="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            学習の軌跡
          </h3>
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
            <div>
              <Image
                src="https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Books and learning materials"
                width={800}
                height={300}
                className="h-[300px] w-full rounded-xl object-cover shadow-md"
                style={{ width: 'auto', height: 'auto' }}
                priority={false}
              />
            </div>
            <div>
              <h4 className="mb-4 text-xl font-semibold text-blue-600 dark:text-blue-400">
                放送大学での学習 (2021年〜2024年)
              </h4>
              <ul className="mb-6 list-outside list-disc space-y-2 pl-6 text-gray-600 dark:text-gray-300">
                <li>統計学（'19）'24年度取得</li>
                <li>Rで学ぶ確率統計（'21）'21年度取得</li>
                <li>演習微分積分（'19）'21年度取得</li>
                <li>自然言語処理（'19）'22年度取得</li>
                <li>コンピュータビジョン（'22）'22年度取得</li>
                <li>英語で読む大統領演説（'20）'22年度取得</li>
                <li>フランス語I（'18）'23年度取得</li>
                <li>経営学入門（'24）'24年度取得</li>
              </ul>

              {/* <h4 className="mb-4 text-xl font-semibold text-purple-600 dark:text-purple-400">
                技術学習の流れ
              </h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="mr-3 h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-gray-600 dark:text-gray-300">技術動向追跡 (〜2022年)</span>
                </div>
                <div className="flex items-center">
                  <div className="mr-3 h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-gray-600 dark:text-gray-300">
                    モダン技術の習得 (2022年〜)
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="mr-3 h-3 w-3 rounded-full bg-purple-500" />
                  <span className="text-gray-600 dark:text-gray-300">
                    AIツールの活用 (2022年〜)
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="mr-3 h-3 w-3 rounded-full bg-orange-500" />
                  <span className="text-gray-600 dark:text-gray-300">
                    実践プロジェクト (2024年〜)
                  </span>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Skills
