# bni-speaker-tracker-proxy

> ⚠️ **DEPRECATED** — 本 service 已被 [bni-kpi](https://github.com/arthurkuo42-star/bni-kpi) 完全取代，預計廢棄。Repo 保留供歷史參考。

## 歷史角色

早期 BNI 富鼎分會主站的 JSONBin proxy。負責把 `X-Master-Key` 藏在後端，前端只能透過 `/api/data` 讀寫。

後來功能全部併入 bni-kpi（加上 LINE Bot + KPI + 服務鏈），本 service 即不再被任何前端呼叫。

## 當前狀態

- Railway 專案：`robust-surprise`
- 近 7 天 CPU 使用量：~0.0 vCPU（無流量）
- 前端 [bni-speaker-tracker](https://github.com/arthurkuo42-star/bni-speaker-tracker) 已指向 bni-kpi
- 環境變數仍存在，regenerate Master Key 時也要記得同步更新

## 廢棄步驟（未來執行）

1. 確認無任何服務在呼叫（可查 Railway Metrics）
2. Railway → Settings → Remove Service
3. GitHub → Settings → Archive repository

## 環境變數

見 [`.env.example`](.env.example)。

## 相關

- 取代者：[bni-kpi](https://github.com/arthurkuo42-star/bni-kpi)
- 整體架構：見本機 `富鼎網站/ARCHITECTURE.md`
