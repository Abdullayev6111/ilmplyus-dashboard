# KO'CHIRISH VAZIFASI — 3 modulni yangi backend kontraktiga moslashtirish

> **Qanday ishlatish (o'sha papkadagi Claude uchun):**
> Shu papkadagi `modules-only.patch` faylida barcha o'zgarishlarning **aniq diff'i** bor
> (boshqa, yangiroq nusxadan olingan). Bu repo divergent bo'lgani uchun patchni `git apply`
> qilma — uni **o'qib**, quyidagi spetsifikatsiya asosida shu repo strukturasiga **moslab** yoz.
> Fayl bo'lmasa — yarat; boshqacha bo'lsa — moslashtir. Har o'zgarishdan keyin `npx tsc -b` toza bo'lsin.

Stek: React + TypeScript + Vite + @tanstack/react-query + react-i18next + Mantine.
`API` (axios) baseURL'ida `/api` ALLAQACHON bor — endpointlarni `/api`siz yoz.
i18n: `src/messages/{uz,ru,en}.json` — har bir yangi kalitni UCHALASIGA qo'sh.

════════════════════════════════════════════════════════════════════
## MODUL 1 — DAVOMAT (students-attendance) dars oqimi
Fayllar: `src/pages/students-attendance/index.tsx` + `studentsAttendance.css`,
`src/types/studentsAttendance.types.ts`, `src/types/lesson.types.ts`,
`src/pages/lessons/index.tsx`, `src/utils/apiError.ts`, `src/components/ConfirmModal/`.

### Backend qoidasi (MAJBURIY)
- `POST /student_attendance` FAQAT o'sha guruh+sana uchun AKTIV (`ongoing`) dars bo'lsa ishlaydi.
  Aks holda 422: "Davomat faqat dars boshlangan (ongoing) paytda belgilanadi. Avval darsni boshlang."
- Dars holati: lessons javobida `status` (`scheduled → ongoing → completed`), `started_at`, `ended_at`.
- Boshlash: `POST /lessons/{id}/start` — faqat dars kunida (kun emas → 422, allaqachon → 409).
- Tugatish: `POST /lessons/{id}/end`.
- Davomat 4 status: `present, absent, late, reason` (eski `excused` YO'Q → `reason` yubor).
- Pul yechish: `present`, `late`, `absent` da yechiladi; faqat `reason` da yechilmaydi.
- O'quvchi statusi (is_active o'rniga): `active, frozen, dropped, graduated` (eski `Aktiv/Noaktiv` ham bo'lishi mumkin).

### ⚠️ Timezone — ENG MUHIM
Backend dars `date` ni **Toshkent yarim tunini UTC'da** saqlaydi:
`"2026-07-17T19:00:00.000000Z"` = 2026-07-18 dars (UTC+5).
Sanani xom UTC prefiksi bilan solishtirma — `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' })`
bilan "YYYY-MM-DD" ga keltirib solishtir. "Bugun" (`todayStr`) ham shu helper bilan hisoblansin.
Helper `toTashkentDate(value)` va `isSameDay(raw, today)` yoz. "DD.MM.YYYY" formatini ham qo'lla.

### Lesson maydon nomlari
Lessons `_uz` qo'shimchali maydonlar: `topic_uz`, `homework_title_uz`, `homework_description_uz` (+`_ru`/`_en`).
`POST /lessons` (yaratish) da `homework_title_uz` MAJBURIY. `topic` maydoni `topic` sifatida qabul qilinadi.

### Implement qilinadigan UI/oqim
1. Bugungi dars: `GET /lessons?group_id=X&per_page=200` → `todayLesson = find(group_id mos && isSameDay(date, bugun))`.
   `lessonStatus = todayLesson?.status`; `lessonActive = lessonStatus === 'ongoing'`;
   `todayIsLessonDay` — bugungi hafta kuni group.days ichidami.
2. **Start modal (markazda, avtomatik)**: sahifaga kirib/guruh yuklangач, agar
   `startNeeded = (todayLesson || todayIsLessonDay) && status !== 'ongoing' && status !== 'completed'`
   bo'lsa — modal BIR MARTA avtomatik ochiladi (React render-faza patterni; `useEffect`+setState EMAS —
   eslint `set-state-in-effect` beradi). Overlay bosilganda YOPILMAYDI (faqat Boshlash bilan).
   Modalда dars vaqti (guruh `start_time`/`end_time`, mas. "🕒 15:00-16:30") ko'rsatiladi.
   - `todayLesson` bor → "Boshlash" → `POST /lessons/{id}/start`.
   - `todayLesson` yo'q → "Dars mavzusi" maydoni chiqadi; Boshlash → yaratamiz+boshlaymiz:
     `POST /lessons` (FormData: `group_id, date=bugun(Toshkent), topic, homework_title_uz = topic`) →
     javobdan `id` olib `POST /lessons/{id}/start`.
3. **Footer tugma** holatga qarab: dars kuni emas → "Bugun dars yo'q" (disabled); startNeeded → "Darsni boshlash"
   (+ vaqt) modalni ochadi; `ongoing` → "Darsni tamomlash" (+ vaqt); `completed` → "Dars yakunlangan" (disabled).
4. **Davomat kataklari** faqat `lessonActive` bo'lganda bosiladi (aks holda `cell-locked`). Katak → davomat
   popover (status + baho + reason izohi). Popover CSS klasslari UNIKAL bo'lsin (`sa-` prefiks) — boshqa
   `attendance.css` bilan to'qnashmasin; z-index 10000 (sidebar/header 1000 ustidan).
5. **Tugatish**: "Darsni tamomlash" → ConfirmModal (danger) → `POST /lessons/{id}/end` →
   `navigate('/lessons?groupId=&date=&openHomework=1&lessonId=')`. `/lessons` sahifasi paramlarni o'qib,
   guruh+sanani tanlab, "Dars qo'shish" modalini AVTOMATIK ochadi (mavjud darsdan to'ldirib), o'qituvchi
   uy vazifasini biriktiradi. Auto-open `isLoading` tugagach, bir marta (ref), keyin paramlar tozalanadi.
6. **Davomat saqlash** (create/update/delete): success'da `['student_attendance']`, `['students', groupId]`,
   `['group', groupId]` invalidate (balans yangilansin). Xatoда `getApiErrorMessage` + notification.
7. **O'quvchi status badge** 4 holatni qo'llasin (active/frozen/dropped/graduated + eski) — rang + tarjima.

### Yordamchilar
- `src/utils/apiError.ts`: `getApiErrorMessage(error, fallback)` — Laravel 422 `{message, errors:{field:[...]}}` dan birinchi xabar.
- `src/components/ConfirmModal/` — `window.confirm` O'RNIGA umumiy modal (props: open, title, message, confirmLabel,
  cancelLabel, tone: danger|success|primary, busy, reasonRequired, reasonLabel, onConfirm(reason?), onCancel).

════════════════════════════════════════════════════════════════════
## MODUL 2 — OYLIK TAQSIMLASH (payroll-distribution)
Fayllar: `src/pages/payroll-distribution/index.tsx` + `payrollDistribution.css`.

### Endpointlar
- `GET /payroll/distributions/form/{employee}` → `scheme` ("percent"|"fixed"), `kind`, `period`, `period_locked`,
  `employee`, `limits{total_cashless, privileged_amount}`, `adjustment_hours`; percent'da `balance`+`agreed_percent`,
  fixed'da `contract_salary`. **`values` va `oklad`/`contract_oklad` YO'Q — tayanma.**
- `POST /payroll/distributions/{employee}` — saqlash.

### POST payload — QAT'IY (jonli tasdiqlangan)
- Izoh **`note`** (`comment` JIM tashlanadi — 422 ham bermaydi).
- **percent**: `period_year, period_month, kind (advance|salary), note, total_cashless, payout_cashless,
  privileged_amount, income_tax_payer, cash_tax`.
- **fixed**: `kind` YUBORILMAYDI (backend `combined`): `period_year, period_month, note, total_cashless,
  advance_cashless, advance_cash, privileged_amount, income_tax_payer, cash_tax`.
- **Avtomatik maydonlarni YUBORMA** (backend hisoblaydi): percent `payout_cash = balance − total_cashless`;
  fixed `payout_cashless = total_cashless − advance_cashless`, `total_cash = contract_salary − total_cashless`,
  `payout_cash = total_cash − advance_cash`.
- Ma'lum bug: bir xil employee+period+kind takroriy POST → 422 emas, **500**. UI chiroyli ko'rsatsin.

════════════════════════════════════════════════════════════════════
## MODUL 3 — ISH HAQI TUZATISHLAR (payroll-adjustments)
Fayllar: `src/pages/payroll-adjustments/index.tsx`, `AdjustmentForm.tsx` + `payrollAdjustments.css`.

### `/payroll/adjustments` — QAT'IY (jonli tasdiqlangan)
- **type enum**: `extra_worked | not_worked | substituted` (eski `extra/absent/substitute` NOTO'G'RI).
- **POST/PUT payload**: `employee_id, type, date, hours, note, substituted_for_employee_id`.
  Izoh → **`note`**. O'rniga ishlangan: so'rovda `substituted_for_employee_id`, javobda `substituted_for = {id, full_name}`.
- **PATCH `/{id}/reject`** — **`reject_reason` MAJBURIY** (bo'lmasa 422).
- **PATCH `/{id}/approve`** — body kerak emas.
- **Javob**: `id, employee_id, employee, type, date, hours, substituted_for, note, status (new|approved|rejected),
  source, device_name, created_by{id,full_name}, created_at, reviewed_by, reviewed_at, reject_reason,
  applied_hours, applied_at`. Tasdiqlagan — **`reviewed_by/reviewed_at`** (`approved_by` EMAS).
- `late_hours`/`early_leave_hours` API'da YO'Q (doim 0).
- Ro'yxat paginator: `{data, links, meta{total, per_page:30, last_page, current_page}}`.
- approved/rejected yozuvni DELETE/PUT qilib bo'lmaydi (422) — UI'da tugmalar bloklanadi.

════════════════════════════════════════════════════════════════════
## UMUMIY
- `window.confirm`/`alert` ISHLATMA — hamma tasdiqlash `ConfirmModal` orqali.
- Yangi matnlar `src/messages/{uz,ru,en}.json` uchalasiga.
- Xatolar `getApiErrorMessage` + Mantine `notifications.show({color:'red'})`.
- Yangi sahifalar uchun `src/App.tsx` da route qo'shilishi kerak (payroll-distribution, payroll-adjustments).
- Yakunда `npx tsc -b` va `npx eslint <o'zgargan fayllar>` TOZA.

## QABUL MEZONLARI
1. Ongoing dars to'g'ri aniqlanadi (Toshkent TZ), footer "Darsni tamomlash" + vaqt, mavzu so'ramaydi.
2. Dars boshlanmaguncha davomat bosilmaydi; boshlangач kataklar faollashadi.
3. Darsni tugatish → /lessons da vazifa biriktirish modali avtomatik ochiladi.
4. Distribution/adjustments POST'lari AYNAN shu maydon nomlari bilan (`note`, `_uz`, type enum, reviewed_by).
5. Reject'da `reject_reason` majburiy; approved/rejected yozuv o'zgarmaydi.

> **Aniq kod uchun `modules-only.patch` ni manba sifatida o'qi** — u yangi nusxadagi to'liq diffni saqlaydi.
