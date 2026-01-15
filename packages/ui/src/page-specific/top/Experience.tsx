import Image from 'next/image'
import { Award, GraduationCap, Target, Users } from 'lucide-react'

const Experience = () => {
  const mentoring = [
    {
      title: '新人エンジニア直接指導',
      period: 'IBM子会社時代',
      achievement: '新人エンジニアの技術習得をサポート',
      details: [
        '1対1でのメンタリング担当',
        '新人の悩みや困りごとの相談対応',
        '技術的な質問への回答・指導',
        '担当外の新人からの質問対応',
      ],
    },
    {
      title: '新人エンジニアメンタリング統括',
      period: 'IBM子会社時代',
      achievement: 'メンター役の先輩エンジニアをサポート',
      details: [
        'メンター役の先輩エンジニアの取りまとめ',
        'メンターからの相談・愚痴聞き役',
        'メンタリングでの困りごと対応',
      ],
    },
    {
      title: 'エンジニア転職サポート',
      period: '2019年〜現在',
      achievement: '指導した方が正社員エンジニアとして転職成功されました',
      details: [
        '転職活動のメンタリング',
        '強み棚卸しと強化を支援',
        '経歴書作成支援',
        '技術的な質問への回答',
      ],
    },
    {
      title: 'エンジニア就職サポート',
      period: '2024年〜現在',
      achievement: '指導した方（未経験）が正社員エンジニアとして採用されました',
      details: ['ポートフォリオ作成のお手伝い', '転職活動のメンタリング'],
    },
    {
      title: 'オンライン家庭教師',
      period: '2020年〜2022年',
      achievement: 'manabo認定講師/個人として活動',
      details: ['中高生への英語・数学指導', 'オンラインでの個別指導', '学習方法のアドバイス'],
    },
  ]

  return (
    <section
      id="mentoring-experience"
      className="bg-gradient-to-br from-gray-50 to-blue-50 py-20 dark:from-gray-900 dark:to-gray-800"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100 md:text-4xl">
            Mentoring Experience
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            これまでの指導経験
          </p>
        </div>

        {/* Teaching Experience with Image */}
        <div className="mb-16">
          <h3 className="mb-8 flex items-center justify-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            <Users className="mr-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
            指導・メンタリング経験
          </h3>

          <div className="mb-12">
            <div className="mb-8 flex justify-center">
              <Image
                src="https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="One-on-one mentoring session"
                width={1200}
                height={400}
                className="h-[200px] w-full max-w-[1200px] rounded-xl object-cover shadow-lg sm:h-[300px] md:h-[400px]"
                style={{ width: 'auto', height: 'auto' }}
                priority={false}
              />
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {mentoring.map((experience) => (
                <div
                  key={experience.title}
                  className="rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:bg-gray-800"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {experience.title}
                    </h4>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {experience.period}
                    </span>
                  </div>

                  <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
                    <div className="flex items-center">
                      <Award className="mr-2 h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                        成果
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                      {experience.achievement}
                    </p>
                  </div>

                  <div>
                    <h5 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">
                      主な内容:
                    </h5>
                    <ul className="space-y-2">
                      {experience.details.map((detail, detailIndex) => (
                        <li
                          key={`${experience.title}-detail-${detailIndex}`}
                          className="flex items-start"
                        >
                          <div className="mr-3 mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center text-white md:p-12">
          <h3 className="mb-4 text-2xl font-bold md:text-3xl">一緒にお仕事しませんか？</h3>
          <p className="mb-8 text-xl text-blue-100">
            技術を通じて価値を創造し、共に成長していけたらと思います
          </p>
          <a
            href="#contact"
            className="inline-flex transform items-center rounded-full bg-white px-8 py-4 font-semibold text-blue-600 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-gray-100 dark:bg-gray-100 dark:text-blue-700 dark:hover:bg-gray-200"
          >
            お問い合わせ
          </a>
        </div>
      </div>
    </section>
  )
}

export default Experience
