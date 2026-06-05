# Secret Scan Report

## 邊界

- 排除 .next/、node_modules/、本次 run folder、常見 binary/cache。
- .env.local / .env / ~/.gateway.env 只檢查 key 是否存在，不輸出值。
- raw secret shape 掃描只輸出 path / line / pattern label。
- OpenAI key pattern 已調整為更嚴格的 sk-proj 或長 random token，避免把 task-heartbeat 這類檔名誤判成 sk- key。

## Env presence

- .env.local	OPENAI_API_KEY	present
- .env.local	OPENAI_IMAGE_MODEL	present
- .env.local	NEXT_PUBLIC_SUPABASE_URL	present
- .env.local	NEXT_PUBLIC_SUPABASE_ANON_KEY	present
- /Users/sean/.gateway.env	OPENAI_API_KEY	present
- /Users/sean/.gateway.env	OPENAI_IMAGE_MODEL	present

## Raw secret shape locations

- .env.local	5	openai_key_shape
- src/lib/backend/observability/observability-service.test.ts	121	generic_bearer_assignment

## 結論

.env.local 中 provider key presence 符合預期，且沒有把值寫入報告。嚴格掃描後，tracked source 中未發現 OpenAI sk-proj key 形狀；剩餘 source 命中是 src/lib/backend/observability/observability-service.test.ts:121 的 bearer-shaped token assignment，需下一輪確認是否為 dummy fixture。
