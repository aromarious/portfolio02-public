-- システム構築要素マトリックス UPDATE文
-- csv_system_construction_matrixの詳細データでsystem_construction_matrixを更新

-- csv_system_construction_matrixから詳細データを取得して
-- system_construction_matrixの該当項目を更新（necessity, completion, remarks, consideration）

UPDATE system_construction_matrix 
SET 
    necessity = COALESCE(csv.necessity, system_construction_matrix.necessity),
    completion = COALESCE(csv.completion, system_construction_matrix.completion),
    remarks = COALESCE(csv.remarks, system_construction_matrix.remarks),
    consideration = COALESCE(csv.consideration, system_construction_matrix.consideration)
FROM csv_system_construction_matrix csv
WHERE system_construction_matrix.item = csv.item;

-- 更新結果確認用クエリ
SELECT 
    category,
    item,
    necessity,
    completion,
    remarks,
    CASE 
        WHEN LENGTH(consideration) > 50 
        THEN LEFT(consideration, 50) || '...' 
        ELSE consideration 
    END as consideration_preview
FROM system_construction_matrix 
WHERE consideration IS NOT NULL 
  AND consideration != ''
ORDER BY id;