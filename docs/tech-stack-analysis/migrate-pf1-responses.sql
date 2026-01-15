-- pf1システムの回答データをsystem_responsesテーブルに移行
INSERT INTO system_responses (
    system_id,
    question_id,
    is_implemented,
    implementation_status,
    implementation_details,
    priority,
    response_notes
)
SELECT 
    'pf1' as system_id,
    question_id,
    CASE 
        WHEN is_needed = false THEN false
        WHEN is_implemented = 'Done' THEN true
        ELSE false
    END as is_implemented,
    CASE 
        WHEN is_needed = false THEN 'not_applicable'
        WHEN is_implemented = 'Done' THEN 'implemented'
        WHEN is_implemented = 'Partial' THEN 'partial'
        WHEN is_implemented = 'Not started' THEN 'not_started'
        ELSE 'pending'
    END as implementation_status,
    consideration as implementation_details,
    CASE 
        WHEN category_id BETWEEN 1 AND 20 THEN 'high'
        WHEN category_id BETWEEN 21 AND 100 THEN 'medium'
        ELSE 'low'
    END as priority,
    remarks as response_notes
FROM question_master;

-- 移行後のデータ確認
SELECT 
    COUNT(*) as total_responses,
    COUNT(CASE WHEN is_implemented = true THEN 1 END) as implemented_count,
    COUNT(CASE WHEN implementation_status = 'not_applicable' THEN 1 END) as not_applicable_count,
    COUNT(CASE WHEN implementation_status = 'partial' THEN 1 END) as partial_count
FROM system_responses
WHERE system_id = 'pf1';

-- システム別の実装率を確認
SELECT 
    si.system_id,
    si.system_name,
    COUNT(sr.response_id) as total_questions,
    COUNT(CASE WHEN sr.is_implemented = true THEN 1 END) as implemented_count,
    ROUND(COUNT(CASE WHEN sr.is_implemented = true THEN 1 END) * 100.0 / COUNT(sr.response_id), 2) as implementation_rate
FROM system_info si
LEFT JOIN system_responses sr ON si.system_id = sr.system_id
GROUP BY si.system_id, si.system_name;